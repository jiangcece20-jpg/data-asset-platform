import { defineStore } from 'pinia'
import { canApplySpaceOrderEvent, mapSpaceOrderStatus } from '@/domain/trustedSpacePolicy'
import { trustedSpaceAdapter, type TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type { PipelineDecision } from '@/types/configGovernance'
import type { UserContext } from '@/types/domain'
import type { SpaceOrderEvent, SpaceOrderMirror } from '@/types/trustedSpace'
import { useIntegrationStore } from './integration'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'

export const useSpaceOrderStore = defineStore('space-orders', {
  state: () => ({
    mirrors: [] as SpaceOrderMirror[]
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
        if (user.enterpriseAuthStatus !== 'authenticated' || !user.currentEnterpriseId || !user.currentMemberId) return []

        const enterpriseOrders = state.mirrors.filter((mirror) => mirror.appEnterpriseId === user.currentEnterpriseId)
        return user.role === 'admin'
          ? enterpriseOrders
          : enterpriseOrders.filter((mirror) => mirror.operatorMemberId === user.currentMemberId)
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

      const result = integration.processEvent({
        connector: 'trusted_space',
        subjectId: event.spaceOrderId,
        eventType: 'order_update',
        eventVersion: event.eventVersion,
        idempotencyKey: event.idempotencyKey,
        signatureValid: event.signatureValid
      })
      if (result.decision !== 'process') return result.decision

      this.upsertFromEvent(event)
      return result.decision
    },

    async reconcileIntent(
      intentId: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<SpaceOrderMirror | undefined> {
      const event = await adapter.findOrderByIntent(intentId)
      if (!event || event.purchaseIntentId !== intentId) return undefined
      this.processSpaceOrderEvent(event)
      return this.byId(event.spaceOrderId)
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
        signatureValid: event.signatureValid
      })
      while (integration.failEvent(rejected.id).outcome !== 'dead_letter') {
        // Association and state-transition violations are permanent.
      }
      return 'dead_letter'
    },

    upsertFromEvent(event: SpaceOrderEvent) {
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
    }
  }
})
