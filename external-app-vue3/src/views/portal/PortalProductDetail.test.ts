import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PortalDetailTabs from '@/views/portal/components/PortalDetailTabs.vue'
import PortalProductDetail from './PortalProductDetail.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSpaceIntentStore } from '@/stores/spaceIntents'

async function mountProductDetail(productId: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/portal/product/:id', component: PortalProductDetail },
      { path: '/portal/mine/orders/:source/:id', component: { template: '<div />' } },
      { path: '/portal/mine', component: { template: '<div />' } },
      { path: '/portal/checkout/:id', component: { template: '<div />' } },
      { path: '/portal/use/dataset/:id', component: { template: '<div />' } },
      { path: '/portal/data-prepare/datasets', component: { template: '<div />' } },
      { path: '/portal/data-prepare/datasets/public', component: { template: '<div />' } },
      { path: '/portal/space-intent/:id', component: { template: '<div />' } },
      { path: '/app/checkout/member', component: { template: '<div />' } }
    ]
  })
  await router.push(`/portal/product/${productId}`)
  await router.isReady()
  const wrapper = mount(PortalProductDetail, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('PortalProductDetail public dataset entry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
  })

  it('keeps reports as a current-release placeholder without purchase or reading actions', async () => {
    const wrapper = await mountProductDetail('prod-logistics-monthly')
    expect(wrapper.get('[data-testid="report-placeholder"]').text()).toContain('本期仅占位')
    expect(wrapper.find('[data-testid="product-primary-action"]').exists()).toBe(false)
    expect(wrapper.findComponent(PortalDetailTabs).exists()).toBe(false)
  })

  it.each(['prod-qualification-api', 'prod-enterprise-activity'])('opens the visible completed order for authorized %s', async id => {
    const user = useUserStore()
    user.currentEnterpriseMember!.seatAssigned = true
    useEntitlementStore().grantEnterpriseSeat(id, user.context.currentEnterpriseId!)
    const orders = useOrderStore()
    orders.list = [{ ...orders.list[0]!, id: 'trusted-completed', productId: id,
      productType: useCatalogStore().byId(id)!.type, status: 'entitlement_active', ownerType: 'enterprise',
      ownerId: user.context.currentEnterpriseId!, operatorMemberId: user.context.currentMemberId }]
    const wrapper = await mountProductDetail(id)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('前往订单')
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/mine/orders/app/trusted-completed')
  })

  it('offers only repurchase after a paid dashboard expires', async () => {
    const user = useUserStore()
    const product = useCatalogStore().byId('prod-cold-chain-dashboard')!
    product.availability = product.status = 'published'
    const entitlements = useEntitlementStore()
    entitlements.grantEnterpriseSeat(product.id, user.context.currentEnterpriseId!)
    const entitlement = entitlements.list.find(item => item.productId === product.id && item.type === 'seat')!
    entitlement.validFrom = '2000-01-01'
    entitlement.updateValidTo = '2000-12-31'
    const wrapper = await mountProductDetail(product.id)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('再次购买')
    expect(wrapper.get('[data-testid="product-expired-stamp"]').text()).toBe('已到期')
    expect(wrapper.find('[data-testid="product-secondary-action"]').exists()).toBe(false)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe(`/portal/checkout/${product.id}`)
  })

  it('uses the resource association after renaming and creates no order', async () => {
    const product = useCatalogStore().byId('prod-public-freight-dataset')!
    product.name = 'Renamed public product'
    const before = JSON.parse(JSON.stringify(useOrderStore().$state))
    const wrapper = await mountProductDetail(product.id)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/data-prepare/datasets/public')
    expect(wrapper.vm.$router.currentRoute.value.query).toEqual({ category: 'public', resource: 'res-prod-public-freight-dataset', product: product.id })
    expect(useOrderStore().$state).toEqual(before)
    wrapper.unmount()
  })

  it.each(['inactive member', 'source unavailable', 'source private', 'unpublished', 'missing source', 'service suspended'])('blocks the public action after %s without an order fallback', async (reason) => {
    const wrapper = await mountProductDetail('prod-public-freight-dataset')
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
    expect(wrapper.get('[data-testid="product-action-area"]').text()).toContain(reason === 'unpublished' ? '前往用数' : '不可用')
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

describe('PortalProductDetail space intent CTA', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps trusted-space API applications behind team membership', async () => {
    const wrapper = await mountProductDetail('prod-qualification-api')
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

  it('shows a compact trusted dataset detail without sample or profiling tabs', async () => {
    const wrapper = await mountProductDetail('prod-space-port-throughput')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')
    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('试用会员不能购买或申请。')
    expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('样例数据')
    expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('探查报告')
    expect(wrapper.get('[data-testid="dataset-overview-metrics"]').text()).toContain('字段数')
    expect(wrapper.get('[data-testid="dataset-overview-metrics"]').text()).toContain('1,200')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).toContain('地域范围')
    expect(wrapper.find('[data-testid="detail-provider"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="detail-compliance"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('商品说明书')
  })

  it('keeps space API tabs to basic and docs, with error messages under docs and no provider in resource info', async () => {
    const wrapper = await mountProductDetail('prod-qualification-api')

    expect(wrapper.text()).not.toContain('在线调试')
    expect(wrapper.text()).not.toContain('错误码与 SLA')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).not.toContain('提供方')
    expect(wrapper.get('[data-testid="detail-provider"]').text()).toContain('提供方信息')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).toContain('覆盖时间范围')
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).toContain('使用限制')
    expect(wrapper.get('[data-testid="api-supporting-files"]').text()).toContain('交付方式说明')
    expect(wrapper.get('[data-testid="api-supporting-files"]').findAll('a')).toHaveLength(3)
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).not.toContain('合法合规声明')
    expect(wrapper.text()).not.toContain('产品介绍')

    await wrapper.findAll('button').find((b) => b.text() === '接口文档')!.trigger('click')
    await flushPromises()
    const errorCodes = wrapper.get('[data-testid="api-error-codes"]')
    expect(errorCodes.text()).toContain('错误码')
    expect(errorCodes.text()).toContain('参数缺失')
    expect(errorCodes.text()).not.toContain('40001')
  })
})

describe('PortalProductDetail dataset tabs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('retains the sample and profiling tabs for non-trusted datasets', async () => {
    const wrapper = await mountProductDetail('prod-truck-trajectory')
    expect(wrapper.findAll('button').map((button) => button.text())).toContain('探查报告')
    await wrapper.findAll('button').find((b) => b.text() === '样例数据')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('脱敏样例')
  })
})

describe('PortalProductDetail owned dashboard basic information', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows four dashboard facts, seven resource facts, and the manual', async () => {
    const wrapper = await mountProductDetail('prod-freight-index')
    expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('更新与导出')
    expect(wrapper.findAll('button').map((button) => button.text())).toContain('看板预览')
    expect(wrapper.findAll('button').map((button) => button.text())).toContain('指标定义')
    await wrapper.findAll('button').find((button) => button.text() === '基本信息')!.trigger('click')

    const overview = wrapper.get('[data-testid="dashboard-overview-info"]')
    expect(overview.text()).toContain('时间范围')
    expect(overview.text()).toContain('更新周期')
    expect(overview.text()).toContain('指标数量')
    expect(overview.text()).toContain('导出规则')
    expect(overview.text()).not.toContain('图表面板')

    const resource = wrapper.get('[data-testid="detail-resource-info"]')
    expect(resource.text()).toContain('提供方')
    expect(resource.text()).toContain('地域范围')
    expect(resource.text()).toContain('更新频率')
    expect(resource.text()).toContain('交付方式')
    expect(resource.text()).toContain('来源')
    expect(resource.text()).toContain('上架时间')
    expect(resource.text()).toContain('应用场景')
    expect(wrapper.find('[data-testid="detail-compliance"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="detail-provider"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('商品说明书')
    expect(wrapper.get('[data-testid="dashboard-manual"]').findAll('[data-testid="dashboard-manual-item"]')).toHaveLength(4)
  })
})

describe('PortalProductDetail owned dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('opens the enterprise dataset in the Vue use-data page', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    const ownedProduct = useCatalogStore().byId('prod-warehouse-turnover-risk')!
    ownedProduct.availability = ownedProduct.status = 'published'
    useEntitlementStore().list.push({
      id: 'ent-v102-owned', type: 'dataset', source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId: 'prod-warehouse-turnover-risk', status: 'active',
      validFrom: '2026-10-01', validTo: '2027-10-01', accessScope: 'enterprise_wide', allowDownload: true
    })
    const wrapper = await mountProductDetail('prod-warehouse-turnover-risk')

    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('前往用数')

    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/data-prepare/datasets')
    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({ tab: 'purchased', product: 'prod-warehouse-turnover-risk' })
  })
})

describe('PortalProductDetail V1.0.2 trade actions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows only one free plan price and keeps metadata in basic information', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    useEntitlementStore().grantTeamMember()
    const wrapper = await mountProductDetail('prod-freight-index')
    await wrapper.findAll('button').find(b => ['基本信息', '报告介绍'].includes(b.text()))!.trigger('click')
    const plan = wrapper.get('[data-testid="detail-pricing"]')

    expect(plan.text().match(/会员免费/g)).toHaveLength(1)
    expect(plan.text()).not.toContain('当前方案')
    expect(plan.text()).not.toContain('需开通企业会员')
    expect(plan.text()).not.toContain('上架时间')
    expect(plan.text()).not.toContain('来源')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('前往看数')
  })

  it('keeps one paid price, shared-rights context and the primary action', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    useEntitlementStore().grantTeamMember()
    useCatalogStore().byId('prod-cold-chain-dashboard')!.availability = 'published'
    useCatalogStore().byId('prod-cold-chain-dashboard')!.status = 'published'
    const wrapper = await mountProductDetail('prod-cold-chain-dashboard')
    await wrapper.findAll('button').find(b => ['基本信息', '报告介绍'].includes(b.text()))!.trigger('click')
    const plan = wrapper.get('[data-testid="detail-pricing"]')

    expect(plan.text()).toContain('¥')
    expect(plan.text()).toContain('企业使用权益')
    expect(plan.text()).not.toContain('当前方案')
    expect(plan.text()).not.toContain('需开通企业会员')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('立即购买')
  })

  it('keeps trial members from buying or applying', async () => {
    const wrapper = await mountProductDetail('prod-seller-route-board')
    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('试用会员不能购买或申请。')
    expect(wrapper.get('[data-testid="product-primary-action"]').attributes('disabled')).toBeUndefined()
  })

  it('takes enterprise members to a single checkout path', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    useEntitlementStore().grantTeamMember()
    const wrapper = await mountProductDetail('prod-seller-route-board')
    expect(wrapper.get('[data-testid="detail-pricing"]').text()).toContain('每日更新')
    expect(wrapper.find('[data-testid="product-secondary-action"]').exists()).toBe(false)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/checkout/prod-seller-route-board')
  })

  it('renders an enterprise-only zero-yuan dataset without evaluating a personal offer', async () => {
    const wrapper = await mountProductDetail('prod-private-zero-dataset')
    expect(wrapper.get('[data-testid="detail-pricing"]').text()).toContain('¥0')
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    await flushPromises()
    expect(wrapper.get('[data-testid="detail-pricing"]').text()).toContain('购买后开通企业使用权益')
  })

  it('shows only repurchase on an expired listed dataset detail', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    const product = useCatalogStore().byId('prod-seller-route-board')!
    const entitlement = useEntitlementStore().grantSellerDataset({
      product,
      orderId: 'order-expired-seller-pc',
      ownerType: 'enterprise',
      ownerId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      offerId: product.commerceOffers![0].id,
      selectedTermMonths: 12
    })
    entitlement.updateValidTo = '2026-09-30'
    const wrapper = await mountProductDetail('prod-seller-route-board')

    expect(wrapper.get('[data-testid="product-action-area"]').text()).not.toContain('服务已到期')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('再次购买')
    expect(wrapper.find('[data-testid="product-secondary-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dataset-pc-dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reuses the checkout path when an expired dataset is bought again', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    useEntitlementStore().list.push({
      id: 'ent-expired-seller-checkout-pc', type: 'dataset', source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId: 'prod-seller-route-board', status: 'active',
      validFrom: '2025-10-01', updateValidTo: '2026-09-30', accessScope: 'enterprise_wide'
    })
    const wrapper = await mountProductDetail('prod-seller-route-board')

    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/checkout/prod-seller-route-board')
  })

  it('hides detail actions when an expired dataset is delisted', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
    const dataset = useCatalogStore().byId('prod-seller-route-board')!
    dataset.availability = 'delisted'
    dataset.status = 'delisted'
    useEntitlementStore().list.push({
      id: 'ent-expired-delisted-pc', type: 'dataset', source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId: dataset.id, status: 'active',
      validFrom: '2025-10-01', updateValidTo: '2026-09-30', accessScope: 'enterprise_wide'
    })
    const wrapper = await mountProductDetail(dataset.id)

    expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
    wrapper.unmount()
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
      id: `ent-expired-${productId}-pc`, type, source: 'enterprise', ownerId: 'ent-wanlian-logistics',
      enterpriseId: 'ent-wanlian-logistics', productId, status: 'active',
      validFrom: '2025-10-01', validTo: '2026-09-30'
    })
    const wrapper = await mountProductDetail(productId)

    expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
    wrapper.unmount()
  })
})

describe('PortalProductDetail price anchors', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows 待报价 in header and purchase panel for space products without offers or plans', async () => {
    const catalog = useCatalogStore()
    const quoteProduct = catalog.products.find(
      (p) => p.dealChannel === 'space_purchase'
        && p.availability === 'published'
        && p.status === 'published'
        && !p.commerceOffers?.length
        && !p.datasetOffers?.length
        && !p.typeDetail.api?.pricingPlans?.length
    )
    expect(quoteProduct).toBeTruthy()
    const wrapper = await mountProductDetail(quoteProduct!.id)
    expect(wrapper.get('[data-testid="product-header-price"]').text()).toContain('待报价')
    expect(wrapper.get('[data-testid="detail-pricing"]').text()).toContain('待报价')
  })

  it('shows the cheapest API plan price as starting price and keeps the plan list in the panel', async () => {
    const wrapper = await mountProductDetail('prod-qualification-api')
    const header = wrapper.get('[data-testid="product-header-price"]').text()
    expect(header).toMatch(/¥[\d,.]+/)
    expect(wrapper.get('[data-testid="purchase-price"]').text()).toContain('¥')
    expect(wrapper.find('[data-testid="purchase-price-summary"]').exists()).toBe(false)
  })

  it('keeps the header price consistent with the purchase panel', async () => {
    useEntitlementStore().list = []
    useCatalogStore().byId('prod-cold-chain-dashboard')!.availability = 'published'
    useCatalogStore().byId('prod-cold-chain-dashboard')!.status = 'published'
    const wrapper = await mountProductDetail('prod-cold-chain-dashboard')
    await wrapper.findAll('button').find(b => b.text() === '基本信息')!.trigger('click')
    const price = wrapper.get('[data-testid="detail-pricing"]').text().match(/¥[\d,.]+/)![0]
    expect(wrapper.get('[data-testid="product-header-price"]').text()).toContain(price)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')
  })

  it('does not expose a purchase action to trial members', async () => {
    const wrapper = await mountProductDetail('prod-truck-trajectory')
    expect(wrapper.get('[data-testid="product-header-price"]').text()).toMatch(/¥|免费|待报价/)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('开通会员')
  })
})

describe('PortalProductDetail default tabs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    ['prod-truck-trajectory', 'basic'],
    ['prod-qualification-api', 'basic'],
    ['prod-freight-index', 'preview']
  ])('opens %s in %s', async (productId, expectedTab) => {
    const wrapper = await mountProductDetail(productId)

    expect(wrapper.findComponent(PortalDetailTabs).props('modelValue')).toBe(expectedTab)
  })
})

describe('aligned delisting and original-order actions', () => {
  beforeEach(() => { setActivePinia(createPinia()); useUserStore().switchMockPurchaseIdentity('enterprise_admin'); useEntitlementStore().grantTeamMember() })
  it('hides actions on a delisted member-free dashboard for an active member', async () => {
    const product = useCatalogStore().byId('prod-freight-index')!
    product.status = product.availability = 'delisted'
    const wrapper = await mountProductDetail(product.id)
    const router = wrapper.vm.$router
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
    const wrapper = await mountProductDetail(product.id)
    const router = wrapper.vm.$router
    expect(wrapper.find('[data-testid="product-action-area"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="product-delisted-stamp"]').text()).toBe('已下架')
    wrapper.unmount()
  })
})
