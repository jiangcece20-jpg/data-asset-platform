import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from './catalog'
import { useSellerMarketStore } from './sellerMarket'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useSpaceIntentStore } from './spaceIntents'
import { useOrderStore } from './orders'
import { useUserStore } from './user'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { resolveV102Trade } from '@/domain/v102Trade'
import { SALES_STATE_LABELS, salesStateOf } from '@/domain/salesListing'

describe('sales use only publication and delisting', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.restoreAllMocks() })

  it('does not expose a pause state or pause/resume operations', () => {
    const catalog = useCatalogStore()
    expect(Object.values(SALES_STATE_LABELS)).not.toContain('暂停新购')
    expect((catalog as any).pauseProduct).toBeUndefined()
    expect((catalog as any).resumeProduct).toBeUndefined()
    expect(catalog.products.some(p => p.availability === 'paused' || p.status === 'paused')).toBe(false)
    expect(salesStateOf({ availability: 'paused' } as any)).toBe('delisted')
  })

  it('maps confirmed source pauses to system delisting, preserving the source fact', () => {
    const catalog = useCatalogStore(), trusted = useTrustedSpaceCatalogStore()
    const source = seedTrustedProductSnapshots[0]!
    trusted.upsertSnapshot({ ...source, saleStatus: 'published' })
    trusted.upsertSnapshot({ ...source, version: source.version + 1, saleStatus: 'paused' })
    expect(catalog.byId(source.appProductId)).toMatchObject({ availability: 'delisted', status: 'delisted', lastListingChange: { mode: 'system', action: 'delist' } })
    expect(trusted.byProductId(source.appProductId)?.saleStatus).toBe('paused')
    trusted.upsertSnapshot({ ...source, version: source.version + 2, saleStatus: 'published' })
    expect(catalog.byId(source.appProductId)?.availability).toBe('published')
  })

  it('suspending merchant admission force-delists products and keeps review facts', () => {
    const sellers = useSellerMarketStore(), catalog = useCatalogStore()
    const product = catalog.products.find(p => p.origin === 'seller_market' && p.availability === 'published')!
    const listing = sellers.listings.find(l => l.productId === product.id)
    const review = listing?.reviewStatus
    sellers.decideAccess(product.sellerId!, 'suspended', '准入暂停')
    expect(product).toMatchObject({ availability: 'delisted', status: 'delisted', manualDelistedBy: 'operator' })
    if (listing) expect(listing).toMatchObject({ listingStatus: 'delisted', reviewStatus: review })
    sellers.decideAccess(product.sellerId!, 'approved', '准入恢复')
    expect(product.availability).toBe('delisted')
  })

  it('keeps the apply entry on unknown source state without inventing a sales state', () => {
    const product = useCatalogStore().byId('prod-qualification-api')!
    const result = resolveV102Trade({ ...product, availability: 'published', status: 'published' }, {
      isTeam: true, hasMembership: true, hasAccess: false
    })
    expect(result.action).toMatchObject({ key: 'apply' })
    expect(result.action.disabled).not.toBe(true)
  })

  it('creates an unclaimed intent when source synchronization is unavailable', () => {
    const trusted = useTrustedSpaceCatalogStore(), intents = useSpaceIntentStore()
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    intents.list = []
    const source = seedTrustedProductSnapshots.find(p => p.appProductId === 'prod-qualification-api')!
    trusted.upsertSnapshot({ ...source, syncState: 'sync_failed' })
    const intent = intents.submit({ productId: source.appProductId, contactName: '王涛', contactPhone: '13800000000', scenario: '核验' })
    expect(useCatalogStore().byId(source.appProductId)?.availability).toBe('published')
    expect(intent.opsStatus).toBe('unclaimed')
    expect(intents.list).toHaveLength(1)
    expect(trusted.byProductId(source.appProductId)?.syncState).toBe('sync_failed')
  })

  it('rejects a new intent after the local product is confirmed delisted', () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    const intents = useSpaceIntentStore(), trusted = useTrustedSpaceCatalogStore()
    intents.list = []
    const source = seedTrustedProductSnapshots.find(p => p.appProductId === 'prod-qualification-api')!
    trusted.upsertSnapshot(source)
    trusted.upsertSnapshot({ ...source, version: source.version + 1, saleStatus: 'delisted' })
    expect(() => intents.submit({ productId: source.appProductId, contactName: '王涛', contactPhone: '', scenario: '' })).toThrow('商品已下架')
    expect(intents.list).toHaveLength(0)
    expect(useCatalogStore().byId(source.appProductId)?.availability).toBe('delisted')
  })
})
