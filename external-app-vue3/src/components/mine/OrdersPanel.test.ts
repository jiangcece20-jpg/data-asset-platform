import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import OrdersPanel from './OrdersPanel.vue'
import { useUserStore } from '@/stores/user'
import { useSpaceIntentStore } from '@/stores/spaceIntents'

const Dummy = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Dummy },
      { path: '/app/mine', component: Dummy },
      { path: '/app/mine/orders/:source/:id', component: Dummy }
    ]
  })
}

function mountOrdersPanel(props: Partial<InstanceType<typeof OrdersPanel>['$props']> = {}) {
  const pay = vi.fn()
  const openBills = vi.fn()
  const wrapper = mount(OrdersPanel, {
    props: {
      orderTab: 'buy',
      variant: 'mobile',
      subjectFilter: 'all',
      pay,
      openBills,
      ...props
    },
    global: { plugins: [makeRouter()] }
  })
  return { wrapper, pay, openBills }
}

describe('OrdersPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSpaceIntentStore().list = []
  })

  it('switches between buy content and placeholders', async () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy', variant: 'mobile' })
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)

    await wrapper.get('[data-testid="order-tab-vip"]').trigger('click')
    expect(wrapper.emitted('update:orderTab')?.[0]).toEqual(['vip'])
  })

  it('renders VIP and buy tabs only — no separate intent tab', async () => {
    const { wrapper } = mountOrdersPanel()
    expect(wrapper.find('[data-testid="order-tab-vip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-tab-buy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-tab-intent"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="order-tab-view"]').exists()).toBe(false)
  })

  it('lists space intents inside buy orders with status 意向单', async () => {
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy' })
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('意向单')
    expect(wrapper.text()).toContain('道路运输从业人员资格核验 API')
    expect(wrapper.find('[data-testid="my-space-intents"]').exists()).toBe(false)
  })

  it('hides converted intents from buy list after payment confirmation', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    store.claim(intent.id, user.enterprise.id)
    store.confirmOfflinePayment(intent.id, user.enterprise.id)
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy' })
    // 转单后意向卡片消失；买数列表可能仍有其它种子订单，但不含该意向 id
    expect(wrapper.find(`[data-testid="order-card-intent-${intent.id}"]`).exists()).toBe(false)
  })

  it('gives the active tab a distinguishing selected class', () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy' })
    const selected = wrapper.get('[data-testid="order-tab-buy"]')
    const unselectedVip = wrapper.get('[data-testid="order-tab-vip"]')

    expect(selected.classes()).toContain('border-brand-500')
    expect(selected.classes()).toContain('text-brand-600')
    expect(unselectedVip.classes()).not.toContain('border-brand-500')
  })

  it('shows VIP placeholder when orderTab is vip', () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'vip' })
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('VIP')
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
  })

  it('does not keep a 看数 tab', () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy' })
    expect(wrapper.text()).not.toContain('看数')
    expect(wrapper.find('[data-testid="order-tab-view"]').exists()).toBe(false)
  })

  it('passes BuyDataOrders props and re-emits subject filter', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, openBills } = mountOrdersPanel({ orderTab: 'buy' })

    await wrapper.find('[data-testid="api-bills-order-entry"]').trigger('click')
    expect(openBills).toHaveBeenCalledTimes(1)

    const enterpriseButton = wrapper.findAll('button').find((btn) => btn.text() === '企业')
    await enterpriseButton!.trigger('click')
    expect(wrapper.emitted('update:subjectFilter')?.[0]).toEqual(['enterprise'])
  })
})
