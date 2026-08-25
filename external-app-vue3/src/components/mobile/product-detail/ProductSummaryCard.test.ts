import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import ProductSummaryCard from './ProductSummaryCard.vue'

describe('ProductSummaryCard space chips', () => {
  it('shows owned space name to users, never 自有', () => {
    const product = seedProducts.find((p) => p.id === 'prod-enterprise-activity')!
    const wrapper = mount(ProductSummaryCard, { props: { product, title: product.name } })
    expect(wrapper.text()).toContain(OWNED_SPACE_NAME)
    expect(wrapper.text()).toContain('有样例')
    expect(wrapper.text()).not.toContain('自有')
    expect(wrapper.text()).not.toContain('互联')
  })
})
