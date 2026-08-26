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

describe('SellerListingApply prices', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('asks for personal and enterprise prices and no longer requires screenshots', async () => {
    const wrapper = await mountForm()
    expect(wrapper.find('[data-testid="seller-listing-shots"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="seller-listing-custom-shots"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('字段信息')
    expect(wrapper.text()).not.toContain('样例数据')
    expect(wrapper.text()).not.toContain('结算方式')
    expect(wrapper.get('[data-testid="seller-listing-personal-price"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="seller-listing-enterprise-price"]').exists()).toBe(true)

    await wrapper.get('[data-testid="seller-listing-personal-price"]').setValue(88)
    await wrapper.get('[data-testid="seller-listing-enterprise-price"]').setValue(880)
    await wrapper.get('button.w-full').trigger('click')
    await flushPromises()
    const created = useSellerMarketStore().listings.find((item) => item.artifactId === 'artifact-route-otp')
    expect(created?.price).toBe(88)
    expect(created?.enterprisePrice).toBe(880)
    expect(wrapper.emitted('done')).toBeTruthy()
  })
})

describe('SellerListingApply catalog spec', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets the seller edit storefront copy that will appear on the product detail', async () => {
    const wrapper = await mountForm()
    expect(wrapper.get('[data-testid="seller-listing-granularity"]').exists()).toBe(true)
    const frequency = wrapper.get('[data-testid="seller-listing-update-frequency"]')
    expect(frequency.element.tagName).toBe('SELECT')
    expect(frequency.text()).toContain('每日更新')
    expect(frequency.text()).toContain('不定期')
    await wrapper.get('[data-testid="seller-listing-coverage"]').setValue('华东 12 仓')
    await wrapper.get('[data-testid="seller-listing-update-frequency"]').setValue('每周更新')
    await wrapper.get('[data-testid="seller-listing-scenarios"]').setValue('仓储运营')
    await wrapper.get('[data-testid="seller-listing-description"]').setValue('仓网周转天数、积压 SKU 与补货建议')
    await wrapper.get('[data-testid="seller-listing-value"]').setValue('快速识别高积压仓与滞销品类。')
    await wrapper.get('[data-testid="seller-listing-quality"]').setValue('口径已声明')
    await wrapper.get('button.w-full').trigger('click')
    await flushPromises()
    const created = useSellerMarketStore().listings.find((item) => item.artifactId === 'artifact-route-otp')
    expect(created?.catalogSpec).toMatchObject({
      coverage: '华东 12 仓',
      updateFrequency: '每周更新',
      scenarios: ['仓储运营'],
      description: '仓网周转天数、积压 SKU 与补货建议',
      valueProposition: '快速识别高积压仓与滞销品类。'
    })
  })
})
