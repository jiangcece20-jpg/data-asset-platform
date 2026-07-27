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
})
