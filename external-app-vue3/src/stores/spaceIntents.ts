import { defineStore } from 'pinia'
import { canEnterSpaceDealing, nextOpsStatus } from '@/domain/spaceIntent'
import type { SpaceIntentOrder } from '@/types/spaceIntent'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useUserStore } from './user'

export interface SpaceIntentSubmitPayload {
  productId: string
  contactName: string
  contactPhone: string
  scenario: string
  enterpriseId?: string
  requestedEnterpriseName?: string
}

const OPEN_OPS: SpaceIntentOrder['opsStatus'][] = [
  'unclaimed',
  'pending_enterprise',
  'space_dealing',
  'pending_delivery'
]

export const useSpaceIntentStore = defineStore('spaceIntents', {
  state: () => ({
    list: [] as SpaceIntentOrder[]
  }),
  getters: {
    byId(state) {
      return (id: string) => state.list.find((intent) => intent.id === id)
    },
    byOwner(state) {
      return (ownerMemberId: string) => state.list.filter((intent) => intent.ownerMemberId === ownerMemberId)
    },
    openOpsList(state): SpaceIntentOrder[] {
      return state.list.filter((intent) => OPEN_OPS.includes(intent.opsStatus))
    }
  },
  actions: {
    must(id: string): SpaceIntentOrder {
      const intent = this.list.find((item) => item.id === id)
      if (!intent) throw new Error('意向单不存在')
      return intent
    },
    submit(payload: SpaceIntentSubmitPayload): SpaceIntentOrder {
      const product = useCatalogStore().byId(payload.productId)
      if (!product) throw new Error('商品不存在')
      if (product.dealChannel !== 'space_purchase' || (product.type !== 'dataset' && product.type !== 'api')) {
        throw new Error('仅空间购买的数据集与 API 可提交意向单')
      }
      const stamp = now()
      const intent: SpaceIntentOrder = {
        id: genId('intent'),
        productId: product.id,
        productType: product.type,
        ownerMemberId: useUserStore().context.currentMemberId,
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        scenario: payload.scenario,
        requestedEnterpriseName: payload.requestedEnterpriseName,
        enterpriseId: payload.enterpriseId,
        opsStatus: 'unclaimed',
        createdAt: stamp,
        updatedAt: stamp
      }
      this.list.push(intent)
      return intent
    },
    claim(id: string) {
      const intent = this.must(id)
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'claim', intent.productType)
      intent.updatedAt = now()
      return intent
    },
    confirmEnterprise(id: string, enterpriseId: string) {
      const intent = this.must(id)
      if (intent.opsStatus === 'unclaimed') {
        intent.opsStatus = nextOpsStatus(intent.opsStatus, 'claim', intent.productType)
      }
      intent.enterpriseId = enterpriseId
      if (!canEnterSpaceDealing(intent)) throw new Error('未落到认证企业')
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'confirm_enterprise', intent.productType)
      intent.updatedAt = now()
      return intent
    },
    markSpaceDeal(id: string, payload: { spaceOrderNo: string; spaceDealNote: string }) {
      const intent = this.must(id)
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'mark_space_deal', intent.productType)
      intent.spaceOrderNo = payload.spaceOrderNo
      intent.spaceDealNote = payload.spaceDealNote
      intent.updatedAt = now()
      return intent
    },
    completeDelivery(id: string) {
      const intent = this.must(id)
      if (intent.productType !== 'dataset') throw new Error('仅数据集可完成接入交付')
      const catalog = useCatalogStore()
      const product = catalog.byId(intent.productId)
      const offer = product?.datasetOffers?.[0]
      if (!product || !offer) throw new Error('空间数据集缺少方案，无法接入')
      const entitlements = useEntitlementStore()
      const ent = entitlements.grantDatasetPending({
        product,
        orderId: intent.id,
        ownerType: 'enterprise',
        ownerId: intent.enterpriseId!,
        operatorMemberId: intent.ownerMemberId,
        offerId: offer.id
      })
      entitlements.activateDataset(ent.id, `bi-space-${intent.id}`)
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'complete_delivery', intent.productType)
      intent.updatedAt = now()
      return intent
    },
    close(id: string, reason: string) {
      const intent = this.must(id)
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'close', intent.productType)
      intent.closeReason = reason
      intent.updatedAt = now()
      return intent
    }
  }
})
