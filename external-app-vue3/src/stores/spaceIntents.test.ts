import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './user'
import { useSpaceIntentStore } from './spaceIntents'
import { useEntitlementStore } from './entitlements'
import { useCatalogStore } from './catalog'
import { useOrderStore } from './orders'
import { userStatusOf } from '@/domain/spaceIntent'

describe('spaceIntents store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSpaceIntentStore().list = []
  })

  it('allows a personal user to submit an intent', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    expect(intent.opsStatus).toBe('unclaimed')
    expect(userStatusOf(intent.opsStatus)).toBe('submitted')
    expect(intent.ownerMemberId).toBe(useUserStore().context.currentMemberId)
  })

  it('does not create an order when claimed', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    store.claim(intent.id, user.enterprise.id)
    expect(intent.opsStatus).toBe('processing')
    expect(useOrderStore().list.some((order) => order.spaceIntentId === intent.id)).toBe(false)
  })

  it('rejects transaction confirmation before enterprise is attached', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    store.claim(intent.id)
    expect(() => store.confirmOfflinePayment(intent.id, '')).toThrow('确认交易必须落到认证企业')
  })

  it('converts an API intent into a fulfilling buy-data order after ops confirmation', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    store.claim(intent.id, user.enterprise.id)
    store.confirmOfflinePayment(intent.id, user.enterprise.id)
    expect(intent.opsStatus).toBe('converted')
    const order = useOrderStore().list.find((item) => item.spaceIntentId === intent.id)
    expect(order).toMatchObject({
      ownerType: 'enterprise',
      ownerId: user.enterprise.id,
      productType: 'api',
      status: 'payment_pending_confirmation',
      paymentMethod: 'enterprise_bank_transfer'
    })
    useOrderStore().confirmSpaceIntentPayment(order!.id)
    expect(order?.status).toBe('paid')
    expect(store.userVisibleByOwner(user.context.currentMemberId).some((item) => item.id === intent.id)).toBe(false)
    store.completeFulfillment(intent.id)
    expect(order?.status).toBe('entitlement_active')
    expect(order?.note).toContain('本平台不代调用')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-qualification-api' && e.type === 'dataset')).toBe(false)
  })

  it('keeps a dataset order in fulfillment until platform delivery is completed', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '画像'
    })
    store.claim(intent.id, user.enterprise.id)
    store.confirmOfflinePayment(intent.id, user.enterprise.id)
    expect(intent.opsStatus).toBe('converted')
    const order = useOrderStore().list.find((item) => item.spaceIntentId === intent.id)
    expect(order?.status).toBe('payment_pending_confirmation')
    useOrderStore().confirmSpaceIntentPayment(order!.id)
    expect(order?.status).toBe('paid')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset')).toBe(false)
    store.completeFulfillment(intent.id)
    expect(order?.status).toBe('entitlement_active')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset' && e.status === 'active')).toBe(true)
  })

  it('keeps the converted order unpaid-fulfillment when datasetOffers is empty', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '画像'
    })
    store.claim(intent.id, user.enterprise.id)
    store.confirmOfflinePayment(intent.id, user.enterprise.id)
    const product = useCatalogStore().byId('prod-enterprise-activity')!
    product.datasetOffers = []
    const order = useOrderStore().list.find((item) => item.spaceIntentId === intent.id)!
    useOrderStore().confirmSpaceIntentPayment(order.id)
    expect(() => store.completeFulfillment(intent.id)).toThrow('空间数据集缺少方案，无法接入')
    expect(intent.opsStatus).toBe('converted')
    expect(order.status).toBe('paid')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset')).toBe(false)
  })

  it('does not grant another dataset entitlement when completeFulfillment is called again', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '画像'
    })
    store.claim(intent.id, user.enterprise.id)
    store.confirmOfflinePayment(intent.id, user.enterprise.id)
    const order = useOrderStore().list.find((item) => item.spaceIntentId === intent.id)!
    useOrderStore().confirmSpaceIntentPayment(order.id)
    store.completeFulfillment(intent.id)
    const datasetEntitlements = () =>
      useEntitlementStore().list.filter((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset')
    expect(datasetEntitlements()).toHaveLength(1)
    expect(() => store.completeFulfillment(intent.id)).toThrow('仅待确认或履约中订单可完成履约')
    expect(datasetEntitlements()).toHaveLength(1)
  })
})
