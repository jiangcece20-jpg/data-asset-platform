import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import SellerMarketAdmin from './SellerMarketAdmin.vue'

describe('SellerMarketAdmin listing shots', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets operators expand listing screenshots before approval', async () => {
    const wrapper = mount(SellerMarketAdmin)
    const listingTab = wrapper.findAll('button').find((btn) => btn.text().includes('上架审核'))
    await listingTab!.trigger('click')
    await wrapper.get('[data-testid="listing-shots-toggle-listing-pending-driver"]').trigger('click')
    expect(wrapper.get('[data-testid="selling-shot-gallery"]').text()).toContain('核心指标')
  })
})
