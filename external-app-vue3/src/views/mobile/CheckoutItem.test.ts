import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import CheckoutItem from './CheckoutItem.vue'

async function mountCheckout(productId = 'prod-logistics-monthly') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/item/:id', name: 'checkout-item', component: CheckoutItem },
      { path: '/app/checkout/enterprise/:id', name: 'checkout-enterprise', component: { template: '<div />' } },
      { path: '/app/product/:id', name: 'product-detail', component: { template: '<div />' } }
    ]
  })
  await router.push(`/app/checkout/item/${productId}`)
  await router.isReady()
  const wrapper = mount(CheckoutItem, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('CheckoutItem report purchase subject', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps enterprise unavailable until the current member enters an authenticated enterprise', async () => {
    const { wrapper } = await mountCheckout()

    expect(wrapper.get('[data-testid="purchase-subject-name"]').text()).toContain('陈静')
    expect(wrapper.get('[data-testid="purchase-subject-enterprise"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('认证后可选')
  })

  it('requires a fresh confirmation when the chosen report purchase subject changes', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const { wrapper } = await mountCheckout()

    expect(wrapper.get('[data-testid="purchase-subject-name"]').text()).toContain('万联供应链管理有限公司')
    await wrapper.get('[data-testid="purchase-intent-confirm"]').trigger('click')
    expect(wrapper.get('[data-testid="purchase-final-confirm"]').text()).toContain('万联供应链管理有限公司')

    await wrapper.get('[data-testid="purchase-subject-personal"]').trigger('click')
    expect(wrapper.find('[data-testid="purchase-final-confirm"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="purchase-subject-name"]').text()).toContain('陈静')

    await wrapper.get('[data-testid="purchase-intent-confirm"]').trigger('click')
    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')

    const order = useOrderStore().list.at(-1)!
    expect(order.ownerType).toBe('personal')
    expect(order.ownerId).toBe('mem-1')
  })

  it('creates one enterprise online order and entitlement when the final confirmation is triggered twice immediately', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout()
    await wrapper.get('[data-testid="purchase-intent-confirm"]').trigger('click')
    const confirm = wrapper.get('[data-testid="purchase-final-confirm"]')

    await Promise.all([confirm.trigger('click'), confirm.trigger('click')])

    expect(useOrderStore().list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'enterprise')).toHaveLength(1)
    expect(useOrderStore().list.at(-1)?.entitlementGranted).toBe(true)
  })

  it('keeps the personal final confirmation idempotent when it is triggered twice immediately', async () => {
    const { wrapper } = await mountCheckout()
    const beforeOrders = useOrderStore().list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'personal').length
    await wrapper.get('[data-testid="purchase-intent-confirm"]').trigger('click')
    const confirm = wrapper.get('[data-testid="purchase-final-confirm"]')

    await Promise.all([confirm.trigger('click'), confirm.trigger('click')])

    expect(useOrderStore().list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'personal')).toHaveLength(beforeOrders + 1)
  })

  it.each([
    [false, 'prod-qualification-api'],
    [true, 'prod-qualification-api'],
    [false, 'prod-enterprise-activity'],
    [true, 'prod-enterprise-activity']
  ])('blocks a %s authenticated deep link to trusted-space product %s before it can create an APP order', async (authenticated, productId) => {
    if (authenticated) useUserStore().completeEnterpriseAuth()
    const beforeOrders = useOrderStore().list.length
    const { router } = await mountCheckout(productId)

    expect(router.currentRoute.value.name).toBe('product-detail')
    expect(useOrderStore().list).toHaveLength(beforeOrders)
  })

  it('creates a bound enterprise contract checkout intent only after the final report confirmation', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountCheckout()
    const contract = wrapper.findAll('button').find((button) => button.text() === '合同采购')!

    await contract.trigger('click')
    await wrapper.get('[data-testid="purchase-intent-confirm"]').trigger('click')
    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    await flushPromises()

    const intentId = String(router.currentRoute.value.query.intent)
    const intent = useOrderStore().checkoutIntents.find((item) => item.id === intentId)
    expect(router.currentRoute.value.name).toBe('checkout-enterprise')
    expect(intent).toMatchObject({
      productId: 'prod-logistics-monthly',
      ownerType: 'enterprise',
      ownerId: 'ent-wanlian-logistics',
      mode: 'contract'
    })
  })

  it('invalidates a prior enterprise checkout intent when the report subject or payment mode changes', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useOrderStore()
    const { wrapper } = await mountCheckout()
    const first = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'online')

    await wrapper.findAll('button').find((button) => button.text() === '合同采购')!.trigger('click')
    expect(store.getEnterpriseReportCheckoutIntent(first.id, 'prod-logistics-monthly')).toBeUndefined()

    const second = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'contract')
    await wrapper.get('[data-testid="purchase-subject-personal"]').trigger('click')
    expect(store.getEnterpriseReportCheckoutIntent(second.id, 'prod-logistics-monthly')).toBeUndefined()
  })

  it('continues to checkout an APP dashboard as a personal term item without showing report subjects', async () => {
    const { wrapper, router } = await mountCheckout('prod-freight-index')

    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(wrapper.find('[data-testid="purchase-subject-personal"]').exists()).toBe(false)
    await wrapper.get('[data-testid="personal-item-submit"]').trigger('click')

    const order = useOrderStore().list.at(-1)!
    expect(order).toMatchObject({ productId: 'prod-freight-index', ownerType: 'personal', entitlementGranted: true })
  })
})
