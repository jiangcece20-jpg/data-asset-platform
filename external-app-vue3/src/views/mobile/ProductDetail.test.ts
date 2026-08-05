import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import ProductDetail from './ProductDetail.vue'

async function mountProductDetail(path = '/app/product/prod-qualification-api') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/product/:id', name: 'product-detail', component: ProductDetail }]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ProductDetail, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('ProductDetail trusted-space purchase guard', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('explains the personal-user restriction and provides an enterprise-auth action', async () => {
    const wrapper = await mountProductDetail()

    const eligibility = wrapper.get('[data-testid="trusted-space-purchase-eligibility"]')
    expect(eligibility.text()).toContain('当前为个人身份')
    expect(eligibility.text()).toContain('个人身份不能下单')

    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('去企业认证')
    expect(primary.attributes('disabled')).toBeUndefined()
  })

  it('shows a pending explanation and blocks purchase during enterprise review', async () => {
    useUserStore().startEnterpriseAuth()
    const wrapper = await mountProductDetail()

    const eligibility = wrapper.get('[data-testid="trusted-space-purchase-eligibility"]')
    expect(eligibility.text()).toContain('企业认证审核中')
    expect(eligibility.text()).toContain('审核期间可以继续浏览和收藏')

    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('企业认证审核中')
    expect(primary.attributes('disabled')).toBeDefined()
  })

  it('unlocks trusted-space purchase only after the adapter returns an active binding', async () => {
    useUserStore().completeEnterpriseAuth()
    const wrapper = await mountProductDetail()
    const trustedCatalog = useTrustedSpaceCatalogStore()
    trustedCatalog.snapshots = seedTrustedProductSnapshots.map((snapshot) => ({
      ...snapshot,
      syncedAt: new Date().toISOString(),
      syncState: 'current' as const
    }))
    await nextTick()

    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('前往可信空间购买')
    expect(primary.attributes('disabled')).toBeUndefined()
  })

  it('keeps purchase closed when an active binding belongs to another enterprise', async () => {
    vi.spyOn(trustedSpaceAdapter, 'ensureEnterpriseBinding').mockResolvedValue({
      appEnterpriseId: 'ent-another-enterprise',
      spaceEnterpriseId: 'space-ent-another',
      status: 'active'
    })
    useUserStore().completeEnterpriseAuth()
    const wrapper = await mountProductDetail()
    const trustedCatalog = useTrustedSpaceCatalogStore()
    trustedCatalog.snapshots = seedTrustedProductSnapshots.map((snapshot) => ({
      ...snapshot,
      syncedAt: new Date().toISOString(),
      syncState: 'current' as const
    }))
    await nextTick()

    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('企业信息同步中')
    expect(primary.attributes('disabled')).toBeDefined()
  })

  it('discards a late binding from an earlier authentication generation', async () => {
    let signalBindingStarted: (() => void) | undefined
    const bindingStarted = new Promise<void>((resolve) => { signalBindingStarted = resolve })
    let releaseBinding: ((binding: {
      appEnterpriseId: string
      spaceEnterpriseId: string
      status: 'active'
    }) => void) | undefined
    vi.spyOn(trustedSpaceAdapter, 'ensureEnterpriseBinding').mockImplementation(
      () => {
        signalBindingStarted!()
        return new Promise((resolve) => { releaseBinding = resolve })
      }
    )
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const mounting = mountProductDetail()
    await bindingStarted
    user.clearEnterpriseContext()
    user.completeEnterpriseAuth()
    releaseBinding!({
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      status: 'active'
    })
    const wrapper = await mounting
    await flushPromises()

    expect(useTrustedSpacePurchaseStore().bindings).toEqual([])
    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('企业信息同步中')
    expect(primary.attributes('disabled')).toBeDefined()
  })
})

describe('ProductDetail dashboard overview', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['prod-truck-trajectory', 'basic'],
    ['prod-qualification-api', 'basic']
  ])('opens %s in basic information', async (productId, tab) => {
    const wrapper = await mountProductDetail(`/app/product/${productId}`)

    expect(wrapper.get(`[role="tab"][data-tab="${tab}"]`).attributes('aria-selected')).toBe('true')
  })
  it('opens with dashboard data before pricing, while keeping overview information aligned', async () => {
    const wrapper = await mountProductDetail('/app/product/prod-freight-index')
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

    expect(basic.element.contains(dashboard.element)).toBe(true)
    expect(
      dashboard.element.compareDocumentPosition(manual.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(dashboard.text()).toContain('看板信息')
    expect(dashboard.text()).toContain('导出规则')
  })

  it('opens a report in online reading with a visible report preview', async () => {
    const wrapper = await mountProductDetail('/app/product/prod-logistics-monthly')

    expect(wrapper.get('button[data-tab="reader"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="content-first-preview"]').text()).toContain('行业运行总览')
    expect(wrapper.text()).toContain('2026年6月，全国公路物流运行总体平稳')
  })

  it('shows every metric definition before purchase without an unlock gate', async () => {
    const product = useCatalogStore().byId('prod-freight-index')
    if (product?.typeDetail.dashboard) product.typeDetail.dashboard.metrics[0].preview = 'locked'
    const wrapper = await mountProductDetail('/app/product/prod-freight-index')

    await wrapper.get('button[data-tab="metrics"]').trigger('click')

    expect(wrapper.text()).toContain('基于平台真实交易样本计算的综合性运价指数')
    expect(wrapper.text()).toContain('指标描述')
    expect(wrapper.text()).not.toContain('解锁后查看关键内容')
    expect(wrapper.text()).not.toContain('解锁后可阅读完整内容')
  })
})
