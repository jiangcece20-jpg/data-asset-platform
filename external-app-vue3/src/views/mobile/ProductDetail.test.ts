import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import ProductDetail from './ProductDetail.vue'

async function mountProductDetail(path = '/app/product/prod-qualification-api') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/product/:id', name: 'product-detail', component: ProductDetail },
      { path: '/app/space-intent/:id', name: 'space-intent', component: { template: '<div />' } },
      { path: '/app/space-bridge/:id', name: 'space-bridge', component: { template: '<div />' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ProductDetail, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('ProductDetail trusted-space intent', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('shows submit-intent as the primary action for personal users', async () => {
    const { wrapper } = await mountProductDetail()
    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('提交意向单')
    expect(wrapper.text()).not.toContain('前往可信空间购买')
    expect(wrapper.text()).not.toContain('个人身份不能下单')
  })

  it('does not push space-bridge from product detail', async () => {
    const { wrapper, router } = await mountProductDetail()
    await wrapper.find('button.w-full').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('space-intent')
    expect(router.currentRoute.value.path).toBe('/app/space-intent/prod-qualification-api')
    expect(router.currentRoute.value.name).not.toBe('space-bridge')
  })

  it('shows owned space chips without 自有', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-enterprise-activity')
    expect(wrapper.get('[data-testid="public-space-chips"]').text()).toContain('万联易达可信空间')
    expect(wrapper.get('[data-testid="public-space-chips"]').text()).toContain('有样例')
    expect(wrapper.get('[data-testid="public-space-chips"]').text()).not.toContain('自有')
  })
})

describe('ProductDetail dashboard overview', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['prod-truck-trajectory', 'basic'],
    ['prod-qualification-api', 'basic']
  ])('opens %s in basic information', async (productId, tab) => {
    const { wrapper } = await mountProductDetail(`/app/product/${productId}`)

    expect(wrapper.get(`[role="tab"][data-tab="${tab}"]`).attributes('aria-selected')).toBe('true')
  })
  it('opens with dashboard data before pricing, while keeping overview information aligned', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-freight-index')
    const preview = wrapper.get('[data-testid="content-first-preview"]')
    const pricing = wrapper.get('[data-testid="pricing-method"]')

    expect(wrapper.get('button[data-tab="preview"]').attributes('aria-selected')).toBe('true')
    expect(preview.text()).toContain('108.6')
    expect(
      preview.element.compareDocumentPosition(pricing.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    await wrapper.get('button[data-tab="overview"]').trigger('click')
    const basic = wrapper.get('[data-testid="product-basic-info"]')
    const dashboard = wrapper.get('[data-testid="dashboard-overview-info"]')
    const manual = wrapper.get('[data-testid="product-manual"]')

    // 概览页顺序：看板关键指标 → 资源信息 → 商品说明书
    expect(
      dashboard.element.compareDocumentPosition(basic.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      basic.element.compareDocumentPosition(manual.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(dashboard.text()).toContain('看板信息')
    expect(dashboard.text()).toContain('导出规则')
  })

  it('opens a report in online reading with a visible report preview', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-logistics-monthly')

    expect(wrapper.get('button[data-tab="reader"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="content-first-preview"]').text()).toContain('行业运行总览')
    expect(wrapper.text()).toContain('2026年6月，全国公路物流运行总体平稳')
  })

  it('shows every metric definition before purchase without an unlock gate', async () => {
    const product = useCatalogStore().byId('prod-freight-index')
    if (product?.typeDetail.dashboard) product.typeDetail.dashboard.metrics[0].preview = 'locked'
    const { wrapper } = await mountProductDetail('/app/product/prod-freight-index')

    await wrapper.get('button[data-tab="metrics"]').trigger('click')

    expect(wrapper.text()).toContain('基于平台真实交易样本计算的综合性运价指数')
    expect(wrapper.text()).toContain('指标描述')
    expect(wrapper.text()).not.toContain('解锁后查看关键内容')
    expect(wrapper.text()).not.toContain('解锁后可阅读完整内容')
  })

  it('offers dual purchase paths for member-free and member-discount products', async () => {
    useEntitlementStore().list = []

    const free = await mountProductDetail('/app/product/prod-freight-index')
    expect(free.wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通个人会员，免费看本商品')
    expect(free.wrapper.get('[data-testid="product-secondary-action"]').text()).toBe('单品购买 ¥199')

    const discount = await mountProductDetail('/app/product/prod-logistics-monthly')
    expect(discount.wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通个人会员，享6折')
    expect(discount.wrapper.get('[data-testid="product-secondary-action"]').text()).toBe('原价购买 ¥199')
  })
})
