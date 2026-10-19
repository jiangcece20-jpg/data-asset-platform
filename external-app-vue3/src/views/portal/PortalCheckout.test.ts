import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { usePortalPurchaseStore } from '@/stores/portalPurchase'
import { useUserStore } from '@/stores/user'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import PortalCheckout from './PortalCheckout.vue'

async function mountCheckout(query: Record<string, string> = {}, productId = 'prod-logistics-monthly') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/portal/checkout/:id', name: 'portal-checkout', component: PortalCheckout },
      { path: '/app/checkout/member', name: 'checkout-member', component: { template: '<div />' } },
      { path: '/portal/mine', component: { template: '<div />' } }
    ]
  })
  await router.push({ path: `/portal/checkout/${productId}`, query })
  await router.isReady()
  const wrapper = mount(PortalCheckout, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('PortalCheckout selected price path', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useEntitlementStore().list = []
    useOrderStore().list = []
  })

  it('charges the selected item price and skips the dual-path choice', async () => {
    useUserStore().completeEnterpriseAuth()
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    const expected = usePortalPurchaseStore().amount(product, 'item')
    const { wrapper } = await mountCheckout({ pricePath: 'item', skipDual: '1' })

    expect(wrapper.find('[data-testid="checkout-dual-path"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toContain(expected.toLocaleString('zh-CN'))

    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    await flushPromises()

    const order = useOrderStore().list.at(-1)!
    expect(order.productId).toBe(product.id)
    expect(order.amount).toBe(expected)
    expect(wrapper.text()).toContain('支付成功')
  })

  it('charges the selected member price instead of auto-applying membership', async () => {
    useUserStore().completeEnterpriseAuth()
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    product.memberBenefits = [{ tier: 'standard', mode: 'discount', discount: 0.6 }]
    useOrderStore().purchaseMember()
    const expected = usePortalPurchaseStore().amount(product, 'member')
    const itemPrice = usePortalPurchaseStore().amount(product, 'item')
    const { wrapper } = await mountCheckout({ pricePath: 'member', skipDual: '1' })

    expect(expected).toBeLessThan(itemPrice)
    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toContain('会员价')

    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    await flushPromises()

    expect(useOrderStore().list.at(-1)!.amount).toBe(expected)
  })

  it('blocks a duplicate confirm and stays on checkout', async () => {
    useUserStore().completeEnterpriseAuth()
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    const user = useUserStore()
    useOrderStore().list.push({
      id: 'order-pending-report',
      channel: 'app',
      ownerType: 'enterprise',
      ownerId: user.context.currentEnterpriseId!,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      amount: 199,
      status: 'pending_payment',
      createdAt: '2026-09-17T02:00:00.000Z'
    })
    const count = useOrderStore().list.length
    const { wrapper, router } = await mountCheckout({ pricePath: 'item', skipDual: '1' })

    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    await flushPromises()

    expect(useOrderStore().list).toHaveLength(count)
    expect(wrapper.get('[role="status"]').text()).toBe('您有进行中的订单，请勿重复下单')
    expect(router.currentRoute.value.path).toBe(`/portal/checkout/${product.id}`)
  })

  it('hands membership checkout back to the PC product detail', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountCheckout()
    await wrapper.get('[data-testid="checkout-become-member"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/app/checkout/member')
    expect(router.currentRoute.value.query).toMatchObject({
      returnProduct: 'prod-logistics-monthly',
      returnPortal: '1'
    })
  })

  it('blocks personal direct links to PC checkout', async () => {
    const { wrapper } = await mountCheckout({ pricePath: 'item' })
    expect(wrapper.text()).toContain('试用会员不能购买或申请。')
    expect(wrapper.find('[data-testid="purchase-final-confirm"]').exists()).toBe(false)
    expect(useOrderStore().list).toHaveLength(0)
  })
})

describe('PortalCheckout merchant delivery', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows the purchased version and completes online delivery with an order entry', async () => {
    useUserStore().completeEnterpriseAuth()
    useCatalogStore().byId('prod-seller-route-board')!.typeDetail.dataset!.dataUpdatedAt = '2026-10-01T08:00:00'
    const { wrapper, router } = await mountCheckout({}, 'prod-seller-route-board')
    const summary = wrapper.get('[data-testid="merchant-delivery-summary"]').text()
    expect(summary).toContain('2026-10-01')
    expect(summary).toContain('每日更新')
    expect(summary).toContain('12 个月')
    expect(wrapper.text()).not.toContain('待开通')
    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    expect(wrapper.text()).toContain('已交付')
    expect(useOrderStore().list.at(-1)?.biDeliveryId).toBeTruthy()
    await wrapper.findAll('button').find((button) => button.text().includes('查看我的订单'))!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/mine')
    expect(router.currentRoute.value.query).toMatchObject({ menu: 'orders', orderTab: 'buy' })
  })

  it('keeps contracts awaiting payment confirmation without promising manual activation', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout({}, 'prod-seller-route-board')
    await wrapper.findAll('button').find((button) => button.text() === '合同采购')!.trigger('click')
    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    expect(wrapper.text()).toContain('待平台确认到账')
    expect(wrapper.text()).not.toContain('待开通')
    expect(useOrderStore().list.at(-1)?.entitlementGranted).toBe(false)
  })

  it('explains a merchant delisting after checkout opens and blocks submission', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountCheckout({}, 'prod-seller-route-board')
    const count = useOrderStore().list.length
    useSellerMarketStore().forceDelist('prod-seller-route-board')
    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toContain('当前不可购买')
    expect(useOrderStore().list).toHaveLength(count)
  })
})
