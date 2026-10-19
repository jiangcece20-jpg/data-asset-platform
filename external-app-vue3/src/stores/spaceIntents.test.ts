import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './user'
import { useSpaceIntentStore } from './spaceIntents'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { userStatusOf } from '@/domain/spaceIntent'

describe('spaceIntents store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSpaceIntentStore().list = []
    useUserStore().completeEnterpriseAuth()
  })

  it('submits an intent for the current enterprise', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    expect(intent.opsStatus).toBe('unclaimed')
    expect(userStatusOf(intent.opsStatus)).toBe('unclaimed')
    expect(intent.enterpriseId).toBe(useUserStore().context.currentEnterpriseId)
  })

  it('records the complete intent lifecycle for the operations detail', () => {
    const user = useUserStore()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })

    store.claim(intent.id, user.enterprise.id)
    store.effect(intent.id, '空间侧已完成开通')

    expect(intent.operations?.map((event) => event.action)).toEqual(['submitted', 'claimed', 'entitled'])
    expect(intent.operations?.map((event) => event.label)).toEqual(['意向单创建', '运营领取', '权益生效'])
    expect(intent.operations?.at(-1)).toMatchObject({
      actor: '陈静（mem-1）',
      note: '空间侧已完成开通'
    })
  })

  it('returns the existing open intent instead of creating a duplicate', () => {
    const store = useSpaceIntentStore()
    const payload = { productId: 'prod-qualification-api', contactName: '陈静', contactPhone: '13800000000', scenario: '核验' }
    const first = store.submit(payload)
    useUserStore().switchMockEnterpriseMember('mem-2')
    const second = store.submit(payload)
    expect(second.id).toBe(first.id)
    expect(store.list).toHaveLength(1)
  })

  it('rejects a trial identity at the mutation boundary', () => {
    useUserStore().clearEnterpriseContext()
    expect(() => useSpaceIntentStore().submit({
      productId: 'prod-qualification-api', contactName: '陈静', contactPhone: '13800000000', scenario: '核验'
    })).toThrow('试用会员不能购买或申请')
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

  it('does not allow entitlement activation before an intent is claimed', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    expect(() => store.effect(intent.id, '已核验')).toThrow('仅处理中可确认权益生效')
  })

  it('activates an API intent without creating a normal order', () => {
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
    const orderCount = useOrderStore().list.length
    store.effect(intent.id, '空间侧已完成开通')
    expect(intent.opsStatus).toBe('entitled')
    expect(intent.processNote).toBe('空间侧已完成开通')
    expect(useOrderStore().list).toHaveLength(orderCount)
    expect(store.userVisibleByOwner(user.context.currentMemberId).some((item) => item.id === intent.id)).toBe(true)
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-qualification-api' && e.status === 'active')).toBe(true)
  })

  it('activates dataset entitlement directly from a processing intent', () => {
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
    store.effect(intent.id, '数据已完成接入')
    expect(intent.opsStatus).toBe('entitled')
    expect(useOrderStore().list.some((item) => item.spaceIntentId === intent.id)).toBe(false)
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset' && e.status === 'active')).toBe(true)
  })

  it('requires a processing note and prevents repeated activation', () => {
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
    expect(() => store.effect(intent.id, '')).toThrow('确认权益生效必须填写处理说明')
    store.effect(intent.id, '数据已完成接入')
    const datasetEntitlements = () =>
      useEntitlementStore().list.filter((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset')
    expect(datasetEntitlements()).toHaveLength(1)
    expect(() => store.effect(intent.id, '重复处理')).toThrow('仅处理中可确认权益生效')
    expect(datasetEntitlements()).toHaveLength(1)
  })

  it('requires a reason when closing an intent', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    expect(() => store.close(intent.id, '')).toThrow('关闭意向单必须填写原因')
    store.close(intent.id, '客户不再需要')
    expect(intent.opsStatus).toBe('closed')
  })
})
