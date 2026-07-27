import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { useEntitlementStore } from './entitlements'
import { useUserStore } from './user'

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
})
