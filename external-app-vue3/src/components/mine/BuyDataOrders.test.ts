import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BuyDataOrders from './BuyDataOrders.vue'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import type { Entitlement } from '@/types/domain'

const Dummy = { template: '<div />' }

function addTrustedSourceAuthorization(overrides: Partial<Entitlement> = {}) {
  useEntitlementStore().list.push({
    id: 'ent-source-activity', source: 'enterprise', type: 'dataset',
    ownerId: 'ent-wanlian-logistics', enterpriseId: 'ent-wanlian-logistics',
    productId: 'prod-enterprise-activity', orderId: 'space-order-activity-001',
    accessScope: 'enterprise_wide', validFrom: '2026-01-01',
    validTo: '2099-12-31', updateValidTo: '2099-12-31', status: 'active',
    ...overrides
  })
}

function makeRouter(_initialPath?: string) {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/mine', component: Dummy },
      { path: '/app/mine/orders/:source/:id', component: Dummy },
      { path: '/portal/mine', component: Dummy },
      { path: '/portal/mine/orders/:source/:id', component: Dummy },
      { path: '/app/payment/dataset/:orderId', component: Dummy },
      { path: '/portal/payment/dataset/:orderId', component: Dummy },
      { path: '/app/product/:id', component: Dummy },
      { path: '/portal/product/:id', component: Dummy },
      { path: '/portal/data-prepare/datasets', component: Dummy }
    ]
  })
}

async function mountBuyDataOrders(
  props: Partial<InstanceType<typeof BuyDataOrders>['$props']> = {},
  initialPath = '/app/mine'
) {
  const pay = vi.fn()
  const openBills = vi.fn()
  const router = makeRouter(initialPath)
  await router.push(initialPath)
  await router.isReady()
  const wrapper = mount(BuyDataOrders, {
    props: {
      variant: 'mobile',
      subjectFilter: 'all',
      pay,
      openBills,
      ...props
    },
    global: { plugins: [router] }
  })
  return { wrapper, pay, openBills, router }
}

describe('BuyDataOrders', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each(['mobile', 'portal'] as const)('R03 %s filters self-operated origins and inclusive calendar dates', async (variant) => {
    useUserStore().completeEnterpriseAuth()
    const order = useOrderStore().list.find((item) => item.id === 'order-enterprise-dataset-001')!
    order.createdAt = '2026-10-11T15:59:59.999Z'
    useCatalogStore().byId(order.productId)!.origin = 'asset_platform'
    const { wrapper } = await mountBuyDataOrders({ variant })
    expect(wrapper.find('[aria-label="成交渠道筛选"]').exists()).toBe(false)
    await wrapper.get('[aria-label="资源来源筛选"]').setValue('app_content')
    await wrapper.get('[aria-label="下单开始日期"]').setValue('2026-10-11')
    await wrapper.get('[aria-label="下单结束日期"]').setValue('2026-10-11')
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(true)
    order.createdAt = '2026-10-11T16:00:00.000Z'
    await flushPromises()
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(false)
    await wrapper.get('[aria-label="下单开始日期"]').setValue('2026-10-12')
    expect(wrapper.text()).toContain('开始日期不能晚于结束日期')
  })

  it('R03 preserves refunded and confirmation states and hides invalid actions', async () => {
    useUserStore().completeEnterpriseAuth()
    const order = useOrderStore().list.find((item) => item.id === 'order-enterprise-dataset-001')!
    order.status = 'refunded'
    const { wrapper } = await mountBuyDataOrders()
    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    expect(card.text()).toContain('已退款')
    expect(card.text()).not.toContain('已取消')
    order.status = 'payment_pending_confirmation'
    await flushPromises()
    expect(card.text()).toContain('待确认到账')
    expect(card.text()).not.toContain('继续支付')
    expect(card.text()).not.toContain('查看已交付数据')
  })

  it('lists buy-data product orders, excludes VIP, and keeps phase-one status chips', async () => {
    useUserStore().completeEnterpriseAuth()
    useOrderStore().purchaseMember(12, 'standard')

    const { wrapper } = await mountBuyDataOrders()

    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="api-bills-order-entry"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('标准VIP')
    expect(wrapper.text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.text()).toContain('中国公路物流行业月报')
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(true)

    const chips = wrapper.findAll('button').map((btn) => btn.text())
    expect(chips).not.toContain('待支付')
    expect(chips).toContain('待处理')
    expect(chips).not.toContain('已退款')
    expect(chips).toContain('已支付')
    expect(chips).toContain('已取消')
    expect(chips).toContain('已关闭')
    expect(chips).not.toContain('待领取')
    expect(chips).not.toContain('支付完成')

    expect(chips).not.toContain('已开通')
    const paidChip = wrapper.findAll('button').find((btn) => btn.text() === '已支付')
    await paidChip!.trigger('click')
    expect(wrapper.text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.text()).not.toContain('标准VIP')
  })

  it('groups unclaimed intents and unpaid orders into 待处理', async () => {
    useUserStore().completeEnterpriseAuth()
    useSpaceIntentStore().list = []
    const intent = useSpaceIntentStore().submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '试用'
    })
    const { wrapper } = await mountBuyDataOrders()
    const card = wrapper.get(`[data-testid="order-card-intent-${intent.id}"]`)
    expect(card.text()).toContain('待领取')

    await wrapper.findAll('button').find((btn) => btn.text() === '待处理')!.trigger('click')
    expect(wrapper.find(`[data-testid="order-card-intent-${intent.id}"]`).exists()).toBe(true)
  })

  it.each(['mobile', 'portal'] as const)('opens the product from the %s order name without triggering the card order route', async (variant) => {
    useUserStore().completeEnterpriseAuth()
    const base = variant === 'portal' ? '/portal' : '/app'
    const { wrapper, router } = await mountBuyDataOrders({ variant }, `${base}/mine`)
    const orderCard = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    const title = orderCard.get('[data-testid="order-product-name"]')
    expect(title.attributes('href')).toBe(`${base}/product/prod-truck-trajectory`)
    await title.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.path).not.toContain('/mine/orders/')
    await title.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`${base}/product/prod-truck-trajectory`)
    await router.push(`${base}/mine`)
    await orderCard.findAll('button').find(button => button.text() === '查看订单')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`${base}/mine/orders/app/order-enterprise-dataset-001`)
  })

  it('shows paid caption without channel or subject on compact cards', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders()

    expect(wrapper.text()).not.toContain('查看我的数据')
    expect(wrapper.text()).not.toContain('购买方案')
    expect(wrapper.text()).not.toContain('付款方式')
    expect(wrapper.find('[aria-label="购买主体筛选"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('全部主体')

    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    expect(card.text()).not.toContain('APP 内购买')
    expect(card.text()).not.toContain('企业')
    expect(card.text()).toContain('实付款')
    expect(card.text()).toContain('查看商品')
    expect(card.text()).toContain('PC端使用')
    expect(card.text()).toContain('查看订单')
    expect(card.text()).not.toContain('下载数据')
  })

  it('opens order detail when a card is clicked', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountBuyDataOrders()

    await wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine/orders/app/order-enterprise-dataset-001')
  })

  it.each([
    ['app-order-enterprise-dataset-001', '请登录PC端，前往「用数」模块查看和使用。', '原订单'],
    ['space-space-order-activity-001', '请登录PC端，前往原订单查看和使用已交付数据。', '「用数」']
  ])('keeps App on my orders and shows source-specific dismissible PC guidance for %s', async (cardId, notice, unrelatedDestination) => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useSpaceOrderStore().$reset()
    addTrustedSourceAuthorization()
    const { wrapper, router } = await mountBuyDataOrders()
    expect(wrapper.get('[data-testid="dataset-pc-use-explanation"]').text()).toContain('PC端')
    const card = wrapper.get(`[data-testid="order-card-${cardId}"]`)
    expect(card.find('a[target="_blank"]').exists()).toBe(false)
    await card.findAll('button').find((button) => button.text() === 'PC端使用')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/app/mine')
    expect(wrapper.get('[role="status"]').text()).toContain(notice)
    expect(wrapper.get('[role="status"]').text()).not.toContain(unrelatedDestination)
    await wrapper.get('button[aria-label="关闭PC端使用提示"]').trigger('click')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dataset-pc-use-explanation"]').exists()).toBe(true)
  })

  it('keeps delivered historical data available through PC guidance after expiry', async () => {
    useUserStore().completeEnterpriseAuth()
    const entitlement = useEntitlementStore().list.find((item) => item.id === 'ent-dataset-enterprise-001')!
    entitlement.status = 'expired'
    entitlement.validTo = '2026-10-01'
    entitlement.updateValidTo = '2026-10-01'
    const { wrapper, router } = await mountBuyDataOrders()
    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    expect(card.text()).toContain('历史已交付数据')
    expect(card.text()).toContain('不再更新')
    await card.findAll('button').find((button) => button.text() === 'PC端使用')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine')
    expect(wrapper.get('[role="status"]').text()).toContain('请登录PC端，前往「用数」模块查看已交付数据。')
    expect(wrapper.get('[role="status"]').text()).not.toContain('查看和使用')
  })

  it('preserves PC purchased dataset routing and trusted-space downloads', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useSpaceOrderStore().$reset()
    addTrustedSourceAuthorization()
    const { wrapper, router } = await mountBuyDataOrders({ variant: 'portal' }, '/portal/mine')
    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    await card.findAll('button').find((button) => button.text() === '查看已交付数据')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/data-prepare/datasets')
    expect(router.currentRoute.value.query).toMatchObject({ tab: 'purchased', product: 'prod-truck-trajectory', order: 'order-enterprise-dataset-001' })
    expect(wrapper.get('[data-testid="order-card-space-space-order-activity-001"] a[target="_blank"]').attributes('href')).toBe('https://trusted-space.mock/downloads/space-order-activity-001')
    expect(wrapper.find('[data-testid="dataset-pc-use-explanation"]').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it.each([
    ['mobile', 'published'], ['mobile', 'delisted'],
    ['portal', 'published'], ['portal', 'delisted']
  ] as const)('keeps expired trusted source orders viewable without use actions on %s with %s products', async (variant, availability) => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useSpaceOrderStore().$reset()
    const product = useCatalogStore().byId('prod-enterprise-activity')!
    product.availability = availability
    product.status = availability
    addTrustedSourceAuthorization({ validFrom: '1999-01-01', validTo: '2000-01-01', updateValidTo: '2000-01-01' })
    const base = variant === 'portal' ? '/portal' : '/app'
    const { wrapper, router } = await mountBuyDataOrders({ variant }, `${base}/mine`)
    const card = wrapper.get('[data-testid="order-card-space-space-order-activity-001"]')

    expect(card.text()).toContain('企业物流活跃度数据集')
    expect(card.text()).not.toContain('PC端使用')
    expect(card.text()).not.toContain('查看已交付数据')
    expect(card.find('a[target="_blank"]').exists()).toBe(false)
    await card.findAll('button').find((button) => button.text() === '查看订单')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`${base}/mine/orders/space/space-order-activity-001`)
  })

  it('includes a seeded unpaid dataset order with 继续支付', async () => {
    const { wrapper } = await mountBuyDataOrders()
    const card = wrapper.get('[data-testid="order-card-app-order-dataset-pending-001"]')
    expect(card.text()).toContain('待支付')
    expect(card.text()).toContain('继续支付')
    expect(card.text()).toContain('应付款')
  })

  it('shows continue payment for a pending order and does not open detail', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, pay, router } = await mountBuyDataOrders()

    const payButton = wrapper.findAll('button').find((btn) => btn.text() === '继续支付')
    expect(payButton).toBeTruthy()
    await payButton!.trigger('click')
    await flushPromises()

    expect(pay).toHaveBeenCalledTimes(1)
    expect(pay.mock.calls[0][0].id).toBe(order.id)
    expect(router.currentRoute.value.path).toBe('/app/mine')
  })

  it('opens the product from the order card action without opening order detail', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountBuyDataOrders()
    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')

    await card.findAll('button').find((button) => button.text() === '查看商品')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/app/product/prod-truck-trajectory')
  })

  it('does not show dataset actions for an API intent', async () => {
    useUserStore().completeEnterpriseAuth()
    useSpaceIntentStore().list = []
    const intent = useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    const { wrapper } = await mountBuyDataOrders()
    const card = wrapper.get(`[data-testid="order-card-intent-${intent.id}"]`)

    expect(card.text()).toContain('查看商品')
    expect(card.text()).not.toContain('进入用数模块')
    expect(card.text()).not.toContain('下载数据')
  })

  it('filters the mixed buy-data list by product type', async () => {
    const { wrapper } = await mountBuyDataOrders()
    const typeSelect = wrapper.get('[aria-label="商品类型筛选"]')
    expect(typeSelect.text()).toContain('行业报告')
    expect(typeSelect.text()).toContain('自有看板')

    await typeSelect.setValue('report')
    expect(wrapper.text()).toContain('中国公路物流行业月报')
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(false)
  })

  it('searches order product names on mobile and PC', async () => {
    useUserStore().completeEnterpriseAuth()
    for (const variant of ['mobile', 'portal'] as const) {
      const { wrapper } = await mountBuyDataOrders(
        { variant, subjectFilter: 'all' },
        variant === 'mobile' ? '/app/mine' : '/portal/mine'
      )
      await wrapper.get('[aria-label="搜索订单商品名称"]').setValue('全国货车轨迹')
      expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('中国公路物流行业月报')
      wrapper.unmount()
    }
  })

  it('searches the current product name after a display edit', async () => {
    useUserStore().completeEnterpriseAuth()
    useCatalogStore().byId('prod-truck-trajectory')!.name = '新版货运轨迹数据集'
    const { wrapper } = await mountBuyDataOrders()
    await wrapper.get('[aria-label="搜索订单商品名称"]').setValue('新版货运轨迹')
    expect(wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]').text()).toContain('新版货运轨迹数据集')
  })

  it('filters orders by resource origin rather than purchase channel', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders()
    await wrapper.get('[aria-label="资源来源筛选"]').setValue('seller_market')
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('仓网周转健康数据集')
  })

  it('uses the four original order source options on mobile and PC', async () => {
    for (const variant of ['mobile', 'portal'] as const) {
      const { wrapper } = await mountBuyDataOrders({ variant }, variant === 'mobile' ? '/app/mine' : '/portal/mine')
      const options = wrapper.get('[aria-label="资源来源筛选"]').findAll('option')
      expect(options.map((option) => option.text())).toEqual([
        '全部来源', '自营产品', '可信空间', '入驻商家'
      ])
      wrapper.unmount()
    }
  })

  it('removes the channel filter without adding a subject picker', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders({ subjectFilter: 'all' })

    expect(wrapper.find('[aria-label="成交渠道筛选"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="购买主体筛选"]').exists()).toBe(false)
    expect(wrapper.findAll('button').find((btn) => btn.text() === '企业')).toBeFalsy()
  })

  it('renders portal enterprise context and export without operator filter', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders(
      { variant: 'portal', subjectFilter: 'enterprise' },
      '/portal/mine'
    )

    expect(wrapper.find('[data-testid="portal-enterprise-order-filter-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="export-enterprise-orders"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="经办人筛选"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('本人经办')
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="购买主体筛选"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('API 调用与费用账单')
    expect(wrapper.findAll('button').find((link) => link.text() === '查看已交付数据')).toBeTruthy()

    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    expect(card.text()).not.toContain('APP 内购买')
    expect(card.text()).not.toContain('企业')
  })

  it('opens portal order detail from a portal card', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountBuyDataOrders(
      { variant: 'portal', subjectFilter: 'all' },
      '/portal/mine'
    )

    await wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/mine/orders/app/order-enterprise-dataset-001')
  })
})

it.each(['mobile', 'portal'] as const)('limits the %s fallback list to the requested product', async variant => {
  setActivePinia(createPinia())
  const orders = useOrderStore()
  const user = useUserStore()
  user.switchMockPurchaseIdentity('enterprise_admin')
  const template = { ...orders.list[0]!, ownerType: 'enterprise' as const, ownerId: user.context.currentEnterpriseId!,
    operatorMemberId: user.context.currentMemberId, productType: 'dashboard' as const, status: 'entitlement_active' as const }
  orders.list = [ { ...template, id: 'filtered-one', productId: 'prod-cold-chain-dashboard' },
    { ...template, id: 'filtered-two', productId: 'prod-cold-chain-dashboard' },
    { ...template, id: 'unrelated-order', productId: 'prod-freight-index' } ]
  const client = variant === 'portal' ? 'portal' : 'app'
  const { wrapper } = await mountBuyDataOrders({ variant }, `/${client}/mine?productId=prod-cold-chain-dashboard`)
  expect(wrapper.get('[data-testid="order-product-filter"]').text()).toContain('当前商品')
  expect(wrapper.text()).not.toContain('unrelated-order')
  expect(wrapper.text()).toContain('filtered-one')
  await wrapper.get('[data-testid="order-product-filter"] button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('unrelated-order')
  wrapper.unmount()
})
