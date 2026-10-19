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

  it.each(['mobile', 'portal'] as const)('shows buy orders directly without order category tabs on %s', (variant) => {
    const { wrapper } = mountOrdersPanel({ variant })
    expect(wrapper.find(`[data-testid="${variant === 'portal' ? 'portal-my-orders' : 'my-orders'}"]`).exists()).toBe(true)
    expect(wrapper.find('[data-testid^="order-tab-"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mine-placeholder"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('VIP')
  })

  it('lists space intents inside buy orders with their actual status', async () => {
    useUserStore().completeEnterpriseAuth()
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    const { wrapper } = mountOrdersPanel({})
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('待领取')
    expect(wrapper.text()).toContain('道路运输从业人员资格核验 API')
    expect(wrapper.find('[data-testid="my-space-intents"]').exists()).toBe(false)
  })

  it('keeps entitled intents in the buy list without creating a normal order', async () => {
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
    store.effect(intent.id, '已完成开通')
    const { wrapper } = mountOrdersPanel({})
    expect(wrapper.find(`[data-testid="order-card-intent-${intent.id}"]`).exists()).toBe(true)
    expect(wrapper.text()).toContain('已支付')
    expect(wrapper.text()).not.toContain('权益生效')
  })

  it('does not keep a 看数 tab', () => {
    const { wrapper } = mountOrdersPanel({})
    expect(wrapper.text()).not.toContain('看数')
    expect(wrapper.find('[data-testid="order-tab-view"]').exists()).toBe(false)
  })

  it('keeps enterprise context without a subject picker or bills entry', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = mountOrdersPanel({ subjectFilter: 'enterprise' })

    expect(wrapper.find('[data-testid="api-bills-order-entry"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(true)
    expect(wrapper.findAll('button').find((btn) => btn.text() === '企业')).toBeFalsy()

    await wrapper.get('[data-testid="enterprise-order-filter-context"] button').trigger('click')
    expect(wrapper.emitted('update:subjectFilter')?.[0]).toEqual(['all'])
  })
})
