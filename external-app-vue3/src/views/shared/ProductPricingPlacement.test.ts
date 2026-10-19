import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import PortalProductDetail from '@/views/portal/PortalProductDetail.vue'
import MobileProductDetail from '@/views/mobile/ProductDetail.vue'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'

describe('detail pricing is independent of transaction actions', () => {
  beforeEach(() => setActivePinia(createPinia()))
  for (const [surface, component] of [['portal', PortalProductDetail], ['app', MobileProductDetail]] as const) {
    for (const id of ['prod-personal-waybill-dataset', 'prod-public-freight-dataset', 'prod-private-zero-dataset', 'prod-seller-route-board', 'prod-qualification-api', 'prod-freight-index']) {
      it(`${surface} keeps ${id} pricing in basic information, not actions`, async () => {
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: `/${surface}/product/:id`, component }] })
        await router.push(`/${surface}/product/${id}`)
        await router.isReady()
        const wrapper = mount(component, { global: { plugins: [router] } })
        await flushPromises()
        await wrapper.findAll('button').find(b => ['基本信息', '报告介绍'].includes(b.text()))?.trigger('click')
        const pricing = wrapper.get('[data-testid="detail-pricing"]')
        expect(pricing.text()).toContain('价格方案')
        expect(pricing.find('[data-testid="product-primary-action"]').exists()).toBe(false)
        expect(pricing.text()).not.toContain('试用会员不能购买')
        const description = pricing.get('[data-testid="pricing-description"]').text()
        expect(description).not.toContain('一句话说明：')
        const actions = wrapper.get('[data-testid="product-action-area"]')
        expect(actions.find('[data-testid="product-primary-action"]').exists()).toBe(true)
        expect(actions.text()).not.toContain('价格方案')
        expect(actions.text()).not.toMatch(/¥|￥|计费规则/)
        expect(actions.text()).not.toContain(description)
        expect(actions.find('[data-testid="product-action-headline"]').exists()).toBe(false)
        expect(actions.find('[data-testid="product-action-supporting"]').exists()).toBe(false)
        expect(actions.find('h2').exists()).toBe(false)
        const originalPrice = pricing.text()
        useUserStore().switchMockPurchaseIdentity('enterprise_member')
        useEntitlementStore().grantTeamMember()
        await flushPromises()
        expect(pricing.text()).toBe(originalPrice)
        expect(actions.text()).not.toMatch(/¥|￥|计费规则/)
        wrapper.unmount()
      })
    }
  }
})
