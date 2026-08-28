import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import ResourceCenter from './ResourceCenter.vue'

async function mountCenter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/resources', component: ResourceCenter },
      { path: '/admin/resources/:id', component: { template: '<div />' } }
    ]
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push('/admin/resources')
  await router.isReady()
  return mount(ResourceCenter, { global: { plugins: [router, pinia] } })
}

describe('ResourceCenter listing entry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('only offers edit and does not show packaging modal or list delist', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.text()).toContain('编辑')
    expect(wrapper.text()).not.toContain('包装为商品')
    const delistButtons = wrapper.findAll('button').filter((btn) => btn.text() === '下架')
    expect(delistButtons).toHaveLength(0)
  })

  it('defaults to the products tab and hides unlisted resources', async () => {
    const wrapper = await mountCenter()
    expect(wrapper.get('[data-testid="resource-center-tab-products"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).not.toContain('未上架')
    expect(wrapper.text()).not.toContain('货车轨迹明细数据集')
  })

  it('shows unlisted resources on the resources tab', async () => {
    const wrapper = await mountCenter()
    await wrapper.get('[data-testid="resource-center-tab-resources"]').trigger('click')
    expect(wrapper.get('[data-testid="resource-center-tab-resources"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('未上架')
    expect(wrapper.text()).toContain('货车轨迹明细数据集')
  })
})
