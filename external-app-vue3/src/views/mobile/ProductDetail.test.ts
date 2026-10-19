import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
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
      { path: '/app/checkout/member', name: 'checkout-member', component: { template: '<div />' } },
      { path: '/app/mine/orders/:source/:id', component: { template: '<div />' } },
      { path: '/app/mine', name: 'mine', component: { template: '<div />' } },
      { path: '/app/use/dataset/:id', name: 'dataset-use', component: { template: '<div />' } },
      { path: '/app/data-prepare/datasets', component: { template: '<div />' } },
      { path: '/app/data-prepare/datasets/public', component: { template: '<div />' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ProductDetail, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('ProductDetail public dataset entry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
  })

  it('keeps a usable renamed public dataset on App and creates no order', async () => {
    const product = useCatalogStore().byId('prod-public-freight-dataset')!
    product.name = 'Renamed public product'
    const before = JSON.parse(JSON.stringify(useOrderStore().$state))
    const { wrapper, router } = await mountProductDetail(`/app/product/${product.id}`)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/app/product/${product.id}`)
    expect(wrapper.get('[data-testid="dataset-pc-dialog"]').text()).toContain('PC端')
    await wrapper.get('[data-testid="dataset-pc-dialog"] button').trigger('click')
    expect(wrapper.find('[data-testid="dataset-pc-dialog"]').exists()).toBe(false)
    expect(useOrderStore().$state).toEqual(before)
    wrapper.unmount()
  })

  it.each(['inactive member', 'source unavailable', 'source private', 'unpublished', 'missing source', 'service suspended'])('blocks the public action after %s without an order fallback', async (reason) => {
    const { wrapper } = await mountProductDetail('/app/product/prod-public-freight-dataset')
    const catalog = useCatalogStore()
    const resource = catalog.resourceById('res-prod-public-freight-dataset')!
    if (reason === 'inactive member') useUserStore().currentEnterpriseMember!.status = 'revoked'
    if (reason === 'source unavailable') resource.sourceDatasetAvailable = false
    if (reason === 'source private') {
      resource.sourcePublicDataset = false
      catalog.byId('prod-public-freight-dataset')!.publicDataset = false
    }
    if (reason === 'unpublished') catalog.byId('prod-public-freight-dataset')!.availability = 'delisted'
    if (reason === 'missing source') catalog.resources = catalog.resources.filter((item) => item.id !== resource.id)
    if (reason === 'service suspended') catalog.byId('prod-public-freight-dataset')!.serviceStatus = 'suspended'
    await flushPromises()
    if (reason === 'unpublished') {
      expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
      wrapper.unmount()
      return
    }
    expect(wrapper.get('[data-testid="product-primary-action"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="product-action-area"]').text()).toContain(reason === 'unpublished' ? 'PC端使用' : '不可用')
    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('查看订单')
    if (reason === 'unpublished') {
      expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
      expect(wrapper.find('[data-testid="public-use-unavailable"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('已下架')
    } else {
      expect(wrapper.get('[data-testid="public-use-unavailable"]').text()).toContain('不可用')
    }
    wrapper.unmount()
  })
})

describe('ProductDetail trusted-space intent', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it.each(['prod-qualification-api', 'prod-enterprise-activity'])('opens the visible completed order for authorized %s', async id => {
    const user = useUserStore()
    user.switchMockPurchaseIdentity('enterprise_admin')
    user.currentEnterpriseMember!.seatAssigned = true
    useEntitlementStore().grantEnterpriseSeat(id, user.context.currentEnterpriseId!)
    const orders = useOrderStore()
    orders.list = [{ ...orders.list[0]!, id: 'trusted-completed', productId: id,
      productType: useCatalogStore().byId(id)!.type, status: 'entitlement_active', ownerType: 'enterprise',
      ownerId: user.context.currentEnterpriseId!, operatorMemberId: user.context.currentMemberId }]
    const { wrapper, router } = await mountProductDetail(`/app/product/${id}`)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('前往订单')
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine/orders/app/trusted-completed')
  })

  it('does not let trial members submit trusted-space intent', async () => {
    const { wrapper } = await mountProductDetail()
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')
    const beforePath = wrapper.vm.$router.currentRoute.value.fullPath
    const beforeOrders = useOrderStore().list.length
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="dialog"]').text()).toContain('开通权限请联系企业客服')
    expect(wrapper.vm.$router.currentRoute.value.fullPath).toBe(beforePath)
    expect(useOrderStore().list.length).toBe(beforeOrders)
    await wrapper.get('[aria-label="关闭会员开通弹窗"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('试用会员不能购买或申请。')
    expect(wrapper.text()).not.toContain('前往可信空间购买')
    expect(wrapper.text()).not.toContain('个人身份不能下单')
  })

  it('does not push space-bridge from product detail', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    const { wrapper, router } = await mountProductDetail()
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('space-intent')
    expect(router.currentRoute.value.path).toBe('/app/space-intent/prod-qualification-api')
    expect(router.currentRoute.value.name).not.toBe('space-bridge')
  })

  it('does not advertise samples on a trusted dataset', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-enterprise-activity')
    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('万联易达可信空间')
    expect(wrapper.get('[data-testid="product-chips"]').text()).not.toContain('有样例')
    expect(wrapper.get('[data-testid="product-chips"]').text()).not.toContain('自有')
    expect(wrapper.get('[data-testid="product-chips"]').text()).not.toContain('可信空间购买')
  })

  it('shows a compact trusted dataset detail without samples or profiling', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-space-port-throughput')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')
    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('试用会员不能购买或申请。')
    expect(wrapper.find('[data-tab="samples"]').exists()).toBe(false)
    expect(wrapper.find('[data-tab="profiling"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dataset-overview-metrics"]').text()).toContain('数据粒度')
    expect(wrapper.get('[data-testid="dataset-overview-metrics"]').text()).toContain('1,200')
    expect(wrapper.text().match(/数据粒度/g)).toHaveLength(1)
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).toContain('地域范围')
    expect(wrapper.find('[data-testid="detail-provider"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="detail-compliance"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('商品说明书')
  })

  it('keeps space API tabs to basic and docs, with error messages under docs and no provider in resource info', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-qualification-api')

    expect(wrapper.find('[data-tab="sandbox"]').exists()).toBe(false)
    expect(wrapper.find('[data-tab="sla"]').exists()).toBe(false)
    expect(wrapper.find('[data-tab="docs"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).not.toContain('提供方')
    expect(wrapper.get('[data-testid="detail-provider"]').text()).toContain('提供方信息')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).toContain('覆盖时间范围')
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).toContain('使用限制')
    expect(wrapper.get('[data-testid="api-supporting-files"]').findAll('a')).toHaveLength(3)
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).not.toContain('合法合规声明')
    expect(wrapper.text()).not.toContain('产品介绍')

    await wrapper.get('[data-tab="docs"]').trigger('click')
    const errorCodes = wrapper.get('[data-testid="api-error-codes"]')
    expect(errorCodes.text()).toContain('错误码')
    expect(errorCodes.text()).toContain('参数缺失')
    expect(errorCodes.text()).not.toContain('40001')
    expect(wrapper.text()).not.toContain('在线调试')
    expect(wrapper.text()).not.toContain('错误码与 SLA')
  })
})

describe('ProductDetail dashboard overview', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('shows one free plan price without a duplicate badge or routine status', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    useEntitlementStore().grantTeamMember()
    const { wrapper } = await mountProductDetail('/app/product/prod-freight-index')
    await wrapper.get('button[data-tab="overview"]').trigger('click')
    const plan = wrapper.get('[data-testid="detail-pricing"]')

    expect(plan.text()).toContain('价格方案')
    expect(plan.text().match(/会员免费/g)).toHaveLength(1)
    expect(plan.text()).not.toContain('当前方案')
    expect(plan.text()).not.toContain('需开通企业会员')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('前往看数')
    expect(wrapper.find('[data-testid="product-action-supporting"]').exists()).toBe(false)
  })

  it.each([
    ['prod-truck-trajectory', 'basic'],
    ['prod-qualification-api', 'basic']
  ])('opens %s in basic information', async (productId, tab) => {
    const { wrapper } = await mountProductDetail(`/app/product/${productId}`)

    expect(wrapper.get(`[role="tab"][data-tab="${tab}"]`).attributes('aria-selected')).toBe('true')
  })
  it('opens with dashboard data before pricing, while keeping overview information aligned', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-freight-index')
    expect(wrapper.find('button[data-tab="updates"]').exists()).toBe(false)
    expect(wrapper.find('button[data-tab="preview"]').exists()).toBe(true)
    expect(wrapper.find('button[data-tab="metrics"]').exists()).toBe(true)
    const preview = wrapper.get('[data-testid="content-first-preview"]')
    expect(wrapper.find('[data-testid="detail-pricing"]').exists()).toBe(false)

    expect(wrapper.get('button[data-tab="preview"]').attributes('aria-selected')).toBe('true')
    expect(preview.text()).toContain('108.6')

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
    expect(dashboard.text()).not.toContain('图表面板')
    expect(dashboard.findAll('.info-grid__cell')).toHaveLength(4)
    expect(basic.get('[data-testid="detail-resource-info"]').text()).toContain('应用场景')
    expect(basic.find('[data-testid="detail-compliance"]').exists()).toBe(false)
    expect(basic.find('[data-testid="detail-provider"]').exists()).toBe(false)
    expect(manual.text()).toContain('质量承诺')
    expect(manual.text()).not.toContain('质量/服务承诺')
  })

  it('keeps reports as a current-release placeholder without purchase or reading actions', async () => {
    const { wrapper } = await mountProductDetail('/app/product/prod-logistics-monthly')
    expect(wrapper.get('[data-testid="report-placeholder"]').text()).toContain('本期仅占位')
    expect(wrapper.find('[data-testid="product-primary-action"]').exists()).toBe(false)
    expect(wrapper.find('button[data-tab="reader"]').exists()).toBe(false)
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

  it('shows member-free and member-discount schemes without personal item purchase', async () => {
    useEntitlementStore().list = []

    const free = await mountProductDetail('/app/product/prod-freight-index')
    await free.wrapper.get('button[data-tab="overview"]').trigger('click')
    expect(free.wrapper.get('[data-testid="detail-pricing"]').text()).toContain('会员免费')
    expect(free.wrapper.find('[data-testid="product-dual-path"]').exists()).toBe(false)
    expect(free.wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')

    useCatalogStore().byId('prod-cold-chain-dashboard')!.availability = 'published'
    useCatalogStore().byId('prod-cold-chain-dashboard')!.status = 'published'
    const discount = await mountProductDetail('/app/product/prod-cold-chain-dashboard')
    await discount.wrapper.get('button[data-tab="overview"]').trigger('click')
    expect(discount.wrapper.get('[data-testid="detail-pricing"]').text()).toContain('会员折扣')
    expect(discount.wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')
  })
})

describe('ProductDetail owned dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('guides an owned enterprise dataset to PC without opening App use-data pages', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    const ownedProduct = useCatalogStore().byId('prod-warehouse-turnover-risk')!
    ownedProduct.availability = ownedProduct.status = 'published'
    useEntitlementStore().list.push({
      id: 'ent-v102-owned', type: 'dataset', source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId: 'prod-warehouse-turnover-risk', status: 'active',
      validFrom: '2026-10-01', validTo: '2027-10-01', accessScope: 'enterprise_wide', allowDownload: true
    })
    const { wrapper } = await mountProductDetail('/app/product/prod-warehouse-turnover-risk')

    const action = wrapper.get('[data-testid="product-primary-action"]')
    expect(action.text()).toBe('PC端使用')
    await action.trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/app/product/prod-warehouse-turnover-risk')
    expect(wrapper.get('[data-testid="dataset-pc-dialog"]').text()).toContain('前往「用数」模块')
  })
})

describe('ProductDetail seller dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('uses the dataset detail tabs and platform-collect checkout', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    const { wrapper, router } = await mountProductDetail('/app/product/prod-seller-route-board')

    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('数据集')
    expect(wrapper.get('[data-testid="product-chips"]').text()).toContain('陈静')
    expect(wrapper.get('button[data-tab="basic"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('线路 × 日')
    expect(wrapper.find('[data-testid="selling-shot-gallery"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('结算方式')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('购买数据集')
    expect(wrapper.get('[data-testid="detail-pricing"]').text()).toContain('12个月')

    await wrapper.get('button[data-tab="samples"]').trigger('click')
    expect(wrapper.text()).toContain('SH-NJ-01')

    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(router.currentRoute.value.path).toBe('/app/checkout/item/prod-seller-route-board')
  })

  it('shows only repurchase on an expired listed dataset detail', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    useEntitlementStore().list.push({
      id: 'ent-expired-seller-app', type: 'dataset', source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId: 'prod-seller-route-board', status: 'active',
      validFrom: '2025-10-01', updateValidTo: '2026-09-30', accessScope: 'enterprise_wide'
    })
    const { wrapper, router } = await mountProductDetail('/app/product/prod-seller-route-board')

    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('服务已到期')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('再次购买')
    expect(wrapper.get('[data-testid="product-expired-stamp"]').text()).toBe('更新已到期')
    expect(wrapper.find('[data-testid="product-secondary-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dataset-pc-dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers only repurchase after a paid dashboard expires', async () => {
    const user = useUserStore()
    user.switchMockPurchaseIdentity('enterprise_member')
    const product = useCatalogStore().byId('prod-cold-chain-dashboard')!
    product.availability = product.status = 'published'
    const entitlements = useEntitlementStore()
    entitlements.grantTeamMember()
    entitlements.grantEnterpriseSeat(product.id, user.context.currentEnterpriseId!)
    const entitlement = entitlements.list.find(item => item.productId === product.id && item.type === 'seat')!
    entitlement.validFrom = '2000-01-01'
    entitlement.updateValidTo = '2000-12-31'
    const { wrapper, router } = await mountProductDetail(`/app/product/${product.id}`)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('再次购买')
    expect(wrapper.find('[data-testid="product-secondary-action"]').exists()).toBe(false)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/app/checkout/item/${product.id}`)
  })

  it.each([
    ['prod-enterprise-activity', 'dataset', '查看申请'],
    ['prod-cold-chain-dashboard', 'seat', '查看订单']
  ] as const)('hides all actions for expired delisted %s history', async (productId, type, label) => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    useCatalogStore().byId(productId)!.availability = 'published'
    useCatalogStore().byId(productId)!.status = 'published'
    useCatalogStore().delistProduct(productId)
    useOrderStore().list = useOrderStore().list.filter((item) => item.productId !== productId)
    useSpaceIntentStore().list = useSpaceIntentStore().list.filter((item) => item.productId !== productId)
    useEntitlementStore().list = useEntitlementStore().list.filter((item) => item.productId !== productId)
    useEntitlementStore().list.push({
      id: `ent-expired-${productId}-app`, type, source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId, status: 'active',
      validFrom: '2025-10-01', validTo: '2026-09-30'
    })
    const { wrapper, router } = await mountProductDetail(`/app/product/${productId}`)

    expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
    wrapper.unmount()
  })

  it('keeps a public dataset directly usable even when historical entitlement dates are past', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    useEntitlementStore().list.push({
      id: 'ent-expired-public-app', type: 'dataset', source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId: 'prod-public-freight-dataset', status: 'active',
      validFrom: '2025-10-01', validTo: '2026-09-30'
    })
    const { wrapper } = await mountProductDetail('/app/product/prod-public-freight-dataset')

    expect(wrapper.text()).not.toContain('App支付')
    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('已到期')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('PC端使用')
  })
})

describe('aligned delisting and original-order actions', () => {
  beforeEach(() => { setActivePinia(createPinia()); useUserStore().switchMockPurchaseIdentity('enterprise_admin'); useEntitlementStore().grantTeamMember() })
  it('hides actions on a delisted member-free dashboard for an active member', async () => {
    const product = useCatalogStore().byId('prod-freight-index')!
    product.status = product.availability = 'delisted'
    const { wrapper, router } = await mountProductDetail(`/app/product/${product.id}`)
    expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
    wrapper.unmount()
  })
  it.each([1, 2])('hides actions even with %s visible original orders for an expired delisted board', async count => {
    const product = useCatalogStore().byId('prod-cold-chain-dashboard')!
    product.status = product.availability = 'delisted'
    const user = useUserStore()
    const orders = useOrderStore()
    const template = { ...orders.list[0]!, productId: product.id, productType: 'dashboard' as const,
      ownerType: 'enterprise' as const, ownerId: user.context.currentEnterpriseId!, operatorMemberId: user.context.currentMemberId,
      status: 'entitlement_active' as const }
    orders.list = Array.from({ length: count }, (_, i) => ({ ...template, id: `original-${i}` }))
    useSpaceIntentStore().list = []
    useEntitlementStore().list = useEntitlementStore().list.filter(item => item.productId !== product.id)
    useEntitlementStore().list.push({ id: 'expired-board', source: 'enterprise', ownerId: user.context.currentEnterpriseId!,
      enterpriseId: user.context.currentEnterpriseId!, type: 'seat', productId: product.id,
      status: 'expired', validFrom: '2000-01-01', validTo: '2000-12-31' })
    const { wrapper, router } = await mountProductDetail(`/app/product/${product.id}`)
    expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
    wrapper.unmount()
  })
})
