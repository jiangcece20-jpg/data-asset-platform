import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import SellerMarketAdmin from './SellerMarketAdmin.vue'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'

describe('SellerMarketAdmin listing content', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets operators expand listing catalog spec without screenshot wall', async () => {
    const wrapper = mount(SellerMarketAdmin)
    const listingTab = wrapper.findAll('button').find((btn) => btn.text().includes('上架审核'))
    await listingTab!.trigger('click')
    await wrapper.get('[data-testid="listing-shots-toggle-listing-pending-driver"]').trigger('click')
    expect(wrapper.find('[data-testid="selling-shot-gallery"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).toContain('司机 × 周')
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).toContain('个人价：¥99')
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).toContain('企业价：¥990')
  })
})

describe('SellerMarketAdmin activation', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets operators activate a paid seller order that is waiting to go live', async () => {
    const wrapper = mount(SellerMarketAdmin)
    const ordersTab = wrapper.findAll('button').find((btn) => btn.text().includes('商家订单'))
    await ordersTab!.trigger('click')
    expect(wrapper.text()).toContain('待开通')
    await wrapper.get('[data-testid="seller-admin-activate"]').trigger('click')
    expect(useOrderStore().list.find((item) => item.id === 'order-seller-paid-001')?.status).toBe('entitlement_active')
    expect(useEntitlementStore().list.some((item) => item.orderId === 'order-seller-paid-001' && item.status === 'active')).toBe(true)
  })
})
