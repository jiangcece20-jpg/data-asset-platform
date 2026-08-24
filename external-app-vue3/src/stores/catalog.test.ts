import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'

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

  it('pauseProduct blocks discoverable and resumeProduct restores it', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')!
    catalog.pauseProduct(product.id)
    expect(catalog.byId(product.id)?.availability).toBe('paused')
    expect(catalog.byId(product.id)?.status).toBe('published')
    expect(catalog.discoverable.some((p) => p.id === product.id)).toBe(false)
    catalog.resumeProduct(product.id)
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

  it('pauseProduct throws unless the product is published', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')!
    catalog.delistProduct(product.id)
    expect(() => catalog.pauseProduct(product.id)).toThrow('仅已上架商品可暂停新购')
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
})
