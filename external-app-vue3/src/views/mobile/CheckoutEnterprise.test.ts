import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import CheckoutEnterprise from './CheckoutEnterprise.vue'

async function mountEnterprise(intent?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/enterprise/:id', name: 'checkout-enterprise', component: CheckoutEnterprise },
      { path: '/app/checkout/item/:id', name: 'checkout-item', component: { template: '<div />' } }
    ]
  })
  await router.push({ path: '/app/checkout/enterprise/prod-logistics-monthly', query: intent ? { intent } : {} })
  await router.isReady()
  const wrapper = mount(CheckoutEnterprise, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('CheckoutEnterprise report checkout intent', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('returns a direct enterprise checkout deep link to the report checkout without creating an order', async () => {
    useUserStore().completeEnterpriseAuth()
    const beforeOrders = useOrderStore().list.length
    const { router } = await mountEnterprise()

    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(useOrderStore().list).toHaveLength(beforeOrders)
  })

  it.each(['forged', 'expired', 'consumed'] as const)('returns a %s checkout intent to report checkout without creating an order', async (state) => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useOrderStore()
    const intent = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'contract')
    if (state === 'expired') intent.expiresAt = '2000-01-01T00:00:00.000Z'
    if (state === 'consumed') store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'contract', intent.id)
    const beforeOrders = store.list.length
    const { router } = await mountEnterprise(state === 'forged' ? 'forged' : intent.id)

    expect(router.currentRoute.value.name).toBe('checkout-item')
    expect(store.list).toHaveLength(beforeOrders)
  })

  it('uses the intent-bound mode and submits only once', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useOrderStore()
    const intent = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'online')
    const { wrapper } = await mountEnterprise(intent.id)
    const submit = wrapper.get('[data-testid="enterprise-intent-submit"]')

    await submit.trigger('click')
    await submit.trigger('click')

    expect(store.list.filter((order) => order.productId === 'prod-logistics-monthly' && order.ownerType === 'enterprise')).toHaveLength(1)
  })
})
