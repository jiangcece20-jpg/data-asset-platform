import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import CheckoutItem from './CheckoutItem.vue'

async function mountCheckout() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/item/:id', name: 'checkout-item', component: CheckoutItem },
      { path: '/app/checkout/enterprise/:id', name: 'checkout-enterprise', component: { template: '<div />' } }
    ]
  })
  await router.push('/app/checkout/item/prod-logistics-monthly')
  await router.isReady()
  const wrapper = mount(CheckoutItem, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('CheckoutItem report purchase subject', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps enterprise unavailable until the current member enters an authenticated enterprise', async () => {
    const wrapper = await mountCheckout()

    expect(wrapper.get('[data-testid="purchase-subject-name"]').text()).toContain('陈静')
    expect(wrapper.get('[data-testid="purchase-subject-enterprise"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('认证后可选')
  })

  it('requires a fresh confirmation when the chosen report purchase subject changes', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const wrapper = await mountCheckout()

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
})
