import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import CommerceCenter from './CommerceCenter.vue'

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/commerce', component: CommerceCenter },
      { path: '/admin/resources/:id', component: { template: '<div />' } }
    ]
  })
  await router.push('/admin/commerce')
  await router.isReady()
  return { wrapper: mount(CommerceCenter, { global: { plugins: [router] } }), router }
}

describe('CommerceCenter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows one concise pricing table with the four supported price types', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('个人单品')
    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('企业单品')
    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('普通会员')
    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('高级会员')
    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('可售卖周期')
    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('交付保障至')
    expect(wrapper.get('[data-testid="product-pricing-table"]').text()).toContain('12 个月')
    expect(wrapper.text()).not.toContain('会员定价')
    expect(wrapper.text()).not.toContain('资产平台数据集销售方案')
    expect(wrapper.text()).not.toContain('查看订单中心')
  })

  it('shows the latest delivery commitment from fulfilled orders and ignores unpaid orders', async () => {
    const { wrapper } = await mountView()
    const rows = wrapper.findAll('[data-testid="pricing-row"]')
    const truckRow = rows.find((row) => row.text().includes('全国货车轨迹热力数据集'))
    const sellerRow = rows.find((row) => row.text().includes('华东干线时效看板'))

    expect(truckRow?.get('[data-testid="delivery-guarantee"]').text()).toContain('2027-07-29')
    expect(truckRow?.get('[data-testid="delivery-guarantee"]').text()).toContain('2 笔已售订单')
    expect(sellerRow?.get('[data-testid="delivery-guarantee"]').text()).toBe('暂无已售订单')
  })

  it('opens the resource edit page from the product name', async () => {
    const { wrapper, router } = await mountView()

    await wrapper.get('tbody button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/resources/res-prod-freight-index')
  })
})
