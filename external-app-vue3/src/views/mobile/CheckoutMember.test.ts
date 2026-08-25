import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from '@/stores/user'
import CheckoutMember from './CheckoutMember.vue'

async function mountMember(query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/member', name: 'checkout-member', component: CheckoutMember },
      { path: '/app/product/:id', name: 'product-detail', component: { template: '<div />' } },
      { path: '/app/checkout/item/:id', name: 'checkout-item', component: { template: '<div />' } }
    ]
  })
  await router.push({ path: '/app/checkout/member', query })
  await router.isReady()
  const wrapper = mount(CheckoutMember, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('CheckoutMember identity plans', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sells the personal yearly plan for the current personal identity', async () => {
    const { wrapper } = await mountMember({ returnProduct: 'prod-freight-index' })
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('个人 · 陈静')
    expect(wrapper.get('[data-testid="membership-plan"]').text()).toContain('万联灵析个人版')
    expect(wrapper.get('[data-testid="membership-plan"]').text()).toMatch(/1,?099/)
  })

  it('sells the team yearly plan after switching to the enterprise identity', async () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    const { wrapper } = await mountMember({ returnProduct: 'prod-logistics-monthly' })
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
    expect(wrapper.get('[data-testid="membership-plan"]').text()).toContain('万联灵析企业版')
    expect(wrapper.get('[data-testid="membership-plan"]').text()).toMatch(/3,?199/)
  })
})
