import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PortalDetailTabs from '@/views/portal/components/PortalDetailTabs.vue'
import PortalProductDetail from './PortalProductDetail.vue'

async function mountProductDetail(productId: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/portal/product/:id', component: PortalProductDetail }]
  })
  await router.push(`/portal/product/${productId}`)
  await router.isReady()
  const wrapper = mount(PortalProductDetail, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('PortalProductDetail space intent CTA', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows submit-intent as the primary action for space products', async () => {
    const wrapper = await mountProductDetail('prod-qualification-api')
    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('提交试用申请')
    expect(wrapper.text()).not.toContain('前往可信空间购买')
    expect(wrapper.text()).not.toContain('个人身份不能下单')
  })

  it('shows the space dataset sync material wall like space APIs', async () => {
    const wrapper = await mountProductDetail('prod-space-port-throughput')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('提交试用申请')
    expect(wrapper.get('[data-testid="trusted-space-purchase-eligibility"]').text()).toContain('提交试用申请')
    expect(wrapper.get('[data-testid="detail-provider"]').text()).toContain('提供方信息')
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).toContain('合法合规声明')
    expect(wrapper.get('[data-testid="space-billing-rules"]').text()).toContain('计费规则')
    expect(wrapper.text()).toContain('来自可信空间')
    expect(wrapper.text()).toContain('覆盖某省主要港口的集装箱与货物吞吐量指标')
  })
})

describe('PortalProductDetail samples empty copy', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows 当前无样例 for datasets without sample data', async () => {
    const wrapper = await mountProductDetail('prod-space-port-throughput')
    await wrapper.findAll('button').find((b) => b.text() === '样例数据')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('当前无样例')
    expect(wrapper.text()).not.toContain('上架审核通过后提供脱敏样例')
  })
})

describe('PortalProductDetail default tabs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    ['prod-truck-trajectory', 'basic'],
    ['prod-qualification-api', 'basic'],
    ['prod-logistics-monthly', 'reader'],
    ['prod-freight-index', 'preview']
  ])('opens %s in %s', async (productId, expectedTab) => {
    const wrapper = await mountProductDetail(productId)

    expect(wrapper.findComponent(PortalDetailTabs).props('modelValue')).toBe(expectedTab)
  })
})
