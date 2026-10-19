import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import type { Order } from '@/types/domain'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'

describe('catalog store — resource extensions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has resources in state', () => {
    const catalog = useCatalogStore()
    expect(catalog.resources.length).toBeGreaterThan(0)
  })

  it('resourceById returns the correct resource', () => {
    const catalog = useCatalogStore()
    const first = catalog.resources[0]
    expect(catalog.resourceById(first.id)?.resourceName).toBe(first.resourceName)
  })

  it('resourceById returns undefined for unknown id', () => {
    const catalog = useCatalogStore()
    expect(catalog.resourceById('nonexistent')).toBeUndefined()
  })

  it('productForResource returns the linked product', () => {
    const catalog = useCatalogStore()
    const product = catalog.products[0]
    const found = catalog.productForResource(product.resourceId)
    expect(found?.id).toBe(product.id)
  })

  it('productForResource returns undefined for unlisted resource', () => {
    const catalog = useCatalogStore()
    expect(catalog.productForResource('res-nonexistent')).toBeUndefined()
  })

  it('packProductIntoGroup merges unpackaged products and syncs pricing', () => {
    const catalog = useCatalogStore()
    const source = catalog.byId('prod-freight-index')!
    const target = catalog.byId('prod-cold-chain-dashboard')!
    source.price = { ...source.price, itemPrice: 321 }
    catalog.packProductIntoGroup(source.id, target.id)
    expect(catalog.groupMembersOf(source.id).map((item) => item.id)).toEqual([source.id, target.id])
    expect(catalog.byId(target.id)?.price.itemPrice).toBe(321)
  })

  it('packProductIntoGroup rejects packaged products from other groups', () => {
    const catalog = useCatalogStore()
    catalog.packProductIntoGroup('prod-freight-index', 'prod-cold-chain-dashboard')
    expect(() => catalog.packProductIntoGroup('prod-logistics-monthly', 'prod-cold-chain-dashboard')).toThrow('目标商品已在其它打包组')
  })

  it('packProductsIntoGroup merges multiple unpackaged products at once', () => {
    const catalog = useCatalogStore()
    const source = catalog.byId('prod-freight-index')!
    const members = catalog.packProductsIntoGroup(source.id, [
      'prod-cold-chain-dashboard',
      'prod-port-dashboard-free'
    ])
    expect(members.map((item) => item.id)).toEqual([
      'prod-freight-index',
      'prod-cold-chain-dashboard',
      'prod-port-dashboard-free'
    ])
  })

  it('unpackProductFromGroup gives a product its own group', () => {
    const catalog = useCatalogStore()
    catalog.packProductsIntoGroup('prod-freight-index', ['prod-cold-chain-dashboard', 'prod-port-dashboard-free'])
    catalog.unpackProductFromGroup('prod-cold-chain-dashboard')
    expect(catalog.groupMembersOf('prod-freight-index').map((item) => item.id)).toEqual([
      'prod-freight-index',
      'prod-port-dashboard-free'
    ])
    expect(catalog.groupMembersOf('prod-cold-chain-dashboard').map((item) => item.id)).toEqual(['prod-cold-chain-dashboard'])
  })

  it('updateResourcePricingDraft stores draft on resource', () => {
    const catalog = useCatalogStore()
    catalog.updateResourcePricingDraft('res-asset-truck-trajectory', {
      isFree: false,
      salePeriodMonths: 6,
      personalOffer: { enabled: true, originalPrice: 100, discountZhe: 10, price: 100, allowDownload: false }
    })
    expect(catalog.resourceById('res-asset-truck-trajectory')?.pricingDraft?.salePeriodMonths).toBe(6)
  })

  it('internalViews returns only user_view resources for current enterprise', () => {
    const catalog = useCatalogStore()
    const views = catalog.internalViews('ent-wanlian-logistics')
    expect(views.length).toBeGreaterThan(0)
    for (const v of views) {
      expect(v.type).toBe('user_view')
      expect(v.origin).toBe('user_created')
      expect(v.enterpriseId).toBe('ent-wanlian-logistics')
    }
  })

  it('internalViews returns empty for other enterprise', () => {
    const catalog = useCatalogStore()
    const views = catalog.internalViews('ent-other')
    expect(views).toHaveLength(0)
  })

  it('listResource creates a product from a resource', () => {
    const catalog = useCatalogStore()
    const unlistedResource = catalog.resources.find(
      (r) => !catalog.products.some((p) => p.resourceId === r.id) && r.type !== 'user_view'
    )
    expect(unlistedResource).toBeDefined()
    const before = catalog.products.length
    catalog.listResource(unlistedResource!.id, {
      name: unlistedResource!.resourceName,
      subtitle: '测试上架',
      price: { model: 'item_only', itemPrice: 100, unit: '元/次' },
      acquisitions: ['item_purchase'],
      scenarios: ['测试场景'],
      tags: []
    })
    expect(catalog.products.length).toBe(before + 1)
    const created = catalog.products.find((p) => p.resourceId === unlistedResource!.id)
    expect(created).toBeDefined()
    expect(created!.name).toBe(unlistedResource!.resourceName)
    expect(created!.availability).toBe('preparing')
    expect(created!.status).toBe('draft')
    catalog.publishProduct(created!.id)
    expect(created!.availability).toBe('published')
  })

  it('listResource sets dealChannel from api or trusted space vs app payment', () => {
    const catalog = useCatalogStore()
    const form = {
      name: '测试渠道',
      subtitle: '',
      price: { model: 'item_only' as const, itemPrice: 100, unit: '元/次' },
      acquisitions: ['item_purchase' as const],
      scenarios: [],
      tags: []
    }
    const dataset = catalog.listResource('res-asset-truck-trajectory', { ...form, name: '数据集渠道' })
    expect(dataset.dealChannel).toBe('app_payment')
    const api = catalog.listResource('res-asset-warehouse-api', { ...form, name: 'API 渠道' })
    expect(api.dealChannel).toBe('space_purchase')
  })

  it('publishProduct lists a draft and keeps it out of discoverable until published', () => {
    const catalog = useCatalogStore()
    const unlisted = catalog.resources.find(
      (r) => !catalog.products.some((p) => p.resourceId === r.id) && r.type !== 'user_view'
    )!
    const created = catalog.listResource(unlisted.id, {
      name: unlisted.resourceName,
      subtitle: '',
      price: { model: 'item_only', itemPrice: 100, unit: '元/次' },
      acquisitions: ['item_purchase'],
      scenarios: [],
      tags: []
    })
    expect(catalog.discoverable.some((p) => p.id === created.id)).toBe(false)
    catalog.publishProduct(created.id)
    const published = catalog.byId(created.id)!
    expect(published.availability).toBe('published')
    expect(published.status).toBe('published')
    expect(catalog.discoverable.some((p) => p.id === published.id)).toBe(true)
  })

  it('delisting blocks discovery and republication restores it without a pause state', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')!
    catalog.delistProduct(product.id)
    expect(catalog.byId(product.id)?.availability).toBe('delisted')
    expect(catalog.byId(product.id)?.status).toBe('delisted')
    expect(catalog.discoverable.some((p) => p.id === product.id)).toBe(false)
    catalog.publishProduct(product.id)
    expect(catalog.byId(product.id)?.availability).toBe('published')
    expect(catalog.discoverable.some((p) => p.id === product.id)).toBe(true)
  })

  it('delistProduct sets delisted status and publishProduct can relist', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')!
    catalog.delistProduct(product.id)
    expect(catalog.byId(product.id)?.availability).toBe('delisted')
    expect(catalog.byId(product.id)?.status).toBe('delisted')
    expect(catalog.discoverable.some((p) => p.id === product.id)).toBe(false)
    catalog.publishProduct(product.id)
    expect(catalog.byId(product.id)?.availability).toBe('published')
    expect(catalog.discoverable.some((p) => p.id === product.id)).toBe(true)
  })

  it('closes online unpaid orders when a product is delisted, but preserves paid and offline orders', () => {
    const catalog = useCatalogStore()
    const product = catalog.byId('prod-freight-index')!
    const base = { channel: 'app' as const, ownerType: 'enterprise' as const, ownerId: 'ent-1', productId: product.id, productName: product.name, amount: 100, createdAt: '2026-10-09 10:00' }
    useOrderStore().list = [
      { ...base, id: 'online', status: 'pending_payment', paymentMethod: 'enterprise_balance' },
      { ...base, id: 'offline', status: 'pending_payment', paymentMethod: 'enterprise_contract' },
      { ...base, id: 'paid', status: 'paid', paidAt: '2026-10-09 10:01' }
    ] as Order[]
    catalog.delistProduct(product.id)
    expect(useOrderStore().list.find((item) => item.id === 'online')).toMatchObject({ status: 'cancelled', cancelReason: '商品已下架，待支付订单已关闭' })
    expect(useOrderStore().list.find((item) => item.id === 'offline')?.status).toBe('pending_payment')
    expect(useOrderStore().list.find((item) => item.id === 'paid')?.status).toBe('paid')
    catalog.publishProduct(product.id)
    expect(useOrderStore().list.find((item) => item.id === 'online')?.status).toBe('cancelled')
  })

  it('allows manual seller restoration but requires a confirmed source for trusted restoration', () => {
    const catalog = useCatalogStore()
    for (const origin of ['seller_market', 'trusted_space'] as const) {
      const product = catalog.products.find((item) => item.origin === origin)!
      product.availability = 'delisted'
      if (origin === 'trusted_space') expect(() => catalog.publishProduct(product.id)).toThrow('须确认可信源端')
      else {
        catalog.publishProduct(product.id)
        expect(product.lastListingChange).toMatchObject({ mode: 'manual', action: 'publish' })
      }
    }
  })

  it.each(['api', 'dataset'] as const)('preserves manual holds for trusted %s through source delist and restoration', (type) => {
    const catalog = useCatalogStore()
    const trusted = useTrustedSpaceCatalogStore()
    const source = seedTrustedProductSnapshots.find(item => item.type === type)!
    trusted.upsertSnapshot(source)
    const product = catalog.byId(source.appProductId)!
    expect((catalog as any).pauseProduct).toBeUndefined()
    catalog.delistProduct(product.id)
    expect(product.manualDelistedBy).toBe('operator')
    trusted.upsertSnapshot({ ...source, version: source.version + 1, saleStatus: 'paused' })
    expect(product.availability).toBe('delisted')
    expect(() => catalog.publishProduct(product.id)).toThrow('须确认可信源端')
    trusted.upsertSnapshot({ ...source, version: source.version + 2, saleStatus: 'delisted' })
    expect(() => catalog.publishProduct(product.id)).toThrow('须确认可信源端')
    expect(product.availability).toBe('delisted')
    trusted.upsertSnapshot({ ...source, version: source.version + 3, saleStatus: 'published' })
    expect(product.availability).toBe('delisted')
    expect(product.lastListingChange).toMatchObject({ mode: 'manual', action: 'delist' })
    expect(trusted.purchaseCheck(product.id, 'authenticated', 'active')).toEqual({ allowed: false, reason: 'product_not_for_sale' })
    catalog.publishProduct(product.id)
    expect(product.availability).toBe('published')
    expect(product.manualDelistedBy).toBeUndefined()
    trusted.upsertSnapshot({ ...source, version: source.version + 4, saleStatus: 'delisted' })
    expect(product.lastListingChange).toMatchObject({ mode: 'system', action: 'delist' })
    trusted.upsertSnapshot({ ...source, version: source.version + 5, saleStatus: 'published' })
    expect(product.availability).toBe('published')
    expect(product.lastListingChange).toMatchObject({ mode: 'system', action: 'publish' })
  })

  it('does not let a grouped local product change trusted sales state', () => {
    const catalog = useCatalogStore()
    const local = catalog.byId('prod-freight-index')!
    const trusted = catalog.byId('prod-qualification-api')!
    trusted.productGroupId = local.productGroupId
    expect((catalog as any).pauseProduct).toBeUndefined()
    expect(() => catalog.delistProduct(local.id)).toThrow('不同上下架规则')
    expect(local.availability).toBe('published')
    expect(trusted.availability).toBe('published')
    expect((catalog as any).resumeProduct).toBeUndefined()
    local.availability = 'delisted'
    expect(() => catalog.publishProduct(local.id)).toThrow('不同上下架规则')
    expect(local.availability).toBe('delisted')
    expect(trusted.availability).toBe('published')
  })

  it('syncs public use-data datasets as resources without auto-listing products', () => {
    const catalog = useCatalogStore()
    catalog.syncUsePublicDatasets([{
      resourceId: 'res-use-public-city-flow', name: '城市货运公开数据集', isPublic: true, available: true,
      updatedAt: '2026-10-09', fields: [{ name: 'city', dataType: 'string', meaning: '城市', description: '城市名称', primaryKey: true, nullable: false }]
    }])
    const resource = catalog.resourceById('res-use-public-city-flow')
    expect(resource?.sourcePublicDataset).toBe(true)
    expect(resource?.typeDetail.dataset?.qualityUpdatedAt).toBe('2026-10-09')
    expect(catalog.productForResource('res-use-public-city-flow')).toBeUndefined()
    const product = catalog.listResource('res-use-public-city-flow', {
      name: '城市货运公开数据集', subtitle: '公开数据', price: { model: 'member_free' },
      acquisitions: ['member'], scenarios: ['城市货运'], tags: ['公开数据集']
    })
    expect(product.publicDataset).toBe(true)
    expect(product.datasetOffers).toBeUndefined()
    expect(() => catalog.publishProduct(product.id)).toThrow('缺少简介')
    expect(product).toMatchObject({ status: 'draft', availability: 'preparing' })
    resource!.description = '全国城市货运量公开统计'
    catalog.publishProduct(product.id)
    catalog.syncUsePublicDatasets([{ resourceId: 'res-use-public-city-flow', name: '城市货运公开数据集', isPublic: false, available: true, updatedAt: '2026-10-10', fields: [] }])
    expect(product.availability).toBe('delisted')
    expect(catalog.discoverable.some((item) => item.id === product.id)).toBe(false)
    expect(() => catalog.publishProduct(product.id)).toThrow('公开状态已取消')
  })

  it('registers a self-operated dashboard resource with distinct controlled App and PC destinations', () => {
    const catalog = useCatalogStore()
    const resource = catalog.registerSelfDashboardResource({ name: '华东运力看板', boundAssetId: 'bi-east-fleet-001', description: '区域运力与时效', updateCycle: '每日' })
    expect(resource.typeDetail.dashboard).toMatchObject({
      boundAssetId: 'bi-east-fleet-001',
      mobileEntryPath: '/app/bi/dashboard/bi-east-fleet-001',
      pcEntryPath: '/portal/bi/dashboard/bi-east-fleet-001'
    })
    expect(catalog.productForResource(resource.id)).toBeUndefined()
    expect(() => catalog.registerSelfDashboardResource({ name: '重复', boundAssetId: 'bi-east-fleet-001', description: '重复看板', updateCycle: '每日' })).toThrow('看板已登记')
  })

  it('does not offer the removed pause operation for delisted products', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')!
    catalog.delistProduct(product.id)
    expect((catalog as any).pauseProduct).toBeUndefined()
  })

  it('setProfilingFields updates an unlisted dataset without creating a product', () => {
    const catalog = useCatalogStore()
    catalog.setProfilingFields('res-asset-truck-trajectory', ['speed_kmh'])
    const fields = catalog.resourceById('res-asset-truck-trajectory')?.typeDetail.dataset?.fields ?? []
    expect(fields.find((field) => field.name === 'speed_kmh')?.profilingEnabled).toBe(true)
    expect(fields.find((field) => field.name === 'district_code')?.profilingEnabled).toBe(false)
    expect(catalog.productForResource('res-asset-truck-trajectory')).toBeUndefined()
  })

  it('listResource copies dataset schema and profiling flags from the resource', () => {
    const catalog = useCatalogStore()
    catalog.setProfilingFields('res-asset-truck-trajectory', ['speed_kmh', 'district_code'])
    const created = catalog.listResource('res-asset-truck-trajectory', {
      name: '货车轨迹商品草稿',
      subtitle: '',
      price: { model: 'item_only', itemPrice: 100, unit: '元/次' },
      acquisitions: ['item_purchase'],
      scenarios: [],
      tags: []
    })
    const enabled = (created.typeDetail.dataset?.fields ?? [])
      .filter((field) => field.profilingEnabled)
      .map((field) => field.name)
    expect(created.typeDetail.dataset?.fields.map((field) => field.name)).toEqual([
      'plate_no',
      'gps_time',
      'speed_kmh',
      'district_code'
    ])
    expect(enabled).toEqual(['speed_kmh', 'district_code'])
  })

  it('listResource throws for already listed resource', () => {
    const catalog = useCatalogStore()
    const listedResource = catalog.resources.find(
      (r) => catalog.products.some((p) => p.resourceId === r.id)
    )
    expect(listedResource).toBeDefined()
    expect(() =>
      catalog.listResource(listedResource!.id, {
        name: '重复上架',
        subtitle: '',
        price: { model: 'free' },
        acquisitions: ['free'],
        scenarios: [],
        tags: []
      })
    ).toThrow('该资源已有上架商品')
  })

  it('listResource throws for user_view type', () => {
    const catalog = useCatalogStore()
    const userView = catalog.resources.find((r) => r.type === 'user_view')
    expect(userView).toBeDefined()
    expect(() =>
      catalog.listResource(userView!.id, {
        name: '不允许',
        subtitle: '',
        price: { model: 'free' },
        acquisitions: ['free'],
        scenarios: [],
        tags: []
      })
    ).toThrow('用数视图不可上架')
  })

  it('delistProduct sets availability to delisted', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')
    expect(product).toBeDefined()
    catalog.delistProduct(product!.id)
    expect(catalog.byId(product!.id)?.availability).toBe('delisted')
  })

  it('delistProduct is idempotent for nonexistent product', () => {
    const catalog = useCatalogStore()
    expect(() => catalog.delistProduct('nonexistent')).not.toThrow()
  })

  it('searchInternalViews returns matching user views', () => {
    const catalog = useCatalogStore()
    const results = catalog.searchInternalViews('司机')
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.type).toBe('user_view')
      expect(r.resourceName.toLowerCase()).toContain('司机')
    }
  })

  it('searchInternalViews returns empty for no match', () => {
    const catalog = useCatalogStore()
    const results = catalog.searchInternalViews('xyznonexistent')
    expect(results).toHaveLength(0)
  })

  it('filters space datasets by sample and APIs by trial flag', () => {
    const catalog = useCatalogStore()
    const sampled = catalog.search('', { type: 'dataset', hasSampleData: true })
    expect(sampled.every((p) => p.hasSampleData === true)).toBe(true)
    const trialApis = catalog.search('', { type: 'api', hasTrialApi: true })
    expect(trialApis.every((p) => p.hasTrialApi === true)).toBe(true)
  })

  it('filters space products by spaceName and ops-only spaceKind', () => {
    const catalog = useCatalogStore()
    const named = catalog.search('', { spaceName: '万联易达可信空间' })
    expect(named.length).toBeGreaterThan(0)
    expect(named.every((p) => p.spaceName === '万联易达可信空间')).toBe(true)
    const federated = catalog.search('', { spaceKind: 'federated' })
    expect(federated.length).toBeGreaterThan(0)
    expect(federated.every((p) => p.spaceKind === 'federated')).toBe(true)
  })

  it('filters by list venue and ops chips', () => {
    const catalog = useCatalogStore()
    const platform = catalog.search('', { venue: 'platform' })
    expect(platform.length).toBeGreaterThan(0)
    expect(platform.every((p) => !p.spaceName && p.origin !== 'seller_market')).toBe(true)
    const hot = catalog.search('', { ops: '热门' })
    expect(hot.length).toBeGreaterThan(0)
    expect(hot.every((p) => p.recommendSlot || p.tags.includes('热门') || p.tags.includes('热门数据集'))).toBe(true)
  })

  it('finds seller-listed datasets by type and venue', () => {
    const catalog = useCatalogStore()
    const results = catalog.search('', { type: 'dataset', venue: 'seller' })
    expect(results.map((p) => p.id)).toEqual(expect.arrayContaining(['prod-seller-route-board', 'prod-seller-warehouse-board']))
    expect(results.every((p) => p.type === 'dataset' && p.origin === 'seller_market')).toBe(true)
    expect(catalog.search('干线时效', { type: 'dataset' }).some((p) => p.id === 'prod-seller-route-board')).toBe(true)
  })
})
