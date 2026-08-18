import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import DashboardDetail from './DashboardDetail.vue'

describe('DashboardDetail selling shots', () => {
  it('shows the seller screenshot gallery on preview when shots exist', () => {
    const product = seedProducts.find((item) => item.id === 'prod-seller-route-board')!
    const wrapper = mount(DashboardDetail, {
      props: { product, activeTab: 'preview', unlocked: false }
    })
    expect(wrapper.get('[data-testid="selling-shot-gallery"]').text()).toContain('卖家卖点截图')
    expect(wrapper.get('[data-testid="selling-shot-overview"]').text()).toContain('总览一屏')
    expect(wrapper.get('[data-testid="custom-selling-shot-custom-demo-1"]').text()).toContain('线路对比专题')
    expect(wrapper.get('[data-testid="content-first-preview"]').exists()).toBe(true)
  })

  it('keeps generated peek only when the product has no selling shots', () => {
    const product = seedProducts.find((item) => item.id === 'prod-freight-index')!
    const wrapper = mount(DashboardDetail, {
      props: { product, activeTab: 'preview', unlocked: false }
    })
    expect(wrapper.find('[data-testid="selling-shot-gallery"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="content-first-preview"]').exists()).toBe(true)
  })
})
