import { defineStore } from 'pinia'
import { seedSpaceIntents } from '@/data/seed'
import { canConfirmPayment, canConfirmTransaction, nextOpsStatus } from '@/domain/spaceIntent'
import type { SpaceIntentOrder } from '@/types/spaceIntent'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useUserStore } from './user'

export interface SpaceIntentSubmitPayload {
  productId: string
  contactName: string
  contactPhone: string
  scenario: string
  enterpriseId?: string
  requestedEnterpriseName?: string
}

const OPEN_OPS: SpaceIntentOrder['opsStatus'][] = ['unclaimed', 'processing', 'converted']

export const useSpaceIntentStore = defineStore('spaceIntents', {
  state: () => ({
    list: seedSpaceIntents.map((item) => ({ ...item })) as SpaceIntentOrder[]
  }),
  getters: {
    byId(state) {
      return (id: string) => state.list.find((intent) => intent.id === id)
    },
    byOwner(state) {
      return (ownerMemberId: string) => state.list.filter((intent) => intent.ownerMemberId === ownerMemberId)
    },
    userVisibleByOwner(state) {
      return (ownerMemberId: string) =>
        state.list.filter((intent) => intent.ownerMemberId === ownerMemberId && intent.opsStatus !== 'converted')
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
    claim(id: string, enterpriseId?: string) {
      const intent = this.must(id)
      if (intent.opsStatus !== 'unclaimed') throw new Error('仅待领取可领取')
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'claim')
      if (enterpriseId) intent.enterpriseId = enterpriseId
      intent.updatedAt = now()
      return intent
    },
    confirmOfflinePayment(id: string, enterpriseId: string) {
      const intent = this.must(id)
      if (intent.opsStatus === 'closed') throw new Error('已关闭不可确认交易')
      if (intent.opsStatus === 'converted') throw new Error('该意向单已转为订单')
      if (intent.opsStatus !== 'processing') throw new Error('仅处理中可确认交易')
      intent.enterpriseId = enterpriseId
      if (!canConfirmPayment(intent)) throw new Error('确认交易必须落到认证企业')
      if (!canConfirmTransaction(intent)) throw new Error('线下方案确认后才可转买数订单')
      const product = useCatalogStore().byId(intent.productId)
      if (!product) throw new Error('商品不存在')
      const order = useOrderStore().createFromSpaceIntent({
        intentId: intent.id,
        product,
        enterpriseId,
        operatorMemberId: intent.ownerMemberId
      })
      intent.orderId = order.id
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'confirm_payment')
      intent.updatedAt = now()
      return intent
    },
    completeFulfillment(id: string) {
      const intent = this.must(id)
      if (intent.opsStatus !== 'converted' || !intent.orderId) throw new Error('仅已转订单可完成履约')
      const orders = useOrderStore()
      const order = orders.list.find((item) => item.id === intent.orderId)
      if (!order) throw new Error('对应买数订单不存在')
      if (order.status !== 'paid' && order.status !== 'payment_pending_confirmation') {
        throw new Error('仅待确认或履约中订单可完成履约')
      }
      if (order.status === 'payment_pending_confirmation') {
        throw new Error('请先确认到账后再完成履约')
      }
      if (intent.productType === 'dataset') {
        const product = useCatalogStore().byId(intent.productId)
        const offer = product?.datasetOffers?.[0]
        if (!product || !offer) throw new Error('空间数据集缺少方案，无法接入')
        const entitlements = useEntitlementStore()
        const ent = entitlements.grantDatasetPending({
          product,
          orderId: order.id,
          ownerType: 'enterprise',
          ownerId: intent.enterpriseId!,
          operatorMemberId: intent.ownerMemberId,
          offerId: offer.id
        })
        entitlements.activateDataset(ent.id, `bi-space-${intent.id}`)
        order.entitlementId = ent.id
        order.entitlementGranted = true
      } else {
        order.note = '空间已开通调用。请按订单说明在对方空间使用，本平台不代调用。'
      }
      order.status = 'entitlement_active'
      intent.updatedAt = now()
      return intent
    },
    close(id: string, reason: string) {
      const intent = this.must(id)
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'close')
      intent.closeReason = reason
      intent.updatedAt = now()
      return intent
    }
  }
})
