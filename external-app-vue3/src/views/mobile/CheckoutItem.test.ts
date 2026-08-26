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

function checkoutPayButton(wrapper: Awaited<ReturnType<typeof mountCheckout>>['wrapper']) {
  const dual = wrapper.find('[data-testid="checkout-direct-purchase"]')
  return dual.exists() ? dual : wrapper.get('[data-testid="purchase-final-confirm"]')
}

async function clickCheckoutPay(wrapper: Awaited<ReturnType<typeof mountCheckout>>['wrapper']) {
  await checkoutPayButton(wrapper).trigger('click')
}

describe('CheckoutItem report purchase subject', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('pays once as the current personal identity without selecting a subject', async () => {
    const { wrapper } = await mountCheckout()

    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('个人 · 陈静')
    expect(wrapper.find('[data-testid="purchase-subject-personal"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="purchase-intent-confirm"]').exists()).toBe(false)

    await clickCheckoutPay(wrapper)

    const order = useOrderStore().list.at(-1)!
    expect(order).toMatchObject({ ownerType: 'personal', ownerId: 'mem-1' })
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
    const { wrapper } = await mountCheckout()
    expect(wrapper.text()).not.toContain('合同采购')

    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    await flushPromises()
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
    expect(wrapper.text()).toContain('在线支付')
    expect(wrapper.text()).toContain('合同采购')

    useUserStore().switchMockPurchaseIdentity('personal')
    await flushPromises()
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('个人 · 陈静')
    expect(wrapper.text()).not.toContain('合同采购')
  })

  it('creates one enterprise online order and entitlement when the pay button is triggered twice immediately', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout()
    const confirm = checkoutPayButton(wrapper)

    await Promise.all([confirm.trigger('click'), confirm.trigger('click')])

    expect(useOrderStore().list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'enterprise')).toHaveLength(1)
    expect(useOrderStore().list.at(-1)?.entitlementGranted).toBe(true)
  })

  it('keeps the personal pay button idempotent when it is triggered twice immediately', async () => {
    const { wrapper } = await mountCheckout()
    const beforeOrders = useOrderStore().list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'personal').length
    const confirm = checkoutPayButton(wrapper)

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

  it('shows one subject price and locks the dashboard fixed purchase period', async () => {
    const { wrapper, router } = await mountCheckout('prod-freight-index')

    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(wrapper.find('[data-testid="purchase-identity"]').text()).toContain('个人 · 陈静')
    expect(wrapper.find('[data-testid="checkout-dual-path"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="commerce-term-select"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="fixed-purchase-period"]').text()).toContain('12 个月（商品固定）')
    await clickCheckoutPay(wrapper)

    const order = useOrderStore().list.at(-1)!
    expect(order).toMatchObject({
      productId: 'prod-freight-index',
      ownerType: 'personal',
      entitlementGranted: true,
      serviceMode: 'one_time',
      selectedTermMonths: 12,
      amount: 199
    })
  })

  it('charges the member price after personal membership is effective on a discount product', async () => {
    useOrderStore().purchaseMember()
    const { wrapper } = await mountCheckout()

    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toContain('¥119.4')
    await clickCheckoutPay(wrapper)

    expect(useOrderStore().list.at(-1)).toMatchObject({
      productId: 'prod-logistics-monthly',
      ownerType: 'personal',
      amount: 119.4
    })
  })

  it('shows dual-path checkout for non-members on member discount products', async () => {
    const { wrapper } = await mountCheckout()

    expect(wrapper.find('[data-testid="checkout-dual-path"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="checkout-member-savings"]').text()).toContain('立省')
    await clickCheckoutPay(wrapper)

    expect(useOrderStore().list.at(-1)).toMatchObject({
      productId: 'prod-logistics-monthly',
      ownerType: 'personal',
      amount: 199
    })
  })
})

describe('CheckoutItem seller-market dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('charges the personal list price and leaves the order pending activation', async () => {
    const { wrapper } = await mountCheckout('prod-seller-route-board')

    expect(wrapper.text()).toContain('打款到平台')
    expect(wrapper.text()).toContain('待开通')
    expect(wrapper.text()).not.toContain('仅支持个人购买')
    expect(wrapper.text()).not.toContain('自收款')
    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toContain('¥199')

    await clickCheckoutPay(wrapper)
    expect(wrapper.text()).toContain('订单待运营开通')
    expect(useOrderStore().list.at(-1)).toMatchObject({
      productId: 'prod-seller-route-board',
      ownerType: 'personal',
      amount: 199,
      settlementMode: 'platform_collect',
      status: 'pending_activation',
      entitlementGranted: false
    })
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
      status: 'pending_activation'
    })
  })

  it('keeps enterprise contract purchase pending until platform confirms', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout('prod-seller-route-board')
    const contract = wrapper.findAll('button').find((button) => button.text() === '合同采购')!

    await contract.trigger('click')
    await clickCheckoutPay(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('已提交合同采购')
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
})
