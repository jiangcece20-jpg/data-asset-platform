import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BuyDataOrders from './BuyDataOrders.vue'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useSpaceIntentStore } from '@/stores/spaceIntents'

const Dummy = { template: '<div />' }

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
      { path: '/portal/product/:id', component: Dummy }
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

  it('lists buy-data product orders, excludes VIP, and uses the four status chips', async () => {
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
    expect(chips).toContain('待付款')
    expect(chips).toContain('已支付')
    expect(chips).toContain('已取消')
    expect(chips).toContain('已关闭')
    expect(chips).not.toContain('待领取')
    expect(chips).not.toContain('支付完成')

    const paidChip = wrapper.findAll('button').find((btn) => btn.text() === '已支付')
    await paidChip!.trigger('click')
    expect(wrapper.text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.text()).not.toContain('标准VIP')
  })

  it('keeps unclaimed intents in all, not in 待付款', async () => {
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

    await wrapper.findAll('button').find((btn) => btn.text() === '待付款')!.trigger('click')
    expect(wrapper.find(`[data-testid="order-card-intent-${intent.id}"]`).exists()).toBe(false)
  })

  it('shows channel, subject and paid caption on compact cards', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders()

    expect(wrapper.text()).not.toContain('查看我的数据')
    expect(wrapper.text()).not.toContain('购买方案')
    expect(wrapper.text()).not.toContain('付款方式')
    expect(wrapper.find('[aria-label="购买主体筛选"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('全部主体')

    const card = wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]')
    expect(card.text()).toContain('APP 内购买')
    expect(card.text()).toContain('企业')
    expect(card.text()).toContain('实付款')
    expect(card.text()).toContain('查看商品')
    expect(card.text()).toContain('进入用数模块')
    expect(card.text()).toContain('下载数据')
  })

  it('opens order detail when a card is clicked', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountBuyDataOrders()

    await wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine/orders/app/order-enterprise-dataset-001')
  })

  it('includes a seeded unpaid dataset order with 继续支付', async () => {
    const { wrapper } = await mountBuyDataOrders()
    const card = wrapper.get('[data-testid="order-card-app-order-dataset-pending-001"]')
    expect(card.text()).toContain('待付款')
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

  it('keeps channel filter without a subject picker', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders({ subjectFilter: 'all' })

    expect(wrapper.find('[aria-label="成交渠道筛选"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="购买主体筛选"]').exists()).toBe(false)
    expect(wrapper.findAll('button').find((btn) => btn.text() === '企业')).toBeFalsy()
  })

  it('renders portal enterprise context, export and operator filter testids for variant=portal', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders(
      { variant: 'portal', subjectFilter: 'enterprise' },
      '/portal/mine'
    )

    expect(wrapper.find('[data-testid="portal-enterprise-order-filter-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="export-enterprise-orders"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="经办人筛选"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="购买主体筛选"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('API 调用与费用账单')
    expect(wrapper.findAll('a').find((link) => link.text() === '下载数据')).toBeTruthy()
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
