import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import DashboardDetail from './DashboardDetail.vue'

describe('DashboardDetail selling shots', () => {
  it('keeps generated peek only when the product has no selling shots', () => {
    const product = seedProducts.find((item) => item.id === 'prod-freight-index')!
    const wrapper = mount(DashboardDetail, {
      props: { product, activeTab: 'preview', unlocked: false }
    })
    expect(wrapper.find('[data-testid="selling-shot-gallery"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="content-first-preview"]').exists()).toBe(true)
  })
})
