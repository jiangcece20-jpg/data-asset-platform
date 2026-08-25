import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { useEntitlementStore } from './entitlements'
import { useUserStore } from './user'
import { useOrderStore } from './orders'

describe('item entitlement policies', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('binds report access permanently to the purchased version', () => {
    const store = useEntitlementStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    store.grantItem(report, useUserStore().context.currentMemberId)
    expect(store.hasPersonalItem(report, '2099-01-01')).toBe(true)
    expect(store.hasPersonalItem({
      ...report,
      typeDetail: { report: { ...report.typeDetail.report!, version: 'V2026-08' } }
    }, '2099-01-01')).toBe(false)
  })

  it('expires dashboard item access after its term', () => {
    const store = useEntitlementStore()
    const dashboard = seedProducts.find((product) => product.id === 'prod-freight-index')!
    store.grantItem(dashboard, useUserStore().context.currentMemberId)
    expect(store.hasPersonalItem(dashboard, '2100-01-01')).toBe(false)
  })

  it('writes an item entitlement to the explicit owner instead of the current member', () => {
    const store = useEntitlementStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    useUserStore().context.currentMemberId = 'mem-2'

    store.grantItem(report, 'mem-1')

    expect(store.list.at(-1)).toMatchObject({ source: 'personal', ownerId: 'mem-1', productId: 'prod-logistics-monthly' })
  })

  it('does not let another member inherit a personal item entitlement', () => {
    const store = useEntitlementStore()
    const user = useUserStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    store.list = []
    store.grantItem(report, 'mem-1')

    user.context.currentMemberId = 'mem-2'
    expect(store.hasPersonalItem(report)).toBe(false)
    expect(store.accessLevel(report)).toBe('none')

    store.grantItem(report, 'mem-2')
    expect(store.hasPersonalItem(report)).toBe(true)
    expect(store.accessLevel(report)).toBe('item')
  })

  it('isolates personal membership entitlements by the current member owner', () => {
    const store = useEntitlementStore()
    const user = useUserStore()
    const dashboard = seedProducts.find((product) => product.id === 'prod-freight-index')!
    store.list = []
    user.context.currentMemberId = 'mem-1'
    store.grantMember(12, 'standard')

    user.context.currentMemberId = 'mem-2'
    expect(user.context.personalMember).toBe(true)
    expect(store.hasPersonalMember).toBe(false)
    expect(store.accessLevel(dashboard)).toBe('none')

    user.context.currentMemberId = 'mem-1'
    expect(store.hasPersonalMember).toBe(true)
    expect(store.personalMemberTier).toBe('standard')
    expect(store.accessLevel(dashboard)).toBe('member')
  })

  it('activates team membership only in the current enterprise identity', () => {
    const store = useEntitlementStore()
    const user = useUserStore()
    const dashboard = seedProducts.find((product) => product.id === 'prod-freight-index')!
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    store.list = []
    store.grantMember(12, 'standard')
    expect(store.accessLevel(dashboard)).toBe('member')

    user.switchMockPurchaseIdentity('enterprise_admin')
    expect(store.hasPersonalMember).toBe(false)
    expect(store.hasEffectiveMembership).toBe(false)
    expect(store.accessLevel(dashboard)).toBe('none')

    useOrderStore().purchaseMember()
    expect(store.hasTeamMembership).toBe(true)
    expect(store.hasEffectiveMembership).toBe(true)
    expect(store.accessLevel(dashboard)).toBe('member')
    expect(store.accessLevel(report)).toBe('none')

    user.switchMockPurchaseIdentity('personal')
    expect(store.hasEffectiveMembership).toBe(false)
    expect(store.canPurchaseMembership).toBe(false)
  })

  it('scopes enterprise seat access to the current enterprise and its active assigned member', () => {
    const store = useEntitlementStore()
    const user = useUserStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    store.list = []
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    store.grantEnterpriseSeat(report.id, user.enterprise.id)

    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(true)
    expect(store.accessLevel(report)).toBe('enterprise')

    user.setEnterpriseContext('ent-other')
    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(false)
    user.setEnterpriseContext(user.enterprise.id)
    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(true)

    user.enterprise.members.find((member) => member.id === 'mem-2')!.status = 'revoked'
    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(false)
    user.enterprise.members.find((member) => member.id === 'mem-2')!.status = 'active'
    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(true)

    user.clearEnterpriseContext()
    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(false)
  })

  it('rejects an enterprise seat whose owner or enterprise id differs from the current enterprise', () => {
    const store = useEntitlementStore()
    const user = useUserStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    user.enterprise.entitledProductIds = [report.id]
    store.list = [{
      id: 'other-enterprise-seat',
      source: 'enterprise',
      type: 'seat',
      ownerId: user.enterprise.id,
      enterpriseId: 'ent-other',
      productId: report.id,
      validFrom: '2026-07-01',
      status: 'active'
    }]

    expect(store.hasEnterpriseSeatAccess(report.id)).toBe(false)
  })
})
