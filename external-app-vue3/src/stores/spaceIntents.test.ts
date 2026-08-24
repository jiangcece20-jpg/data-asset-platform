import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './user'
import { useSpaceIntentStore } from './spaceIntents'
import { useEntitlementStore } from './entitlements'
import { userStatusOf } from '@/domain/spaceIntent'

describe('spaceIntents store', () => {
  beforeEach(() => setActivePinia(createPinia()))

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

  it('rejects space dealing before an enterprise is confirmed', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    store.claim(intent.id)
    expect(() => store.markSpaceDeal(intent.id, { spaceOrderNo: 'SO-1', spaceDealNote: 'x' })).toThrow()
  })

  it('completes API after space deal without creating a dataset entitlement', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验',
      enterpriseId: user.enterprise.id
    })
    store.claim(intent.id)
    store.confirmEnterprise(intent.id, user.enterprise.id)
    store.markSpaceDeal(intent.id, { spaceOrderNo: 'SO-api', spaceDealNote: '空间已开通调用' })
    expect(intent.opsStatus).toBe('completed')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-qualification-api' && e.type === 'dataset')).toBe(false)
  })

  it('keeps dataset processing until platform delivery is completed', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '画像',
      enterpriseId: user.enterprise.id
    })
    store.claim(intent.id)
    store.confirmEnterprise(intent.id, user.enterprise.id)
    store.markSpaceDeal(intent.id, { spaceOrderNo: 'SO-ds', spaceDealNote: '空间已成交' })
    expect(intent.opsStatus).toBe('pending_delivery')
    expect(userStatusOf(intent.opsStatus)).toBe('processing')
    store.completeDelivery(intent.id)
    expect(intent.opsStatus).toBe('completed')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset' && e.status === 'active')).toBe(true)
  })
})
