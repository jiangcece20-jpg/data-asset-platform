import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import SellerListingApply from './SellerListingApply.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'

async function mountForm() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: SellerListingApply },
      { path: '/app/mine', component: { template: '<div />' } }
    ]
  })
  await router.push('/')
  await router.isReady()
  return mount(SellerListingApply, {
    props: { embedded: true, variant: 'mobile' },
    global: { plugins: [router] }
  })
}

describe('SellerListingApply selling shots', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('blocks submit until overview and kpi screenshots exist', async () => {
    const wrapper = await mountForm()
    await wrapper.get('button.w-full').trigger('click')
    expect(wrapper.text()).toContain('请上传总览一屏、核心指标截图')
    expect(useSellerMarketStore().listings.filter((item) => item.artifactId === 'artifact-route-otp')).toHaveLength(0)
  })

  it('submits after filling example screenshots', async () => {
    const wrapper = await mountForm()
    await wrapper.get('[data-testid="fill-example-shots"]').trigger('click')
    await wrapper.get('button.w-full').trigger('click')
    await flushPromises()
    const created = useSellerMarketStore().listings.find((item) => item.artifactId === 'artifact-route-otp')
    expect(created?.shots).toHaveLength(4)
    expect(wrapper.emitted('done')).toBeTruthy()
  })

  it('shows custom selling shots section on listing form', async () => {
    const wrapper = await mountForm()
    expect(wrapper.get('[data-testid="seller-listing-custom-shots"]').exists()).toBe(true)
    await wrapper.get('[data-testid="add-custom-shot"]').trigger('click')
    expect(wrapper.get('[data-testid="custom-shot-row-0"]').exists()).toBe(true)
  })
})
