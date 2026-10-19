import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import ResourceCenter from './ResourceCenter.vue'
import { useCatalogStore } from '@/stores/catalog'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'

async function mountCenter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/resources', component: ResourceCenter },
      { path: '/admin/resources/:id', component: { template: '<div />' } }
    ]
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push('/admin/resources')
  await router.isReady()
  return mount(ResourceCenter, { global: { plugins: [router, pinia] } })
}

describe('ResourceCenter listing entry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('filters by actual last listing mode, combines status, and ignores it in the resources tab', async () => {
    const wrapper = await mountCenter()
    const catalog = useCatalogStore()
    const product = catalog.byId('prod-freight-index')!
    catalog.delistProduct(product.id)
    const filter = wrapper.get('[aria-label="上下架方式"]')
    await filter.setValue('manual')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('人工下架')
    expect(wrapper.text()).toContain('仅可人工恢复')
    await wrapper.get('[aria-label="前台状态"]').setValue('published')
    expect(wrapper.text()).toContain('暂无符合条件的记录')
    catalog.publishProduct(product.id)
    await filter.setValue('manual')
    expect(wrapper.text()).toContain('人工上架')
    await filter.setValue('system')
    expect(wrapper.text()).toContain('暂无符合条件的记录')
    product.lastListingChange = { mode: 'system', action: 'publish', at: '2026-10-13' }
    await filter.setValue('system')
    expect(wrapper.text()).toContain('系统上架')
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    expect(wrapper.find('[aria-label="上下架方式"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('货车轨迹明细数据集')
    wrapper.unmount()
  })

  it('only offers edit and does not show packaging modal or list delist', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.text()).toContain('编辑')
    expect(wrapper.text()).not.toContain('包装为商品')
    const delistButtons = wrapper.findAll('button').filter((btn) => btn.text() === '下架')
    expect(delistButtons).toHaveLength(0)
  })

  it('defaults to the products tab and hides unlisted resources', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.get('[data-testid="resource-center-tab-products"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('自营产品')
    expect(wrapper.text()).not.toContain('APP内容')
    expect(wrapper.text()).not.toContain('未上架')
    expect(wrapper.text()).not.toContain('货车轨迹明细数据集')
  })

  it('shows unlisted resources on the resources tab', async () => {
    const wrapper = await mountCenter()
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    expect(wrapper.get('[data-testid="resource-center-tab-resources"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('未上架')
    expect(wrapper.text()).toContain('货车轨迹明细数据集')
  })

  it('filters the products tab by frontend state without affecting the resources tab', async () => {
    const wrapper = await mountCenter()
    const store = useCatalogStore()
    const products = store.products.filter(product => store.resourceById(product.resourceId) && product.origin !== 'seller_market').slice(0, 4)
    expect(products).toHaveLength(4)
    for (const [index, availability] of (['preparing', 'published', 'paused', 'delisted'] as const).entries()) {
      products[index]!.availability = availability
    }

    const filter = wrapper.get('[aria-label="前台状态"]')
    expect(filter.findAll('option').map(option => option.text())).toEqual(['全部状态', '草稿', '已上架', '已下架'])
    expect(filter.findAll('option').some(option => option.text() === '未上架')).toBe(false)
    for (const [value, label] of [['draft', '草稿'], ['published', '已上架'], ['delisted', '已下架']]) {
      await filter.setValue(value)
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every(row => row.findAll('td')[6]?.text() === label)).toBe(true)
    }

    await filter.setValue('delisted')
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    expect(wrapper.find('[aria-label="前台状态"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('货车轨迹明细数据集')
    await wrapper.get('[data-testid="resource-center-tab-products"]').trigger('click')
    expect((wrapper.get('[aria-label="前台状态"]').element as HTMLSelectElement).value).toBe('delisted')
    await wrapper.get('input[placeholder="搜索资源名称或商品名称"]').setValue('不存在的商品')
    expect(wrapper.text()).toContain('暂无符合条件的记录')
  })

  it('shows automatically synced resources without registration or manual sync buttons', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.find('[data-testid="sync-public-datasets"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="register-dashboard"]').exists()).toBe(false)
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    expect(wrapper.get('[data-testid="resource-center-tab-resources"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('城市货运公开数据集')
  })

  it('sends public datasets to the common edit entry instead of direct publish', async () => {
    const wrapper = await mountCenter()
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    await wrapper.get('[aria-label="仅看公开数据集"]').setValue(true)

    expect(wrapper.find('[data-testid="public-publish-entry"]').exists()).toBe(false)
    expect(wrapper.findAll('button').filter((button) => button.text() === '编辑')).toHaveLength(1)
  })

  it('exposes only self-operated and trusted sources and excludes seller goods on both tabs', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.findAll('[aria-label="来源"] option').map(o => o.text())).toEqual(['全部来源', '自营产品', '可信空间'])
    const store = useCatalogStore()
    for (const tab of ['products', 'resources']) {
      await wrapper.get(`[data-testid="resource-center-tab-${tab}"]`).trigger('click')
      for (const resource of store.resources.filter(r => r.origin === 'seller_market')) expect(wrapper.text()).not.toContain(resource.resourceName)
      expect(wrapper.text()).not.toContain('资产平台')
      expect(wrapper.text()).not.toContain('用户创建')
    }
  })
  it('orders columns consistently and leaves an uncreated product name blank', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.findAll('th').slice(0, 4).map(h => h.text())).toEqual(['商品名称', '资源名称', '类型', '来源'])
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    await wrapper.get('[aria-label="仅看公开数据集"]').setValue(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    const cells = wrapper.findAll('tbody tr')[0]!.findAll('td')
    expect(cells[0]!.text()).toBe('')
    expect(cells[1]!.text()).toBe('城市货运公开数据集')
  })
  it('combines source, public flag, type and name filters without resetting conflicting filters', async () => {
    const wrapper = await mountCenter()
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    await wrapper.get('[aria-label="仅看公开数据集"]').setValue(true)
    await wrapper.get('[aria-label="来源"]').setValue('trusted_space')
    expect(wrapper.text()).toContain('暂无符合条件的记录')
    await wrapper.get('[aria-label="来源"]').setValue('app_content')
    expect(wrapper.text()).toContain('城市货运公开数据集')
    await wrapper.get('input[placeholder="搜索资源名称或商品名称"]').setValue('不存在')
    expect(wrapper.text()).toContain('暂无符合条件的记录')
    await wrapper.get('input[placeholder="搜索资源名称或商品名称"]').setValue('城市货运')
    await wrapper.findAll('button').find(b => b.text() === 'API')!.trigger('click')
    expect(wrapper.text()).toContain('暂无符合条件的记录')
    expect((wrapper.get('[aria-label="仅看公开数据集"]').element as HTMLInputElement).checked).toBe(true)
  })
  it('uses source public state on both tabs, retains failed sync state and excludes canceled public products', async () => {
    const wrapper = await mountCenter()
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    store.generatePublicDatasetProduct(source.resourceId)
    await wrapper.get('[data-testid="resource-center-tab-products"]').trigger('click')
    await wrapper.get('input[placeholder="搜索资源名称或商品名称"]').setValue('城市货运公开数据集')
    await wrapper.get('[aria-label="仅看公开数据集"]').setValue(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    store.syncUsePublicDatasets([{ ...source, available: false }])
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('城市货运公开数据集')
    store.recordPublicDatasetSyncFailure(source.resourceId, '超时')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('城市货运公开数据集')
    store.syncUsePublicDatasets([{ ...source, isPublic: false }])
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无符合条件的记录')
    await wrapper.get('[aria-label="仅看公开数据集"]').setValue(false)
    expect(wrapper.text()).toContain('城市货运公开数据集')
  })
})
