import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BuyDataOrders from './BuyDataOrders.vue'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'

const Dummy = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/mine', component: Dummy },
      { path: '/app/mine/orders/:source/:id', component: Dummy },
      { path: '/portal/mine', component: Dummy },
      { path: '/portal/mine/orders/:source/:id', component: Dummy },
      { path: '/app/payment/dataset/:orderId', component: Dummy },
      { path: '/portal/payment/dataset/:orderId', component: Dummy }
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

  it('lists only dataset buy-data orders and keeps status filters', async () => {
    // 种子数据中没有会员/VIP 订单（购买会员走 productId === 'membership'，无 productType，
    // 因此不会通过 filterBuyDataOrders 的 productType === 'dataset' 判定）。
    // 这里显式注入一条“标准VIP”会员订单，验证它绝不出现在买数列表中。
    useUserStore().completeEnterpriseAuth()
    useOrderStore().purchaseMember(12, 'standard')

    const { wrapper, openBills } = await mountBuyDataOrders()

    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('标准VIP')
    expect(wrapper.text()).not.toContain('会员')
    expect(wrapper.text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(true)
    // 报告订单（order-history-001）非数据集，不应出现
    expect(wrapper.text()).not.toContain('中国公路物流行业月报')

    await wrapper.find('[data-testid="api-bills-order-entry"]').trigger('click')
    expect(openBills).toHaveBeenCalledTimes(1)

    const completedChip = wrapper.findAll('button').find((btn) => btn.text() === '已完成')
    expect(completedChip).toBeTruthy()
    await completedChip!.trigger('click')

    expect(wrapper.text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.text()).not.toContain('标准VIP')
  })

  it('keeps list cards compact: type, name, status, amount, time; no dense meta or extra actions', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders()

    expect(wrapper.text()).not.toContain('查看商品')
    expect(wrapper.text()).not.toContain('查看我的数据')
    expect(wrapper.text()).not.toContain('购买主体')
    expect(wrapper.text()).not.toContain('购买方案')
    expect(wrapper.text()).not.toContain('付款方式')
    expect(wrapper.text()).not.toContain('前往可信空间')
  })

  it('opens order detail when a card is clicked', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountBuyDataOrders()

    await wrapper.get('[data-testid="order-card-app-order-enterprise-dataset-001"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine/orders/app/order-enterprise-dataset-001')
  })

  it('keeps continue-pay on the card and does not open detail', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, pay, router } = await mountBuyDataOrders()

    const payButton = wrapper.findAll('button').find((btn) => btn.text() === '继续付款')
    expect(payButton).toBeTruthy()
    await payButton!.trigger('click')
    await flushPromises()

    expect(pay).toHaveBeenCalledTimes(1)
    expect(pay.mock.calls[0][0].id).toBe(order.id)
    expect(router.currentRoute.value.path).toBe('/app/mine')
  })

  it('does not render a product-type select', async () => {
    const { wrapper } = await mountBuyDataOrders()
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(false)
  })

  it('keeps subject and channel filters and emits update:subjectFilter', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountBuyDataOrders({ subjectFilter: 'all' })

    expect(wrapper.find('[aria-label="成交渠道筛选"]').exists()).toBe(true)

    const enterpriseButton = wrapper.findAll('button').find((btn) => btn.text() === '企业')
    await enterpriseButton!.trigger('click')

    expect(wrapper.emitted('update:subjectFilter')?.[0]).toEqual(['enterprise'])
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
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(false)
    expect(wrapper.findAll('a').find((link) => link.text() === '下载数据')).toBeFalsy()
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
