import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import type { Entitlement } from '@/types/domain'
import OrderDetail from './OrderDetail.vue'

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

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/mine/orders/:source/:id', name: 'order-detail', component: OrderDetail },
      { path: '/portal/mine/orders/:source/:id', name: 'portal-order-detail', component: OrderDetail },
      { path: '/app/mine', component: Dummy },
      { path: '/portal/mine', component: Dummy },
      { path: '/app/product/:id', component: Dummy },
      { path: '/portal/product/:id', component: Dummy },
      { path: '/app/payment/dataset/:orderId', component: Dummy },
      { path: '/portal/payment/dataset/:orderId', component: Dummy },
      { path: '/app/use/dataset/:id', component: Dummy },
      { path: '/portal/use/dataset/:id', component: Dummy },
      { path: '/portal/data-prepare/datasets', component: Dummy }
    ]
  })
}

async function mountOrderDetail(path: string) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(OrderDetail, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('OrderDetail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each(['/app', '/portal'])('shows transaction completion without delivery metadata on %s', async (base) => {
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-private-zero-dataset', 'enterprise')
    order.completedAt = '2026-10-11T01:00:00Z'
    commerce.deliveries.find((item) => item.orderId === order.id)!.deliveredAt = '2026-10-11T02:00:00Z'
    const { wrapper } = await mountOrderDetail(`${base}/mine/orders/app/${order.id}`)
    expect(wrapper.text()).toContain('2026-10-11 09:00')
    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual(['交易信息'])
    for (const removed of ['成交渠道', '交易方式', '数据与交付', '权益与服务', '处理进度', '首个交付版本更新时间']) {
      expect(wrapper.text()).not.toContain(removed)
    }
    expect(wrapper.text()).not.toContain('2026-10-11 10:00')
    expect(wrapper.text()).not.toContain('付款时间')
    expect(wrapper.text()).toContain(base === '/app' ? 'PC端使用' : '查看已交付数据')
  })

  it('does not expose use actions for revoked delivery or mislabel refunds', async () => {
    useUserStore().completeEnterpriseAuth()
    useOrderStore().list.find((item) => item.id === 'order-enterprise-dataset-001')!.status = 'refunded'
    useEntitlementStore().list.find((item) => item.id === 'ent-dataset-enterprise-001')!.status = 'revoked'
    const { wrapper } = await mountOrderDetail('/portal/mine/orders/app/order-enterprise-dataset-001')
    expect(wrapper.text()).toContain('已退款')
    expect(wrapper.get('[data-testid="order-rights"]').text()).toContain('使用受限')
    expect(wrapper.text()).not.toContain('查看已交付数据')
    expect(wrapper.text()).not.toContain('继续支付')
  })

  it('omits dataset-only fields for industry reports', async () => {
    useUserStore().completeEnterpriseAuth()
    const order = useOrderStore().appOrders.find((item) => item.productType === 'report')!
    const { wrapper } = await mountOrderDetail(`/app/mine/orders/app/${order.id}`)
    expect(wrapper.text()).toContain('行业报告')
    expect(wrapper.text()).not.toContain('数据与交付')
    expect(wrapper.text()).not.toContain('购买时数据更新时间')
  })

  it('shows order fields and data actions for a completed enterprise dataset order', async () => {
    useUserStore().completeEnterpriseAuth()
    const entitlement = useEntitlementStore().list.find((item) => item.id === 'ent-dataset-enterprise-001')!
    entitlement.status = 'expired'
    entitlement.validTo = '2026-10-01'
    entitlement.updateValidTo = '2026-10-01'
    const { wrapper, router } = await mountOrderDetail('/app/mine/orders/app/order-enterprise-dataset-001')

    expect(wrapper.get('[data-testid="order-detail"]').text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.text()).toContain('order-enterprise-dataset-001')
    expect(wrapper.text()).toContain('购买主体')
    expect(wrapper.text()).not.toContain('成交渠道')
    expect(wrapper.text()).toContain('购买方案')
    expect(wrapper.text()).toContain('付款方式')
    expect(wrapper.text()).toContain('下单时间')
    expect(wrapper.text()).toContain('付款时间')
    expect(wrapper.text()).not.toContain('购买时数据更新时间')
    expect(wrapper.text()).not.toContain('当前最新更新时间')
    expect(wrapper.text()).not.toContain('更新频率')
    expect(wrapper.text()).not.toContain('服务周期')
    expect(wrapper.text()).not.toContain('服务起止')
    expect(wrapper.text()).not.toContain('到期时间')
    expect(wrapper.text()).toContain('订单金额')
    expect(wrapper.text()).toContain('¥3,800')
    expect(wrapper.text()).not.toContain('服务已到期，不再更新')
    expect(wrapper.text()).not.toContain('首次交付时间')
    expect(wrapper.text()).not.toContain('交付状态')
    expect(wrapper.text()).toContain('查看商品')
    expect(wrapper.text()).toContain('历史已交付数据')
    expect(wrapper.text()).toContain('不再更新')
    await wrapper.findAll('button').find((button) => button.text() === 'PC端使用')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine/orders/app/order-enterprise-dataset-001')
    expect(wrapper.get('[role="status"]').text()).toContain('请登录PC端，前往「用数」模块查看已交付数据。')
    expect(wrapper.get('[role="status"]').text()).not.toContain('查看和使用')
  })

  it.each([
    ['app/order-enterprise-dataset-001', '请登录PC端，前往「用数」模块查看和使用。', '原订单'],
    ['space/space-order-activity-001', '请登录PC端，前往原订单查看和使用已交付数据。', '「用数」']
  ])('keeps App on order detail with source-specific dismissible PC guidance for %s', async (orderPath, notice, unrelatedDestination) => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useSpaceOrderStore().$reset()
    addTrustedSourceAuthorization()
    const path = `/app/mine/orders/${orderPath}`
    const { wrapper, router } = await mountOrderDetail(path)
    const explanation = wrapper.get('[data-testid="dataset-pc-use-explanation"]')
    expect(explanation.text()).toContain('PC端')
    expect(explanation.element.closest('footer')).toBeNull()
    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false)
    await wrapper.findAll('button').find((button) => button.text() === 'PC端使用')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(path)
    expect(wrapper.get('[role="status"]').text()).toContain(notice)
    expect(wrapper.get('[role="status"]').text()).not.toContain(unrelatedDestination)
    await wrapper.get('button[aria-label="关闭PC端使用提示"]').trigger('click')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dataset-pc-use-explanation"]').exists()).toBe(true)
  })

  it('preserves the delivered trusted-space download on PC detail', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useSpaceOrderStore().$reset()
    addTrustedSourceAuthorization()
    const { wrapper } = await mountOrderDetail('/portal/mine/orders/space/space-order-activity-001')
    expect(wrapper.get('a[target="_blank"]').attributes('href')).toBe('https://trusted-space.mock/downloads/space-order-activity-001')
    expect(wrapper.find('[data-testid="dataset-pc-use-explanation"]').exists()).toBe(false)
  })

  it.each([
    ['/app', 'published'], ['/app', 'delisted'],
    ['/portal', 'published'], ['/portal', 'delisted']
  ] as const)('preserves expired source order details without use actions on %s with %s products', async (base, availability) => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useSpaceOrderStore().$reset()
    const product = useCatalogStore().byId('prod-enterprise-activity')!
    product.availability = availability
    product.status = availability
    addTrustedSourceAuthorization({ validFrom: '1999-01-01', validTo: '2000-01-01', updateValidTo: '2000-01-01' })
    const { wrapper } = await mountOrderDetail(`${base}/mine/orders/space/space-order-activity-001`)

    expect(wrapper.get('[data-testid="order-detail"]').text()).toContain('space-order-activity-001')
    expect(wrapper.text()).toContain('查看商品')
    expect(wrapper.text()).not.toContain('PC端使用')
    expect(wrapper.text()).not.toContain('查看已交付数据')
    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false)
  })

  it('shows completion time without entitlement fields or fabricated payment time for a zero-yuan dataset', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    const { order } = useDatasetCommerceStore().createOrder('prod-private-zero-dataset', 'enterprise')
    const { wrapper } = await mountOrderDetail(`/app/mine/orders/app/${order.id}`)
    expect(wrapper.text()).toContain('订单完成时间')
    expect(wrapper.text()).not.toContain('权益生效时间')
    expect(wrapper.text()).not.toContain('付款时间')
  })

  it('opens purchased datasets while retaining the original order from the portal detail', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountOrderDetail('/portal/mine/orders/app/order-enterprise-dataset-001')

    await wrapper.findAll('button').find((button) => button.text() === '查看已交付数据')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/data-prepare/datasets')
    expect(router.currentRoute.value.query.tab).toBe('purchased')
    expect(router.currentRoute.value.query.product).toBe('prod-truck-trajectory')
    expect(router.currentRoute.value.query.order).toBe('order-enterprise-dataset-001')
  })

  it('does not offer continued payment after the product is delisted', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    useCatalogStore().delistProduct(order.productId)
    const { wrapper } = await mountOrderDetail(`/app/mine/orders/app/${order.id}`)
    expect(wrapper.text()).not.toContain('继续支付')
    expect(wrapper.text()).not.toContain('商品已下架，待支付订单已关闭')
    expect(wrapper.text()).toContain('已关闭')
    expect(wrapper.text()).toContain('关闭时间')
  })

  it('navigates to the product from detail actions', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountOrderDetail('/app/mine/orders/app/order-enterprise-dataset-001')

    await wrapper.findAll('button').find((btn) => btn.text() === '查看商品')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/product/prod-truck-trajectory')

  })

  it('continues payment from a pending dataset order', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, router } = await mountOrderDetail(`/app/mine/orders/app/${order.id}`)

    await wrapper.findAll('button').find((btn) => btn.text() === '继续支付')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/app/payment/dataset/${order.id}`)
  })

  it('rewrites paymentPath to the portal prefix on portal detail', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, router } = await mountOrderDetail(`/portal/mine/orders/app/${order.id}`)

    await wrapper.findAll('button').find((btn) => btn.text() === '继续支付')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/portal/payment/dataset/${order.id}`)
  })

  it('shows an empty state when the order is missing or not visible', async () => {
    const { wrapper } = await mountOrderDetail('/app/mine/orders/app/order-does-not-exist')
    expect(wrapper.text()).toContain('未找到该订单')
  })
})

describe('owned-order state and usage matrix', () => {
  beforeEach(() => { setActivePinia(createPinia()); useUserStore().switchMockPurchaseIdentity('enterprise_admin') })
  const cases = (['/app', '/portal'] as const).flatMap(client =>
    (['dataset', 'dashboard'] as const).flatMap(type => ['active', 'expired', 'delisted', 'expired_delisted'].map(scenario => ({ client, type, scenario }))))
  it.each(cases)('$client $type $scenario preserves transaction state and scopes usage to this order', async ({ client, type, scenario }) => {
    const user = useUserStore()
    const catalog = useCatalogStore()
    const product = catalog.byId(type === 'dataset' ? 'prod-private-zero-dataset' : 'prod-cold-chain-dashboard')!
    product.status = product.availability = 'published'
    const orders = useOrderStore()
    const entitlements = useEntitlementStore()
    let order
    if (type === 'dataset') {
      order = useDatasetCommerceStore().createOrder(product.id, 'enterprise').order
    } else {
      order = { ...orders.list[0]!, id: 'board-original', productId: product.id, productType: 'dashboard' as const,
        ownerType: 'enterprise' as const, ownerId: user.context.currentEnterpriseId!, operatorMemberId: user.context.currentMemberId,
        status: 'entitlement_active' as const }
      orders.list.push(order)
      entitlements.list.push({ id: 'board-right', orderId: order.id, type: 'seat', source: 'enterprise',
        ownerId: order.ownerId, enterpriseId: order.ownerId, productId: product.id, status: 'active',
        accessScope: 'enterprise_wide', validFrom: '2000-01-01', validTo: '2099-12-31' })
    }
    const entitlement = entitlements.list.find(item => item.orderId === order.id)!
    entitlement.validFrom = '2000-01-01'
    entitlement.validTo = '2099-12-31'
    entitlement.updateValidTo = scenario.includes('expired') ? '2000-12-31' : '2099-12-31'
    // Another order's current right must never unlock this expired order.
    entitlements.list.push({ ...entitlement, id: 'other-right', orderId: 'other-order', updateValidTo: '2099-12-31' })
    if (scenario.includes('delisted')) product.status = product.availability = 'delisted'
    const transactionBefore = order.status
    const { wrapper } = await mountOrderDetail(`${client}/mine/orders/app/${order.id}`)
    expect(wrapper.find('[data-testid="product-delisted-stamp"]').exists()).toBe(scenario.includes('delisted'))
    const useLabels = wrapper.findAll('button,a').map(item => item.text())
    if (type === 'dataset') expect(useLabels).toContain(client === '/app' ? 'PC端使用' : '查看已交付数据')
    else expect(useLabels.includes('前往看数')).toBe(scenario === 'active' || scenario === 'expired')
    expect(wrapper.find('[data-testid="product-expired-stamp"]').exists()).toBe(scenario.includes('expired'))
    expect(order.status).toBe(transactionBefore)
    wrapper.unmount()
  })
})
