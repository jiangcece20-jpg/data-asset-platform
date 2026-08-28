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
      { path: '/app/space-bridge/:id', name: 'space-bridge', component: { template: '<div />' } },
      { path: '/app/checkout/item/:id', name: 'checkout-item', component: { template: '<div />' } },
      { path: '/app/checkout/dataset/:id', name: 'checkout-dataset', component: { template: '<div />' } },
      { path: '/app/checkout/member', name: 'checkout-member', component: { template: '<div />' } }
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
    expect(primary.text()).toBe('提交试用申请')
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
    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('万联易达可信空间')
    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('有样例')
    expect(wrapper.get('[data-testid="product-chips"]').text()).not.toContain('自有')
    expect(wrapper.get('[data-testid="product-chips"]').text()).not.toContain('可信空间购买')
  })

  it('shows the space dataset sync material wall like space APIs', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-space-port-throughput')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('提交试用申请')
    expect(wrapper.get('[data-testid="trusted-space-purchase-eligibility"]').text()).toContain('提交试用申请')
    expect(wrapper.get('[data-testid="detail-provider"]').text()).toContain('提供方信息')
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).toContain('合法合规声明')
    expect(wrapper.get('[data-testid="space-billing-rules"]').text()).toContain('计费规则')
    expect(wrapper.text()).toContain('来自可信空间')
    expect(wrapper.text()).toContain('覆盖某省主要港口的集装箱与货物吞吐量指标')
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

  it('opens a report preview tab and shows uploaded app preview images', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const product = useCatalogStore().byId('prod-logistics-monthly')
    if (product?.typeDetail.report) {
      product.typeDetail.report.previewImages = { app: [png], pc: [] }
    }

    const { wrapper } = await mountProductDetail('/app/product/prod-logistics-monthly')

    await wrapper.get('button[data-tab="preview"]').trigger('click')
    expect(wrapper.get('button[data-tab="preview"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="report-preview-slide-app-0"]').exists()).toBe(true)
  })

  it('opens a report in online reading with a visible report preview', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-logistics-monthly')

    await wrapper.get('button[data-tab="reader"]').trigger('click')
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

  it('shows dual-path actions on the detail page for member-eligible products', async () => {
    useEntitlementStore().list = []

    const free = await mountProductDetail('/app/product/prod-freight-index')
    expect(free.wrapper.get('[data-testid="product-price-summary"]').text()).toContain('¥199')
    expect(free.wrapper.get('[data-testid="product-price-summary"]').text()).toContain('会员免费')
    expect(free.wrapper.find('[data-testid="product-primary-action"]').exists()).toBe(false)
    expect(free.wrapper.get('[data-testid="product-dual-path"]').exists()).toBe(true)
    expect(free.wrapper.get('[data-testid="product-direct-purchase"]').text()).toContain('直接购买')
    expect(free.wrapper.get('[data-testid="product-become-member"]').text()).toContain('成为个人会员')
    expect(free.wrapper.get('[data-testid="product-member-savings"]').text()).toContain('立省')
    await free.wrapper.get('[data-testid="product-direct-purchase"]').trigger('click')
    await flushPromises()
    expect(free.router.currentRoute.value.path).toBe('/app/checkout/item/prod-freight-index')
    expect(free.router.currentRoute.value.query.skipDual).toBe('1')

    const discount = await mountProductDetail('/app/product/prod-logistics-monthly')
    expect(discount.wrapper.find('[data-testid="product-primary-action"]').exists()).toBe(false)
    expect(discount.wrapper.get('[data-testid="product-dual-path"]').exists()).toBe(true)
    await discount.wrapper.get('[data-testid="product-become-member"]').trigger('click')
    await flushPromises()
    expect(discount.router.currentRoute.value.path).toBe('/app/checkout/member')
  })
})

describe('ProductDetail seller dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('uses the dataset detail tabs and platform-collect checkout', async () => {
    const { wrapper, router } = await mountProductDetail('/app/product/prod-seller-route-board')

    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('数据集')
    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('陈静')
    expect(wrapper.get('button[data-tab="basic"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('线路 × 日')
    expect(wrapper.find('[data-testid="selling-shot-gallery"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('结算方式')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('购买数据集')

    await wrapper.get('button[data-tab="samples"]').trigger('click')
    expect(wrapper.text()).toContain('SH-NJ-01')

    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(router.currentRoute.value.path).toBe('/app/checkout/item/prod-seller-route-board')
  })
})
