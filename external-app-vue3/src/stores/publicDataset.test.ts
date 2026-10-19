import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from './catalog'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'
import { buyDataTypeFilterOptions } from '@/domain/myCenter'
import { publicDatasetDisplay, publicDatasetIssues, publicDatasetRestoreIssues } from '@/domain/publicDataset'
import type { Resource } from '@/types/resource'
import { datasetOverviewMetrics } from '@/domain/datasetMetrics'
import { datasetResourceInfoFields } from '@/domain/productDetailFields'

describe('public dataset direct publication', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('syncs only a resource, then publishes exactly one member-free product', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    expect(store.productForResource(source.resourceId)).toBeUndefined()
    const product = store.generatePublicDatasetProduct(source.resourceId)
    expect(product).toMatchObject({
      availability: 'published', publicDataset: true, price: { model: 'member_free' },
      name: source.name, provider: '万联灵析', updateFrequency: '每天更新'
    })
    expect(product.typeDetail.dataset?.sampleRows[0]).toEqual({ city: '北京', volume: 128 })
    expect(product.datasetOffers).toBeUndefined()
    expect(store.generatePublicDatasetProduct(source.resourceId).id).toBe(product.id)
    expect(store.products.filter(p => p.resourceId === source.resourceId)).toHaveLength(1)
  })
  it('keeps public resource pricing immutable in drafts, edits and later syncs', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    expect(() => store.updateResourcePricingDraft(source.resourceId, { isFree: false })).toThrow('公开数据集固定为会员免费')
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.updateProduct(product.id, {
      price: { model: 'item_only', itemPrice: 99 }, acquisitions: ['item_purchase'], memberIncluded: false
    })
    expect(store.byId(product.id)).toMatchObject({ price: { model: 'member_free' }, acquisitions: ['member'], memberIncluded: true })
    store.syncUsePublicDatasets([{ ...source, updatedAt: '2026-10-13' }])
    expect(store.byId(product.id)).toMatchObject({ price: { model: 'member_free' }, acquisitions: ['member'] })
  })
  it('lists missing metadata without creating a draft or partial product', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([{ ...source, description: '', metadata: undefined, fields: [] }])
    expect(() => store.generatePublicDatasetProduct(source.resourceId)).toThrow('缺少简介')
    expect(() => store.generatePublicDatasetProduct(source.resourceId)).toThrow('字段信息不完整')
    expect(store.productForResource(source.resourceId)).toBeUndefined()
  })
  it('refreshes source metadata and preserves operational settings', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.updateEnhancement(product.id, { tags: ['精选'], sortWeight: 88, recommendSlot: true })
    store.syncUsePublicDatasets([{ ...source, name: '新的源端名称', description: '新的简介', fields: source.fields.slice(0, 1), detail: { ...source.detail, rowCount: 8, fieldCount: 1 } }])
    expect(store.byId(product.id)).toMatchObject({ name: '新的源端名称', description: '新的简介', tags: ['精选'], sortWeight: 88, recommendSlot: true })
    expect(store.byId(product.id)?.typeDetail.dataset?.fields).toHaveLength(1)
    expect(store.byId(product.id)?.typeDetail.dataset?.rowCount).toBeUndefined()
  })
  it.each([{ isPublic: false, available: true }, { isPublic: true, available: false }])('delists and restores original product for %o', (state) => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const id = store.generatePublicDatasetProduct(source.resourceId).id
    store.syncUsePublicDatasets([{ ...source, ...state }])
    expect(store.byId(id)?.availability).toBe('delisted')
    store.syncUsePublicDatasets([source])
    expect(store.productForResource(source.resourceId)).toMatchObject({ id, availability: 'published' })
    expect(store.resourceById(source.resourceId)?.publicStateHistory?.map(h => h.state)).toEqual(['published', 'delisted', 'published'])
  })
  it('preserves last successful content and state on sync failure and clears error on retry', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const id = store.generatePublicDatasetProduct(source.resourceId).id
    const before = JSON.stringify(store.byId(id))
    store.recordPublicDatasetSyncFailure(source.resourceId, '超时')
    expect(JSON.stringify(store.byId(id))).toBe(before)
    expect(store.resourceById(source.resourceId)?.publicSyncError).toBe('超时')
    store.syncUsePublicDatasets([source])
    expect(store.resourceById(source.resourceId)?.publicSyncError).toBeUndefined()
  })
  it.each([{ isPublic: false, available: true }, { isPublic: true, available: false }])('keeps manual delisting through source changes %o until manual restore', (state) => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.delistProduct(product.id)
    store.syncUsePublicDatasets([source])
    expect(product.availability).toBe('delisted')
    store.syncUsePublicDatasets([{ ...source, ...state }])
    expect(() => store.publishProduct(product.id)).toThrow()
    store.syncUsePublicDatasets([source])
    expect(product).toMatchObject({ availability: 'delisted', status: 'delisted' })
    expect(store.discoverable).not.toContain(product)
    store.publishProduct(product.id)
    expect(product).toMatchObject({ availability: 'published', status: 'published' })
    expect(store.resourceById(source.resourceId)?.publicStateHistory?.map(h => h.reason)).toEqual([
      '运营确认生成并上架', '运营手动下架', '运营手动恢复上架'
    ])
    store.syncUsePublicDatasets([{ ...source, ...state }])
    store.syncUsePublicDatasets([source])
    expect(product.availability).toBe('published')
  })
  it.each([{ isPublic: false, available: true }, { isPublic: true, available: false }])('blocks manual restore while the source is ineligible %o', (state) => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.delistProduct(product.id)
    store.syncUsePublicDatasets([{ ...source, ...state }])
    expect(() => store.publishProduct(product.id)).toThrow()
    expect(product).toMatchObject({ availability: 'delisted', status: 'delisted' })
  })
  it('never publishes drafts or infers source restoration from an unexplained delisted state', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.listResource(source.resourceId, {
      name: source.name, subtitle: '', price: { model: 'member_free' }, acquisitions: ['member'], scenarios: [], tags: []
    })
    store.syncUsePublicDatasets([{ ...source, available: false }])
    store.syncUsePublicDatasets([source])
    expect(product).toMatchObject({ availability: 'preparing', status: 'draft' })
    product.availability = 'delisted'
    product.status = 'delisted'
    store.syncUsePublicDatasets([source])
    expect(product.availability).toBe('delisted')
  })
  it('requires a successful sync retry and explicit manual restore after a sync failure', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    const resource = store.resourceById(source.resourceId)!
    store.delistProduct(product.id)
    store.recordPublicDatasetSyncFailure(source.resourceId, '连接超时')
    const history = JSON.stringify(resource.publicStateHistory)

    expect(publicDatasetRestoreIssues(resource)).toContain('同步失败，请重试')
    expect(() => store.publishProduct(product.id)).toThrow('同步失败，请重试')
    expect(resource.publicDelistReason).toBe('manual')
    expect(product).toMatchObject({ availability: 'delisted', status: 'delisted' })
    expect(JSON.stringify(resource.publicStateHistory)).toBe(history)

    store.syncUsePublicDatasets([source])
    expect(resource.publicSyncError).toBeUndefined()
    expect(resource.publicDelistReason).toBe('manual')
    expect(product).toMatchObject({ availability: 'delisted', status: 'delisted' })
    expect(JSON.stringify(resource.publicStateHistory)).toBe(history)
    store.publishProduct(product.id)
    expect(resource.publicDelistReason).toBeUndefined()
    expect(product).toMatchObject({ availability: 'published', status: 'published' })
  })
  const incompleteMetadata: Array<[string, (resource: Resource) => void]> = [
    ['缺少名称', resource => { resource.resourceName = '' }],
    ['缺少商品名称', resource => { resource.productNameDraft = '' }],
    ['缺少简介', resource => { resource.description = '' }],
    ['缺少数据更新时间', resource => { resource.typeDetail.dataset!.qualityUpdatedAt = '' }],
    ['字段信息不完整', resource => { resource.typeDetail.dataset!.fields = [] }],
    ['字段信息不完整', resource => { resource.typeDetail.dataset!.fields[0].dataType = '' }]
  ]
  it.each(incompleteMetadata)('blocks direct manual restore with %s and preserves the manual hold', (issue, invalidate) => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    const resource = store.resourceById(source.resourceId)!
    store.delistProduct(product.id)
    invalidate(resource)

    expect(publicDatasetRestoreIssues(resource)).toContain(issue)
    expect(() => store.publishProduct(product.id)).toThrow(issue)
    expect(resource.publicDelistReason).toBe('manual')
    expect(product).toMatchObject({ availability: 'delisted', status: 'delisted' })
    expect(resource.publicStateHistory).toHaveLength(2)
  })
  it('uses the confirmed order type labels on both clients', () => {
    expect(buyDataTypeFilterOptions.map(o => o.label)).toEqual(['全部类型', '数据集', 'API服务', '行业报告', '自有看板'])
  })
  it('defaults provider and empty summaries independently of upstream values, without blocking publication', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([{ ...source, metadata: { ...source.metadata!, provider: '其他提供方' } }])
    const resource = store.resourceById(source.resourceId)!
    expect(resource.publicDatasetMetadata).toMatchObject({ provider: '万联灵析', coverage: '', updateFrequency: '每天更新' })
    expect(resource.typeDetail.dataset).toMatchObject({ granularity: '', timeRange: '', fieldCount: null, qualityUpdatedAt: source.updatedAt })
    expect(resource.typeDetail.dataset?.rowCount).toBeUndefined()
    expect(publicDatasetIssues(resource)).toEqual([])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    expect(datasetOverviewMetrics(product.typeDetail.dataset).filter(i => i.label !== '时间范围').map(i => i.value)).toEqual(['', '', ''])
    expect(datasetResourceInfoFields(product).find(i => i.label === '地域范围')?.value).toBe('')
    expect(datasetResourceInfoFields(product).find(i => i.label === '数据更新时间')?.value).toBe(source.updatedAt)
  })
  it('retains manual supplements while refreshing untouched metadata, fields and data time', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const resource = store.resourceById(source.resourceId)!
    store.updatePublicDatasetDetails(source.resourceId, { ...publicDatasetDisplay(resource), description: '人工简介', coverage: '华东', rowCount: 16, fieldCount: 3 })
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.syncUsePublicDatasets([{ ...source, name: '元数据新名称', description: '源端新简介', updatedAt: '2026-10-12', fields: source.fields.slice(0, 1) }])
    expect(product).toMatchObject({ name: '元数据新名称', description: '人工简介', coverage: '华东' })
    expect(product.typeDetail.dataset).toMatchObject({ rowCount: 16, fieldCount: 3, qualityUpdatedAt: '2026-10-12' })
    expect(product.typeDetail.dataset?.fields).toHaveLength(1)
    store.updatePublicDatasetDetails(source.resourceId, { ...publicDatasetDisplay(resource), coverage: '', rowCount: undefined, fieldCount: null })
    store.syncUsePublicDatasets([source])
    expect(product.coverage).toBe('')
    expect(product.typeDetail.dataset?.rowCount).toBeUndefined()
    expect(product.typeDetail.dataset?.fieldCount).toBeNull()
  })
  it('does not replace a missing metadata timestamp with the sync time', () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([{ ...source, updatedAt: '' }])
    expect(store.resourceById(source.resourceId)?.lastSyncedAt).toBeTruthy()
    expect(() => store.generatePublicDatasetProduct(source.resourceId)).toThrow('缺少数据更新时间')
  })
  it('truncates a default product name without shortening the resource, and rejects an empty edited name', () => {
    const store = useCatalogStore()
    const source = { ...publicUseDatasetSample(), name: '公开数据集'.repeat(15) }
    store.syncUsePublicDatasets([source])
    const resource = store.resourceById(source.resourceId)!
    expect(publicDatasetDisplay(resource).productName).toBe('公开数据集'.repeat(10))
    expect(resource.resourceName).toBe(source.name)
    expect(() => store.updatePublicDatasetDetails(source.resourceId, { ...publicDatasetDisplay(resource), productName: '' })).toThrow('请填写商品名称')
    expect(store.generatePublicDatasetProduct(resource.id).name).toBe('公开数据集'.repeat(10))
  })
})
