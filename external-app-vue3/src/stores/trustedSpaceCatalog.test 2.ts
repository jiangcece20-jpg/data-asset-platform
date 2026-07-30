import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import type { TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type { TrustedProductSnapshot } from '@/types/trustedSpace'
import { useCatalogStore } from './catalog'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'

type SyncResult = Awaited<ReturnType<TrustedSpaceAdapter['syncProducts']>>
type ProductResult = Awaited<ReturnType<TrustedSpaceAdapter['getProduct']>>

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function productSnapshot(
  overrides: Partial<TrustedProductSnapshot> = {},
  source = seedTrustedProductSnapshots[0]
): TrustedProductSnapshot {
  return {
    ...source,
    price: { ...source.price },
    ...overrides
  }
}

describe('trustedSpaceCatalog store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('syncs snapshots without overwriting APP recommend text', async () => {
    const store = useTrustedSpaceCatalogStore()
    const catalog = useCatalogStore()
    catalog.updateProduct('prod-qualification-api', { recommendText: 'APP 自定义推荐语' })

    await store.syncAll(new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z'))

    expect(store.byProductId('prod-qualification-api')?.spaceProductNo).toBe('SPACE-API-20415')
    expect(store.lastSuccessAt).toBe('2026-07-27T10:00:00.000Z')
    const p = catalog.byId('prod-qualification-api')
    expect(p?.recommendText).toBe('APP 自定义推荐语')
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

  it('ignores an older full-sync failure after a newer full-sync success', async () => {
    const older = deferred<SyncResult>()
    const newer = deferred<SyncResult>()
    const requests = [older, newer]
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.syncProducts = () => requests.shift()!.promise
    const store = useTrustedSpaceCatalogStore()

    const olderRun = store.syncAll(adapter)
    const newerRun = store.syncAll(adapter)
    newer.resolve({
      items: [productSnapshot({
        name: '新请求商品',
        version: 13,
        spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
        syncedAt: '2026-07-27T10:06:00.000Z'
      })]
    })
    await newerRun
    const syncingWhileOlderPending = store.syncing
    older.reject(new Error('旧请求失败'))
    await olderRun

    expect(syncingWhileOlderPending).toBe(true)
    expect(store.syncing).toBe(false)
    expect(store.error).toBe('')
    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '新请求商品',
      version: 13,
      syncState: 'current'
    })
    expect(store.lastSuccessAt).toBe('2026-07-27T10:06:00.000Z')
    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:07:00.000Z'
    )).toEqual({ allowed: true })
  })

  it.each([
    {
      label: 'older space fact',
      incoming: {
        spaceUpdatedAt: '2026-07-27T10:04:00.000Z',
        syncedAt: '2026-07-27T10:11:00.000Z'
      }
    },
    {
      label: 'older receipt',
      incoming: {
        spaceUpdatedAt: '2026-07-27T10:06:00.000Z',
        syncedAt: '2026-07-27T10:09:00.000Z'
      }
    }
  ])('rejects a same-version response with $label', ({ incoming }) => {
    const store = useTrustedSpaceCatalogStore()
    store.upsertSnapshot(productSnapshot({
      name: '当前权威商品',
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:10:00.000Z'
    }))

    store.upsertSnapshot(productSnapshot({
      name: '迟到旧商品',
      version: 13,
      ...incoming
    }))

    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '当前权威商品',
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:10:00.000Z'
    })
    expect(useCatalogStore().byId('prod-qualification-api')?.name).toBe('当前权威商品')
  })

  it('refreshes only receipt metadata when the same space fact is received again', () => {
    const store = useTrustedSpaceCatalogStore()
    store.upsertSnapshot(productSnapshot({
      name: '当前权威商品',
      saleStatus: 'paused',
      price: { model: 'quote', quoteNote: '当前权威价格' },
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:10:00.000Z',
      syncState: 'sync_failed'
    }))

    store.upsertSnapshot(productSnapshot({
      name: '同版本异常改名',
      saleStatus: 'published',
      price: { model: 'item_only', itemPrice: 1 },
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:12:00.000Z',
      syncState: 'current'
    }))

    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '当前权威商品',
      saleStatus: 'paused',
      price: { model: 'quote', quoteNote: '当前权威价格' },
      syncedAt: '2026-07-27T10:12:00.000Z',
      syncState: 'current'
    })
    expect(useCatalogStore().byId('prod-qualification-api')).toMatchObject({
      name: '当前权威商品',
      availability: 'paused',
      price: { model: 'quote', quoteNote: '当前权威价格' }
    })
  })

  it('does not let an older full sync overwrite a later product refresh', async () => {
    const olderSync = deferred<SyncResult>()
    const newerRefresh = deferred<ProductResult>()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.syncProducts = () => olderSync.promise
    adapter.getProduct = () => newerRefresh.promise
    const store = useTrustedSpaceCatalogStore()

    const syncRun = store.syncAll(adapter)
    const refreshRun = store.refreshProduct('prod-qualification-api', adapter)
    newerRefresh.resolve(productSnapshot({
      name: '较新单商品刷新',
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:06:00.000Z'
    }))
    await refreshRun
    olderSync.resolve({
      items: [productSnapshot({
        name: '迟到全量同步',
        version: 14,
        spaceUpdatedAt: '2026-07-27T10:07:00.000Z',
        syncedAt: '2026-07-27T10:08:00.000Z'
      })]
    })
    await syncRun

    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '较新单商品刷新',
      version: 13
    })
    expect(store.lastSuccessAt).toBe('2026-07-27T10:06:00.000Z')
    expect(useCatalogStore().byId('prod-qualification-api')?.name).toBe('较新单商品刷新')
  })

  it('does not let an older product refresh overwrite a later full sync', async () => {
    const olderRefresh = deferred<ProductResult>()
    const newerSync = deferred<SyncResult>()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.getProduct = () => olderRefresh.promise
    adapter.syncProducts = () => newerSync.promise
    const store = useTrustedSpaceCatalogStore()

    const refreshRun = store.refreshProduct('prod-qualification-api', adapter)
    const syncRun = store.syncAll(adapter)
    newerSync.resolve({
      items: [productSnapshot({
        name: '较新全量同步',
        version: 13,
        spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
        syncedAt: '2026-07-27T10:06:00.000Z'
      })]
    })
    await syncRun
    olderRefresh.resolve(productSnapshot({
      name: '迟到单商品刷新',
      version: 14,
      spaceUpdatedAt: '2026-07-27T10:07:00.000Z',
      syncedAt: '2026-07-27T10:08:00.000Z'
    }))
    await refreshRun

    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '较新全量同步',
      version: 13
    })
    expect(store.lastSuccessAt).toBe('2026-07-27T10:06:00.000Z')
    expect(useCatalogStore().byId('prod-qualification-api')?.name).toBe('较新全量同步')
  })

  it('ignores an older product-refresh failure after a newer refresh succeeds', async () => {
    const store = useTrustedSpaceCatalogStore()
    await store.syncAll(new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z'))
    const older = deferred<ProductResult>()
    const newer = deferred<ProductResult>()
    const requests = [older, newer]
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.getProduct = () => requests.shift()!.promise

    const olderRun = store.refreshProduct('prod-qualification-api', adapter)
    const newerRun = store.refreshProduct('prod-qualification-api', adapter)
    newer.resolve(productSnapshot({
      name: '最新单商品成功',
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:06:00.000Z'
    }))
    await newerRun
    const syncingWhileOlderPending = store.syncing
    older.reject(new Error('旧单商品请求失败'))
    await olderRun

    expect(syncingWhileOlderPending).toBe(true)
    expect(store.syncing).toBe(false)
    expect(store.error).toBe('')
    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '最新单商品成功',
      syncState: 'current'
    })
  })

  it('ignores an older same-version full-sync success that arrives last', async () => {
    const older = deferred<SyncResult>()
    const newer = deferred<SyncResult>()
    const requests = [older, newer]
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.syncProducts = () => requests.shift()!.promise
    const store = useTrustedSpaceCatalogStore()

    const olderRun = store.syncAll(adapter)
    const newerRun = store.syncAll(adapter)
    newer.resolve({
      items: [productSnapshot({
        name: '同版本新请求',
        version: 13,
        spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
        syncedAt: '2026-07-27T10:06:00.000Z'
      })]
    })
    await newerRun
    older.resolve({
      items: [productSnapshot({
        name: '同版本迟到旧请求',
        version: 13,
        spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
        syncedAt: '2026-07-27T10:05:00.000Z'
      })]
    })
    await olderRun

    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '同版本新请求',
      version: 13,
      syncedAt: '2026-07-27T10:06:00.000Z'
    })
  })

  it('accepts a higher version as authoritative even when its timestamps are older', () => {
    const store = useTrustedSpaceCatalogStore()
    store.upsertSnapshot(productSnapshot({
      name: '低版本较新接收',
      version: 13,
      spaceUpdatedAt: '2026-07-27T10:05:00.000Z',
      syncedAt: '2026-07-27T10:06:00.000Z'
    }))

    store.upsertSnapshot(productSnapshot({
      name: '高版本权威事实',
      version: 14,
      spaceUpdatedAt: '2026-07-27T10:04:00.000Z',
      syncedAt: '2026-07-27T10:05:00.000Z'
    }))

    expect(store.byProductId('prod-qualification-api')).toMatchObject({
      name: '高版本权威事实',
      version: 14
    })
    expect(useCatalogStore().byId('prod-qualification-api')?.name).toBe('高版本权威事实')
  })

  it('locks only the target product when its latest refresh fails', async () => {
    const store = useTrustedSpaceCatalogStore()
    await store.syncAll(new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z'))
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:01:00.000Z')
    adapter.getProduct = async () => { throw new Error('目标商品刷新失败') }

    await store.refreshProduct('prod-qualification-api', adapter)

    expect(store.byProductId('prod-qualification-api')?.syncState).toBe('sync_failed')
    expect(store.byProductId('prod-privacy-verify')?.syncState).toBe('current')
    expect(store.error).toBe('目标商品刷新失败')
    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:02:00.000Z'
    )).toEqual({ allowed: false, reason: 'product_stale' })
    expect(store.purchaseCheck(
      'prod-privacy-verify',
      'authenticated',
      'active',
      '2026-07-27T10:02:00.000Z'
    )).toEqual({ allowed: true })
  })
})
