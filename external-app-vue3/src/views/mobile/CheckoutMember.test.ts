import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import CheckoutMember from './CheckoutMember.vue'

async function mountMember() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/member', name: 'checkout-member', component: CheckoutMember },
      { path: '/app/product/:id', name: 'product-detail', component: { template: '<div />' } }
    ]
  })
  await router.push({ path: '/app/checkout/member', query: { returnProduct: 'prod-freight-index' } })
  await router.isReady()
  const wrapper = mount(CheckoutMember, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('CheckoutMember VIP handoff', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('hands VIP purchase to the other product team instead of charging here', async () => {
    const { wrapper } = await mountMember()
    expect(wrapper.text()).toContain('购买 VIP')
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
    expect(wrapper.find('[data-testid="membership-plan"]').exists()).toBe(false)
  })
})
