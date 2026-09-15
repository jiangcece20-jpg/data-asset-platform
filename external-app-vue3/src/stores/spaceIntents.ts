import { defineStore } from 'pinia'
import { seedSpaceIntents } from '@/data/seed'
import { nextOpsStatus } from '@/domain/spaceIntent'
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

const OPEN_OPS: SpaceIntentOrder['opsStatus'][] = ['unclaimed', 'processing']

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
        state.list.filter((intent) => intent.ownerMemberId === ownerMemberId)
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
    effect(id: string, processNote: string) {
      const intent = this.must(id)
      if (intent.opsStatus !== 'processing') throw new Error('仅处理中可确认权益生效')
      if (!processNote.trim()) throw new Error('确认权益生效必须填写处理说明')
      const product = useCatalogStore().byId(intent.productId)
      if (!product) throw new Error('商品不存在')
      const entitlements = useEntitlementStore()
      const ownerType = intent.enterpriseId ? 'enterprise' : 'personal'
      const ownerId = intent.enterpriseId ?? intent.ownerMemberId
      if (intent.productType === 'dataset') {
        const offer = product.datasetOffers?.[0]
        if (!offer) throw new Error('空间数据集缺少方案，无法生效')
        const ent = entitlements.grantDatasetPending({
          product,
          orderId: intent.id,
          ownerType,
          ownerId,
          operatorMemberId: intent.ownerMemberId,
          offerId: offer.id
        })
        entitlements.activateDataset(ent.id, `bi-space-${intent.id}`)
      } else if (ownerType === 'enterprise') {
        entitlements.grantEnterpriseSeat(product.id, ownerId, { orderId: intent.id })
      } else {
        entitlements.grantItem(product, ownerId, { orderId: intent.id })
      }
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'effect')
      intent.processNote = processNote.trim()
      intent.updatedAt = now()
      return intent
    },
    close(id: string, reason: string) {
      const intent = this.must(id)
      if (!reason.trim()) throw new Error('关闭意向单必须填写原因')
      intent.opsStatus = nextOpsStatus(intent.opsStatus, 'close')
      intent.closeReason = reason.trim()
      intent.updatedAt = now()
      return intent
    }
  }
})
