import { defineStore } from 'pinia'
import { canApplySpaceOrderEvent, mapSpaceOrderStatus } from '@/domain/trustedSpacePolicy'
import { trustedSpaceAdapter, type TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type { ConnectorEvent, PipelineDecision } from '@/types/configGovernance'
import type { UserContext } from '@/types/domain'
import type {
  SpaceOrderEvent,
  SpaceOrderMirror,
  SpaceOrderReconciliationAudit,
  SpacePurchaseIntent
} from '@/types/trustedSpace'
import { genId } from '@/utils/id'
import { useIntegrationStore } from './integration'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'
import { useUserStore } from './user'

export const LONG_UNLINKED_SPACE_ORDER_DELAY_MS = 15 * 60 * 1000

export function isLongUnlinkedSpacePurchase(intent: SpacePurchaseIntent, now: Date): boolean {
  if (intent.status !== 'returned_pending_sync') return false
  const returnedAt = new Date(intent.returnedAt ?? intent.createdAt).getTime()
  return Number.isFinite(returnedAt) && now.getTime() - returnedAt >= LONG_UNLINKED_SPACE_ORDER_DELAY_MS
}

export const useSpaceOrderStore = defineStore('space-orders', {
  state: () => ({
    mirrors: [] as SpaceOrderMirror[],
    reconciliationAudits: [] as SpaceOrderReconciliationAudit[],
    reconciliationGeneration: 0
  }),
  getters: {
    byId(state) {
      return (spaceOrderId: string) => state.mirrors.find((mirror) => mirror.spaceOrderId === spaceOrderId)
    },
    byIntentId(state) {
      return (purchaseIntentId: string) => state.mirrors.find((mirror) => mirror.purchaseIntentId === purchaseIntentId)
    },
    visibleFor(state) {
      return (user: Pick<UserContext, 'currentEnterpriseId' | 'currentMemberId' | 'enterpriseAuthStatus' | 'role'>): SpaceOrderMirror[] => {
        const userStore = useUserStore()
        const current = userStore.context
        if (
          current.enterpriseAuthStatus !== 'authenticated'
          || current.enterpriseAuthStatus !== user.enterpriseAuthStatus
          || !current.currentEnterpriseId
          || !current.currentMemberId
          || current.currentEnterpriseId !== user.currentEnterpriseId
          || current.currentMemberId !== user.currentMemberId
        ) return []

        const member = userStore.enterpriseMemberFor(current.currentEnterpriseId, current.currentMemberId)
        if (!member) return []

        const enterpriseOrders = state.mirrors.filter((mirror) => mirror.appEnterpriseId === current.currentEnterpriseId)
        return member.role === 'admin'
          ? enterpriseOrders
          : enterpriseOrders.filter((mirror) => mirror.operatorMemberId === current.currentMemberId)
      }
    }
  },
  actions: {
    processSpaceOrderEvent(event: SpaceOrderEvent): PipelineDecision {
      const integration = useIntegrationStore()
      const current = this.byId(event.spaceOrderId)
      if (
        !this.hasValidAssociation(event, current) ||
        (event.signatureValid && current && event.eventVersion > current.eventVersion && !canApplySpaceOrderEvent(current, event, {
          spaceOrderId: event.spaceOrderId,
          purchaseIntentId: current.purchaseIntentId,
          spaceEnterpriseId: current.spaceEnterpriseId,
          spaceProductNo: current.spaceProductNo
        }))
      ) return this.deadLetterRejectedEvent(event, integration)

      const result = integration.processEvent(
        {
          connector: 'trusted_space',
          subjectId: event.spaceOrderId,
          eventType: 'order_update',
          eventVersion: event.eventVersion,
          idempotencyKey: event.idempotencyKey,
          signatureValid: event.signatureValid,
          purchaseIntentId: event.purchaseIntentId,
          spaceEnterpriseId: event.spaceEnterpriseId,
          spaceProductNo: event.spaceProductNo,
        },
        () => this.upsertFromEvent(event)
      )
      if (result.decision !== 'process') return result.decision
      return result.decision
    },

    async reconcileIntent(
      intentId: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<SpaceOrderMirror | undefined> {
      const purchases = useTrustedSpacePurchaseStore()
      const intent = purchases.byId(intentId)
      const generation = this.reconciliationGeneration
      if (!intent) {
        this.recordReconciliationAudit(intentId, 'failed', 'intent_missing')
        return undefined
      }
      if (!this.canReconcileIntent(intent)) {
        this.recordReconciliationAudit(intentId, 'failed', 'context_rejected')
        return undefined
      }

      let event: SpaceOrderEvent | undefined
      try {
        event = await adapter.findOrderByIntent(intentId)
      } catch (error) {
        this.recordReconciliationAudit(
          intentId,
          'failed',
          'query_failed',
          undefined,
          error instanceof Error ? error.message : '可信空间订单查询失败'
        )
        return undefined
      }
      const currentIntent = purchases.byId(intentId)
      if (generation !== this.reconciliationGeneration) {
        this.recordReconciliationAudit(intentId, 'failed', 'context_changed', event)
        return undefined
      }
      if (!event) {
        this.recordReconciliationAudit(intentId, 'failed', 'order_not_found')
        return undefined
      }
      if (event.purchaseIntentId !== intentId) {
        this.recordReconciliationAudit(intentId, 'failed', 'intent_mismatch', event)
        return undefined
      }
      if (
        !currentIntent
        || currentIntent.appEnterpriseId !== intent.appEnterpriseId
        || currentIntent.operatorMemberId !== intent.operatorMemberId
        || !this.canReconcileIntent(currentIntent)
      ) {
        this.recordReconciliationAudit(intentId, 'failed', 'context_changed', event)
        return undefined
      }
      const decision = this.processSpaceOrderEvent(event)
      if (['retry', 'dead_letter', 'signature_rejected'].includes(decision)) {
        this.recordReconciliationAudit(intentId, 'failed', decision, event)
        return undefined
      }
      const mirror = this.byId(event.spaceOrderId)
      if (mirror?.purchaseIntentId !== intentId) {
        this.recordReconciliationAudit(intentId, 'failed', 'intent_mismatch', event)
        return undefined
      }
      this.recordReconciliationAudit(
        intentId,
        decision === 'process' ? 'applied' : 'noop',
        decision,
        event
      )
      return mirror
    },

    clearMirrors() {
      this.reconciliationGeneration += 1
      this.mirrors = []
    },

    canReconcileIntent(intent: SpacePurchaseIntent): boolean {
      const userStore = useUserStore()
      const context = userStore.context
      const product = useTrustedSpaceCatalogStore().byProductId(intent.appProductId)
      return (
        context.enterpriseAuthStatus === 'authenticated'
        && context.currentEnterpriseId === intent.appEnterpriseId
        && context.currentMemberId === intent.operatorMemberId
        && Boolean(userStore.enterpriseMemberFor(intent.appEnterpriseId, intent.operatorMemberId))
        && product?.spaceProductNo === intent.spaceProductNo
      )
    },

    reconciliationIntentId(event: Pick<ConnectorEvent, 'connector' | 'purchaseIntentId' | 'spaceEnterpriseId' | 'spaceProductNo'>): string | undefined {
      if (event.connector !== 'trusted_space' || !event.purchaseIntentId) return undefined
      const intent = useTrustedSpacePurchaseStore().byId(event.purchaseIntentId)
      const product = intent && useTrustedSpaceCatalogStore().byProductId(intent.appProductId)
      if (
        !intent
        || !product
        || event.spaceEnterpriseId !== intent.spaceEnterpriseId
        || event.spaceProductNo !== intent.spaceProductNo
        || product.spaceProductNo !== intent.spaceProductNo
        || !this.canReconcileIntent(intent)
      ) return undefined
      return intent.id
    },

    longUnlinkedIntents(now = new Date()): SpacePurchaseIntent[] {
      return useTrustedSpacePurchaseStore().intents.filter(
        (intent) => isLongUnlinkedSpacePurchase(intent, now) && this.canReconcileIntent(intent),
      )
    },

    recordReconciliationAudit(
      intentId: string,
      status: SpaceOrderReconciliationAudit['status'],
      reason: SpaceOrderReconciliationAudit['reason'],
      event?: SpaceOrderEvent,
      detail?: string
    ) {
      this.reconciliationAudits.push({
        id: genId('recaudit'),
        intentId,
        status,
        reason,
        eventId: event?.eventId,
        detail,
        createdAt: new Date().toISOString()
      })
    },

    hasValidAssociation(event: SpaceOrderEvent, current: SpaceOrderMirror | undefined): boolean {
      const intent = useTrustedSpacePurchaseStore().byId(event.purchaseIntentId)
      const product = intent && useTrustedSpaceCatalogStore().byProductId(intent.appProductId)
      if (
        !intent ||
        intent.spaceEnterpriseId !== event.spaceEnterpriseId ||
        intent.spaceProductNo !== event.spaceProductNo ||
        !product ||
        product.appProductId !== intent.appProductId ||
        product.spaceProductNo !== event.spaceProductNo
      ) return false

      if (
        current && (
          current.purchaseIntentId !== intent.id ||
          current.spaceEnterpriseId !== intent.spaceEnterpriseId ||
          current.spaceProductNo !== intent.spaceProductNo
        )
      ) return false
      return true
    },

    deadLetterRejectedEvent(event: SpaceOrderEvent, integration = useIntegrationStore()): PipelineDecision {
      const rejected = integration.recordRejectedEvent({
        connector: 'trusted_space',
        subjectId: event.spaceOrderId,
        eventType: 'order_update',
        eventVersion: event.eventVersion,
        idempotencyKey: event.idempotencyKey,
        signatureValid: event.signatureValid,
        purchaseIntentId: event.purchaseIntentId,
        spaceEnterpriseId: event.spaceEnterpriseId,
        spaceProductNo: event.spaceProductNo,
      })
      while (integration.failEvent(rejected.id).outcome !== 'dead_letter') {
        // Association and state-transition violations are permanent.
      }
      return 'dead_letter'
    },

    upsertFromEvent(event: SpaceOrderEvent): boolean {
      const intent = useTrustedSpacePurchaseStore().byId(event.purchaseIntentId)!
      const product = useTrustedSpaceCatalogStore().byProductId(intent.appProductId)!

      const mirror: SpaceOrderMirror = {
        spaceOrderId: event.spaceOrderId,
        purchaseIntentId: intent.id,
        appEnterpriseId: intent.appEnterpriseId,
        spaceEnterpriseId: intent.spaceEnterpriseId,
        operatorMemberId: intent.operatorMemberId,
        appProductId: intent.appProductId,
        spaceProductNo: intent.spaceProductNo,
        productName: product.name,
        rawStatus: event.rawStatus,
        displayStatus: mapSpaceOrderStatus(event.rawStatus),
        amount: event.amount,
        currency: event.currency,
        eventVersion: event.eventVersion,
        spaceUpdatedAt: event.occurredAt,
        syncedAt: new Date().toISOString(),
        deliverySummary: event.deliverySummary,
        detailUrl: event.detailUrl
      }
      const index = this.mirrors.findIndex((item) => item.spaceOrderId === event.spaceOrderId)
      if (index >= 0) this.mirrors[index] = mirror
      else this.mirrors.push(mirror)
      return true
    }
  }
})
