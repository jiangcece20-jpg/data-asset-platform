import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import DatasetDetail from './DatasetDetail.vue'

describe('DatasetDetail samples empty state', () => {
  it('shows 当前无样例 for datasets without sample data', () => {
    const product = seedProducts.find((p) => p.id === 'prod-space-port-throughput')!
    const wrapper = mount(DatasetDetail, { props: { product, activeTab: 'samples' } })
    expect(wrapper.text()).toContain('当前无样例')
    expect(wrapper.text()).not.toContain('上架审核通过后提供脱敏样例')
  })

  it('still shows sample rows for published APP datasets', () => {
    const product = seedProducts.find((p) => p.id === 'prod-truck-trajectory')!
    const wrapper = mount(DatasetDetail, { props: { product, activeTab: 'samples' } })
    expect(wrapper.text()).toContain('310115')
    expect(wrapper.text()).not.toContain('当前无样例')
  })
})
