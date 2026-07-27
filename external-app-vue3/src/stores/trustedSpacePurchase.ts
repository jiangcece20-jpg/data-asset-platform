import { defineStore } from 'pinia'
import { trustedSpaceAdapter, type TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type { EnterpriseAuthStatus } from '@/types/domain'
import type { EnterpriseSpaceBinding, SpacePurchaseIntent } from '@/types/trustedSpace'
import { genId } from '@/utils/id'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'

const INTENT_TTL_MS = 30 * 60 * 1000

export interface PrepareSpacePurchaseInput {
  appEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  enterpriseAuthStatus: EnterpriseAuthStatus
  returnUrl: string
}

export const useTrustedSpacePurchaseStore = defineStore('trusted-space-purchase', {
  state: () => ({
    intents: [] as SpacePurchaseIntent[],
    bindings: [] as EnterpriseSpaceBinding[]
  }),
  getters: {
    byId(state) {
      return (intentId: string) => state.intents.find((intent) => intent.id === intentId)
    },
    bindingForEnterprise(state) {
      return (appEnterpriseId: string) => state.bindings.find((binding) => binding.appEnterpriseId === appEnterpriseId)
    }
  },
  actions: {
    async preparePurchase(
      input: PrepareSpacePurchaseInput,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<SpacePurchaseIntent> {
      const binding = await adapter.ensureEnterpriseBinding(input.appEnterpriseId)
      this.upsertBinding(binding)

      const catalog = useTrustedSpaceCatalogStore()
      const check = catalog.purchaseCheck(
        input.appProductId,
        input.enterpriseAuthStatus,
        binding.status
      )
      if (!check.allowed) throw new Error(purchaseBlockMessage(check.reason))

      const snapshot = catalog.byProductId(input.appProductId)
      if (!snapshot || !binding.spaceEnterpriseId) throw new Error('可信空间商品或企业映射不可用')

      const createdAt = new Date().toISOString()
      const intent: SpacePurchaseIntent = {
        id: genId('intent'),
        appEnterpriseId: input.appEnterpriseId,
        spaceEnterpriseId: binding.spaceEnterpriseId,
        operatorMemberId: input.operatorMemberId,
        appProductId: input.appProductId,
        spaceProductNo: snapshot.spaceProductNo,
        returnUrl: input.returnUrl,
        idempotencyKey: genId('idem'),
        correlationId: genId('corr'),
        status: 'ready',
        createdAt,
        expiresAt: new Date(new Date(createdAt).getTime() + INTENT_TTL_MS).toISOString()
      }
      this.intents.push(intent)
      return intent
    },
    async createLink(intentId: string, adapter: TrustedSpaceAdapter = trustedSpaceAdapter): Promise<string> {
      const intent = this.byId(intentId)
      if (!intent) throw new Error('购买意图不存在')
      if (!['ready', 'failed'].includes(intent.status)) throw new Error('购买意图当前不可重新连接')
      if (new Date(intent.expiresAt).getTime() <= Date.now()) {
        intent.status = 'expired'
        throw new Error('购买意图已过期')
      }

      try {
        const link = await adapter.createPurchaseLink({
          intentId: intent.id,
          spaceEnterpriseId: intent.spaceEnterpriseId,
          operatorMemberId: intent.operatorMemberId,
          spaceProductNo: intent.spaceProductNo,
          returnUrl: intent.returnUrl
        })
        intent.purchaseUrl = link.url
        intent.failureReason = undefined
        intent.status = 'ready'
        return link.url
      } catch (error) {
        intent.status = 'failed'
        intent.failureReason = error instanceof Error ? error.message : '可信空间连接失败'
        throw error
      }
    },
    markRedirected(intentId: string) {
      const intent = this.byId(intentId)
      if (intent && intent.status === 'ready') intent.status = 'redirected'
    },
    markReturned(intentId: string) {
      const intent = this.byId(intentId)
      if (intent && intent.status === 'redirected') intent.status = 'returned_pending_sync'
    },
    upsertBinding(binding: EnterpriseSpaceBinding) {
      const index = this.bindings.findIndex((item) => item.appEnterpriseId === binding.appEnterpriseId)
      if (index >= 0) this.bindings[index] = { ...binding }
      else this.bindings.push({ ...binding })
    }
  }
})

function purchaseBlockMessage(reason: string): string {
  switch (reason) {
    case 'enterprise_required': return '可信空间购买仅限认证企业'
    case 'binding_required': return '企业尚未完成可信空间绑定'
    case 'product_unavailable': return '可信空间商品不可用'
    case 'product_stale': return '可信空间商品信息同步中'
    case 'product_not_for_sale': return '可信空间商品暂不可购买'
    default: return '可信空间购买暂不可用'
  }
}
