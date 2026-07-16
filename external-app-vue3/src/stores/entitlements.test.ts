import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { useEntitlementStore } from './entitlements'

describe('item entitlement policies', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('binds report access permanently to the purchased version', () => {
    const store = useEntitlementStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    store.grantItem(report)
    expect(store.hasPersonalItem(report, '2099-01-01')).toBe(true)
    expect(store.hasPersonalItem({
      ...report,
      typeDetail: { report: { ...report.typeDetail.report!, version: 'V2026-08' } }
    }, '2099-01-01')).toBe(false)
  })

  it('expires dashboard item access after its term', () => {
    const store = useEntitlementStore()
    const dashboard = seedProducts.find((product) => product.id === 'prod-freight-index')!
    store.grantItem(dashboard)
    expect(store.hasPersonalItem(dashboard, '2100-01-01')).toBe(false)
  })
})
