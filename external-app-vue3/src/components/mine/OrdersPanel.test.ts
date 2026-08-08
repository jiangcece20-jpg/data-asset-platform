import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import OrdersPanel from './OrdersPanel.vue'
import { useUserStore } from '@/stores/user'

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

    await wrapper.get('[data-testid="order-tab-view"]').trigger('click')
    expect(wrapper.emitted('update:orderTab')?.[0]).toEqual(['view'])
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
