import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import CheckoutItem from './CheckoutItem.vue'

async function mountCheckout(productId = 'prod-logistics-monthly') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/item/:id', name: 'checkout-item', component: CheckoutItem },
      { path: '/app/checkout/enterprise/:id', name: 'checkout-enterprise', component: { template: '<div />' } },
      { path: '/app/product/:id', name: 'product-detail', component: { template: '<div />' } },
      { path: '/app/mine', component: { template: '<div />' } }
    ]
  })
  await router.push(`/app/checkout/item/${productId}`)
  await router.isReady()
  const wrapper = mount(CheckoutItem, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function checkoutPayButton(wrapper: Awaited<ReturnType<typeof mountCheckout>>['wrapper']) {
  const dual = wrapper.find('[data-testid="checkout-direct-purchase"]')
  return dual.exists() ? dual : wrapper.get('[data-testid="purchase-final-confirm"]')
}

async function clickCheckoutPay(wrapper: Awaited<ReturnType<typeof mountCheckout>>['wrapper']) {
  await checkoutPayButton(wrapper).trigger('click')
}

describe('CheckoutItem report purchase subject', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('returns a personal identity to product detail without creating an order', async () => {
    const beforeOrders = useOrderStore().list.length
    const { router } = await mountCheckout()
    expect(router.currentRoute.value.name).toBe('product-detail')
    expect(useOrderStore().list).toHaveLength(beforeOrders)
  })

  it('pays as the current enterprise identity and does not offer a personal switch', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout()

    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
    expect(wrapper.find('[data-testid="purchase-subject-personal"]').exists()).toBe(false)

    await clickCheckoutPay(wrapper)

    const order = useOrderStore().list.at(-1)!
    expect(order.ownerType).toBe('enterprise')
    expect(order.ownerId).toBe('ent-wanlian-logistics')
  })

  it('updates report payment modes when the prototype identity switches', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    const { wrapper, router } = await mountCheckout()
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
    expect(wrapper.text()).toContain('在线支付')
    expect(wrapper.text()).toContain('合同采购')

    useUserStore().switchMockPurchaseIdentity('personal')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('product-detail')
  })

  it('creates one enterprise online order and entitlement when the pay button is triggered twice immediately', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout()
    const confirm = checkoutPayButton(wrapper)

    await Promise.all([confirm.trigger('click'), confirm.trigger('click')])

    expect(useOrderStore().list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'enterprise')).toHaveLength(1)
    expect(useOrderStore().list.at(-1)?.entitlementGranted).toBe(true)
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

  it('creates a bound enterprise contract checkout intent after a single pay confirmation', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountCheckout()
    const contract = wrapper.findAll('button').find((button) => button.text() === '合同采购')!

    await contract.trigger('click')
    await clickCheckoutPay(wrapper)
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

  it('invalidates a prior enterprise checkout intent when the payment mode changes', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useOrderStore()
    const { wrapper } = await mountCheckout()
    const first = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'online')

    await wrapper.findAll('button').find((button) => button.text() === '合同采购')!.trigger('click')
    expect(store.getEnterpriseReportCheckoutIntent(first.id, 'prod-logistics-monthly')).toBeUndefined()
  })

  it('shows the enterprise price and locks the dashboard fixed purchase period', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountCheckout('prod-freight-index')

    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(wrapper.find('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
    expect(wrapper.find('[data-testid="checkout-dual-path"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="commerce-term-select"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="fixed-purchase-period"]').text()).toContain('12 个月（商品固定）')
    await clickCheckoutPay(wrapper)

    const order = useOrderStore().list.at(-1)!
    expect(order).toMatchObject({
      productId: 'prod-freight-index',
      ownerType: 'enterprise',
      entitlementGranted: true,
      serviceMode: 'one_time',
      selectedTermMonths: 12,
      amount: 1990
    })
  })

  it('charges the member price after enterprise membership is effective', async () => {
    useUserStore().completeEnterpriseAuth()
    useOrderStore().purchaseMember()
    const { wrapper } = await mountCheckout()

    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toContain('¥1,194')
    await clickCheckoutPay(wrapper)

    expect(useOrderStore().list.at(-1)).toMatchObject({
      productId: 'prod-logistics-monthly',
      ownerType: 'enterprise',
      amount: 1194
    })
  })

  it('shows dual-path checkout for enterprise non-members on member discount products', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout()

    expect(wrapper.find('[data-testid="checkout-dual-path"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="checkout-become-member"]').text()).toContain('成为团队会员')
    expect(wrapper.get('[data-testid="checkout-direct-purchase"]').text()).toContain('¥1,990')
  })

})

describe('CheckoutItem seller-market dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not allow a personal deep link to seller checkout', async () => {
    const beforeOrders = useOrderStore().list.length
    const { router } = await mountCheckout('prod-seller-route-board')
    expect(router.currentRoute.value.name).toBe('product-detail')
    expect(useOrderStore().list).toHaveLength(beforeOrders)
  })

  it('charges the enterprise list price without a member discount', async () => {
    useOrderStore().purchaseMember()
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout('prod-seller-route-board')

    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toMatch(/¥1,?990/)
    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).not.toContain('会员价')

    await clickCheckoutPay(wrapper)
    expect(useOrderStore().list.at(-1)).toMatchObject({
      productId: 'prod-seller-route-board',
      ownerType: 'enterprise',
      amount: 1990,
      settlementMode: 'platform_collect',
      status: 'entitlement_active'
    })
    expect(wrapper.text()).toContain('已交付')
    expect(wrapper.text()).toContain('PC端')
    const orders = wrapper.findAll('button').find((button) => button.text() === '查看我的订单')!
    await orders.trigger('click')
    await flushPromises()
    expect(useOrderStore().list.at(-1)?.biDeliveryId).toBeTruthy()
  })

  it('keeps enterprise contract purchase pending until platform confirms', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout('prod-seller-route-board')
    const contract = wrapper.findAll('button').find((button) => button.text() === '合同采购')!

    await contract.trigger('click')
    await clickCheckoutPay(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('已提交合同采购')
    expect(wrapper.text()).toContain('确认到账')
    expect(wrapper.text()).not.toContain('待开通')
    expect(useOrderStore().list.at(-1)).toMatchObject({
      productId: 'prod-seller-route-board',
      ownerType: 'enterprise',
      amount: 1990,
      status: 'pending_payment',
      paymentMethod: 'enterprise_contract',
      settlementMode: 'platform_collect',
      entitlementGranted: false
    })
  })

  it('shows source data time, frequency and fixed period before confirming merchant purchase', async () => {
    useUserStore().completeEnterpriseAuth()
    useCatalogStore().byId('prod-seller-route-board')!.typeDetail.dataset!.dataUpdatedAt = '2026-10-01T08:00:00'
    const { wrapper } = await mountCheckout('prod-seller-route-board')
    const summary = wrapper.get('[data-testid="merchant-delivery-summary"]').text()
    expect(summary).toContain('2026-10-01')
    expect(summary).toContain('每日更新')
    expect(summary).toContain('12 个月')
    expect(wrapper.text()).not.toContain('待开通')
  })

  it('explains delisting that occurs after checkout opens and creates no new order', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout('prod-seller-route-board')
    const count = useOrderStore().list.length
    useSellerMarketStore().forceDelist('prod-seller-route-board')
    await flushPromises()
    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toContain('当前不可购买')
    expect(useOrderStore().list).toHaveLength(count)
    expect(wrapper.findAll('button').some((button) => button.text() === '查看我的订单')).toBe(false)
  })
})
