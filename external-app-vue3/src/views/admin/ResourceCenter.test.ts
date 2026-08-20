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
    expect(wrapper.text()).toContain('未上架')
    const delistButtons = wrapper.findAll('button').filter((btn) => btn.text() === '下架')
    expect(delistButtons).toHaveLength(0)
  })
})
