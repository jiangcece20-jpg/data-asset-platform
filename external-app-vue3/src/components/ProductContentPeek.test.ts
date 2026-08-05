import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import ProductContentPeek from './ProductContentPeek.vue'

describe('ProductContentPeek', () => {
  it('shows a dataset content summary instead of sample fields', () => {
    const product = seedProducts.find((item) => item.id === 'prod-truck-trajectory')!
    const wrapper = mount(ProductContentPeek, { props: { product } })

    expect(wrapper.get('[data-testid="product-content-summary"]').text()).toContain('货车轨迹')
    expect(wrapper.text()).not.toContain('district_code')
    expect(wrapper.text()).not.toContain('310115')
  })

  it('shows an API capability summary instead of endpoint docs', () => {
    const product = seedProducts.find((item) => item.id === 'prod-qualification-api')!
    const wrapper = mount(ProductContentPeek, { props: { product } })

    expect(wrapper.get('[data-testid="product-content-summary"]').text()).toContain('核验')
    expect(wrapper.text()).not.toContain('/api/v1/')
    expect(wrapper.text()).not.toContain('requestId')
  })

  it('shows report content instead of only commerce metadata', () => {
    const product = seedProducts.find((item) => item.id === 'prod-logistics-monthly')!
    const wrapper = mount(ProductContentPeek, { props: { product } })

    expect(wrapper.text()).toContain('行业报告')
    expect(wrapper.text()).toContain('行业运行总览')
    expect(wrapper.text()).toContain('全国公路物流运行总体平稳')
  })

  it('shows public dashboard values and a trend graphic', () => {
    const product = seedProducts.find((item) => item.id === 'prod-freight-index')!
    const wrapper = mount(ProductContentPeek, { props: { product } })

    expect(wrapper.text()).toContain('货运价格指数')
    expect(wrapper.text()).toContain('108.6')
    expect(wrapper.find('polyline').exists()).toBe(true)
  })
})
