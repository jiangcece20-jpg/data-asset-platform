import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import PublicDatasetResource from './PublicDatasetResource.vue'
import { useCatalogStore } from '@/stores/catalog'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'
import PortalDatasetDetail from '@/views/portal/components/PortalDatasetDetail.vue'
import DatasetDetail from '@/components/mobile/product-detail/DatasetDetail.vue'

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useCatalogStore()
  const source = publicUseDatasetSample()
  store.syncUsePublicDatasets([source])
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/admin/resources')
  const wrapper = mount(PublicDatasetResource, { props: { resource: store.resourceById(source.resourceId)! }, global: { plugins: [pinia, router] } })
  return { wrapper, store, source }
}

describe('public resource metadata', () => {
  it('shows empty optional fields, fixed provider and read-only metadata time', async () => {
    const { wrapper, source } = await setup()
    for (const label of ['地域范围', '数据粒度', '数据行数', '字段数']) {
      expect((wrapper.get(`[aria-label="${label}"]`).element as HTMLInputElement).value).toBe('')
    }
    expect((wrapper.get('[aria-label="提供方"]').element as HTMLInputElement).value).toBe('万联灵析')
    expect(wrapper.get('[aria-label="提供方"]').attributes()).toHaveProperty('readonly')
    expect((wrapper.get('[aria-label="更新频率"]').element as HTMLInputElement).value).toBe('每天更新')
    expect(wrapper.get('[aria-label="更新频率"]').attributes()).toHaveProperty('readonly')
    expect((wrapper.get('[aria-label="时间范围"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('[aria-label="数据更新时间"]').element as HTMLInputElement).value).toBe(source.updatedAt)
    expect(wrapper.get('[aria-label="数据更新时间"]').attributes()).toHaveProperty('readonly')
  })
  it('publishes current edits directly without a separate save step', async () => {
    const { wrapper, store, source } = await setup()
    await wrapper.get('[aria-label="简介"]').setValue('运营补充简介')
    expect(wrapper.text()).not.toContain('保存资料')
    await wrapper.get('form').trigger('submit')
    const product = store.productForResource(source.resourceId)!
    expect(product.description).toBe('运营补充简介')
    store.syncUsePublicDatasets([{ ...source, description: '新的源端简介' }])
    expect(store.resourceById(source.resourceId)?.description).toBe('运营补充简介')
    store.syncUsePublicDatasets([{ ...source, name: '新的元数据名称' }])
    await wrapper.vm.$nextTick()
    expect(store.resourceById(source.resourceId)?.resourceName).toBe('新的元数据名称')
  })
  it('keeps all overview positions empty rather than adding placeholders on PC and App', async () => {
    const { store, source } = await setup()
    const product = store.generatePublicDatasetProduct(source.resourceId)
    const pc = mount(PortalDatasetDetail, { props: { product, activeTab: 'basic' } })
    const mobile = mount(DatasetDetail, { props: { product, activeTab: 'basic' } })
    expect(pc.get('[data-testid="dataset-overview-metrics"]').text()).not.toContain('—')
    expect(mobile.get('[data-testid="dataset-overview-metrics"]').text()).not.toContain('—')
    expect(mobile.findAll('.info-grid__cell')).toHaveLength(4)
    expect(mobile.findAll('.info-grid__value').map(el => el.text())).toEqual(['', '', '', ''])
  })
  it('defaults the product name, truncates long edits and keeps it separate across syncs', async () => {
    const { wrapper, store, source } = await setup()
    const input = wrapper.get('[aria-label="商品名称"]')
    expect((input.element as HTMLInputElement).value).toBe(source.name)
    await input.setValue('名称'.repeat(30))
    await wrapper.vm.$nextTick()
    expect((input.element as HTMLInputElement).value).toBe('名称'.repeat(25))
    await wrapper.get('form').trigger('submit')
    const product = store.productForResource(source.resourceId)!
    expect(product.name).toBe('名称'.repeat(25))
    expect(store.resourceById(source.resourceId)?.resourceName).toBe(source.name)
    store.syncUsePublicDatasets([{ ...source, name: '新的资源名' }])
    expect(product.name).toBe('名称'.repeat(25))
    expect(store.resourceById(source.resourceId)?.resourceName).toBe('新的资源名')
  })
})
