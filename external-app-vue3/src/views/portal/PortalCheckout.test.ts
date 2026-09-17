import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { usePortalPurchaseStore } from '@/stores/portalPurchase'
import { useUserStore } from '@/stores/user'
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
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    const expected = usePortalPurchaseStore().amount(product, 'item')
    const { wrapper } = await mountCheckout({ pricePath: 'item', skipDual: '1' })

    expect(wrapper.find('[data-testid="checkout-dual-path"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="fixed-item-price"]').text()).toContain(String(expected))

    await wrapper.get('[data-testid="purchase-final-confirm"]').trigger('click')
    await flushPromises()

    const order = useOrderStore().list.at(-1)!
    expect(order.productId).toBe(product.id)
    expect(order.amount).toBe(expected)
    expect(wrapper.text()).toContain('支付成功')
  })

  it('charges the selected member price instead of auto-applying membership', async () => {
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    product.memberBenefits = [{ tier: 'standard', mode: 'discount', discount: 0.6 }]
    useEntitlementStore().grantMember()
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
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    const user = useUserStore()
    useOrderStore().list.push({
      id: 'order-pending-report',
      channel: 'app',
      ownerType: 'personal',
      ownerId: user.context.currentMemberId,
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
    const { wrapper, router } = await mountCheckout()
    await wrapper.get('[data-testid="checkout-become-member"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/app/checkout/member')
    expect(router.currentRoute.value.query).toMatchObject({
      returnProduct: 'prod-logistics-monthly',
      returnPortal: '1'
    })
  })
})
