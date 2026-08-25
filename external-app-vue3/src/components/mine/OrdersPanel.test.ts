import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import OrdersPanel from './OrdersPanel.vue'
import { useUserStore } from '@/stores/user'
import { useSpaceIntentStore } from '@/stores/spaceIntents'

function mountOrdersPanel(props: Partial<InstanceType<typeof OrdersPanel>['$props']> = {}) {
  const goProduct = vi.fn()
  const pay = vi.fn()
  const openBills = vi.fn()
  const wrapper = mount(OrdersPanel, {
    props: {
      orderTab: 'buy',
      variant: 'mobile',
      subjectFilter: 'all',
      goProduct,
      pay,
      openBills,
      ...props
    }
  })
  return { wrapper, goProduct, pay, openBills }
}

describe('OrdersPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('switches between buy content and placeholders', async () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy', variant: 'mobile' })
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)

    await wrapper.get('[data-testid="order-tab-vip"]').trigger('click')
    expect(wrapper.emitted('update:orderTab')?.[0]).toEqual(['vip'])
  })

  it('renders secondary tabs and emits update:orderTab on click', async () => {
    const { wrapper } = mountOrdersPanel()
    expect(wrapper.find('[data-testid="order-tab-vip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-tab-buy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-tab-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-tab-intent"]').exists()).toBe(true)

    await wrapper.get('[data-testid="order-tab-view"]').trigger('click')
    expect(wrapper.emitted('update:orderTab')?.[0]).toEqual(['view'])
  })

  it('lists space intents with user-facing status only', async () => {
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    const { wrapper } = mountOrdersPanel({ orderTab: 'intent' })
    expect(wrapper.get('[data-testid="order-tab-intent"]').text()).toBe('意向单')
    expect(wrapper.text()).toContain('已提交')
    expect(wrapper.text()).not.toContain('待领取')
    expect(wrapper.text()).not.toContain('前往可信空间购买')
  })

  it('hides converted intents from the intent tab after payment confirmation', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const intent = useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    useSpaceIntentStore().confirmOfflinePayment(intent.id, user.enterprise.id)
    const { wrapper } = mountOrdersPanel({ orderTab: 'intent' })
    expect(wrapper.text()).toContain('暂无意向单')
    expect(wrapper.text()).not.toContain('道路运输从业人员资格核验 API')
  })

  it('gives the active tab a distinguishing selected class', () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'buy' })
    const selected = wrapper.get('[data-testid="order-tab-buy"]')
    const unselectedVip = wrapper.get('[data-testid="order-tab-vip"]')
    const unselectedView = wrapper.get('[data-testid="order-tab-view"]')

    expect(selected.classes()).toContain('border-brand-500')
    expect(selected.classes()).toContain('text-brand-600')
    expect(unselectedVip.classes()).not.toContain('border-brand-500')
    expect(unselectedView.classes()).not.toContain('border-brand-500')
  })

  it('shows VIP placeholder when orderTab is vip', () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'vip' })
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('VIP')
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
  })

  it('shows view placeholder when orderTab is view', () => {
    const { wrapper } = mountOrdersPanel({ orderTab: 'view' })
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('看数')
  })

  it('passes BuyDataOrders props and re-emits subject and view events', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, openBills } = mountOrdersPanel({ orderTab: 'buy' })

    await wrapper.find('[data-testid="api-bills-order-entry"]').trigger('click')
    expect(openBills).toHaveBeenCalledTimes(1)

    const enterpriseButton = wrapper.findAll('button').find((btn) => btn.text() === '企业')
    await enterpriseButton!.trigger('click')
    expect(wrapper.emitted('update:subjectFilter')?.[0]).toEqual(['enterprise'])

    const link = wrapper.findAll('button').find((btn) => btn.text() === '查看我的数据')
    await link!.trigger('click')
    expect(wrapper.emitted('view-purchased-data')).toBeTruthy()
  })
})
