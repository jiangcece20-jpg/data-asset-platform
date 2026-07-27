import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useCatalogStore } from './catalog'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'

describe('trustedSpaceCatalog store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('syncs snapshots without overwriting APP enhancements', async () => {
    const store = useTrustedSpaceCatalogStore()
    const catalog = useCatalogStore()
    catalog.updateEnhancement('prod-qualification-api', { displayTitle: 'APP 自定义展示名' })

    await store.syncAll(new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z'))

    expect(store.byProductId('prod-qualification-api')?.spaceProductNo).toBe('SPACE-API-20415')
    expect(store.lastSuccessAt).toBe('2026-07-27T10:00:00.000Z')
    expect(catalog.enhancementOf('prod-qualification-api')?.displayTitle).toBe('APP 自定义展示名')
  })

  it('blocks purchase when the cached snapshot is stale', async () => {
    const store = useTrustedSpaceCatalogStore()

    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.syncProducts = async () => ({
      items: seedTrustedProductSnapshots.map((snapshot) => ({
        ...snapshot,
        syncedAt: '2026-07-27T09:00:00.000Z'
      }))
    })
    await store.syncAll(adapter)

    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:00:01.000Z'
    )).toEqual({ allowed: false, reason: 'product_stale' })
  })

  it('restores purchase eligibility after a successful resync refreshes the receipt time', async () => {
    let clock = '2026-07-27T10:00:00.000Z'
    const adapter = new MockTrustedSpaceAdapter(() => clock)
    const store = useTrustedSpaceCatalogStore()

    await store.syncAll(adapter)
    expect(store.purchaseCheck('prod-qualification-api', 'authenticated', 'active', clock)).toEqual({ allowed: true })
    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:31:00.000Z'
    )).toEqual({ allowed: false, reason: 'product_stale' })

    clock = '2026-07-27T10:31:00.000Z'
    await store.syncAll(adapter)
    expect(store.purchaseCheck('prod-qualification-api', 'authenticated', 'active', clock)).toEqual({ allowed: true })
  })

  it('keeps the last catalog fields and locks purchasing when a sync fails', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const store = useTrustedSpaceCatalogStore()
    const catalog = useCatalogStore()
    await store.syncAll(adapter)
    const originalName = catalog.byId('prod-qualification-api')?.name
    adapter.syncProducts = async () => { throw new Error('空间不可用') }

    await store.syncAll(adapter)

    expect(catalog.byId('prod-qualification-api')?.name).toBe(originalName)
    expect(store.byProductId('prod-qualification-api')?.syncState).toBe('sync_failed')
    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:01:00.000Z'
    )).toEqual({ allowed: false, reason: 'product_stale' })
  })

  it('does not replace catalog fields with an older space version', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const store = useTrustedSpaceCatalogStore()
    const catalog = useCatalogStore()
    await store.syncAll(adapter)
    const currentName = catalog.byId('prod-qualification-api')?.name
    adapter.syncProducts = async () => ({
      items: [{
        ...seedTrustedProductSnapshots[0],
        name: '过期空间商品名',
        version: 1,
        syncedAt: '2026-07-27T10:01:00.000Z'
      }]
    })

    await store.syncAll(adapter)

    expect(catalog.byId('prod-qualification-api')?.name).toBe(currentName)
    expect(store.byProductId('prod-qualification-api')?.version).toBe(12)
  })

  it('refreshes only the requested product', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const store = useTrustedSpaceCatalogStore()
    await store.syncAll(adapter)
    const untouched = store.byProductId('prod-privacy-verify')!
    adapter.getProduct = async (spaceProductNo) => spaceProductNo === 'SPACE-API-20415'
      ? {
          ...seedTrustedProductSnapshots[0],
          name: '已刷新资格核验 API',
          version: 13,
          syncedAt: '2026-07-27T10:05:00.000Z'
        }
      : undefined

    await store.refreshProduct('prod-qualification-api', adapter)

    expect(store.byProductId('prod-qualification-api')?.name).toBe('已刷新资格核验 API')
    expect(store.byProductId('prod-privacy-verify')).toEqual(untouched)
  })

  it('keeps the latest display status for an unknown sale state while refusing purchase', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const store = useTrustedSpaceCatalogStore()
    const catalog = useCatalogStore()
    adapter.syncProducts = async () => ({
      items: seedTrustedProductSnapshots.map((snapshot) => snapshot.appProductId === 'prod-qualification-api'
        ? { ...snapshot, saleStatus: 'unknown', version: 13, syncedAt: '2026-07-27T10:00:00.000Z' }
        : { ...snapshot, syncedAt: '2026-07-27T10:00:00.000Z' })
    })

    await store.syncAll(adapter)

    expect(catalog.byId('prod-qualification-api')?.availability).toBe('published')
    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:01:00.000Z'
    )).toEqual({ allowed: false, reason: 'product_not_for_sale' })
  })
})
