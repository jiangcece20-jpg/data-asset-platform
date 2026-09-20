import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PortalDetailTabs from '@/views/portal/components/PortalDetailTabs.vue'
import PortalProductDetail from './PortalProductDetail.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'

async function mountProductDetail(productId: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/portal/product/:id', component: PortalProductDetail },
      { path: '/portal/mine', component: { template: '<div />' } },
      { path: '/portal/checkout/:id', component: { template: '<div />' } },
      { path: '/app/checkout/member', component: { template: '<div />' } }
    ]
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

  it('keeps space API tabs to basic and docs, with error messages under docs and no provider in resource info', async () => {
    const wrapper = await mountProductDetail('prod-qualification-api')

    expect(wrapper.text()).not.toContain('在线调试')
    expect(wrapper.text()).not.toContain('错误码与 SLA')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).not.toContain('提供方')
    expect(wrapper.get('[data-testid="detail-provider"]').text()).toContain('提供方信息')

    await wrapper.findAll('button').find((b) => b.text() === '接口文档')!.trigger('click')
    await flushPromises()
    const errorCodes = wrapper.get('[data-testid="api-error-codes"]')
    expect(errorCodes.text()).toContain('错误码')
    expect(errorCodes.text()).toContain('参数缺失')
    expect(errorCodes.text()).not.toContain('40001')
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

describe('PortalProductDetail owned dataset', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps the purchase action and blocks duplicate acquisition in place', async () => {
    const wrapper = await mountProductDetail('prod-warehouse-turnover-risk')

    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toMatch(/^单品购买｜¥/)
    expect(wrapper.text()).toContain('可在“我的订单”查看交付并进入用数模块')
    expect(wrapper.text()).not.toContain('查看我的数据')

    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/product/prod-warehouse-turnover-risk')
    expect(wrapper.get('[role="status"]').text()).toBe('您已拥有该商品权益，无需重复获取')
  })
})

describe('PortalProductDetail V1.0.0 purchase actions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('hides guest prices and returns from login without creating an order', async () => {
    const user = useUserStore()
    user.context.loggedIn = false
    const orders = useOrderStore()
    const count = orders.list.length
    const wrapper = await mountProductDetail('prod-truck-trajectory')
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toBe('登录查看价格')
    expect(wrapper.find('[data-testid="purchase-price"]').exists()).toBe(false)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await wrapper.get('[data-testid="purchase-login-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toMatch(/^单品购买｜¥/)
    expect(orders.list).toHaveLength(count)
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/portal/product/prod-truck-trajectory')
  })

  it('keeps item first for members and allows item purchase alongside free membership', async () => {
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    product.acquisitions = ['item_purchase', 'member']
    product.memberBenefits = [{ tier: 'standard', mode: 'free' }]
    const entitlements = useEntitlementStore()
    entitlements.list = []
    entitlements.grantMember()
    const wrapper = await mountProductDetail(product.id)
    expect(wrapper.get('[data-testid="product-primary-action"]').text()).toMatch(/^单品购买｜¥/)
    expect(wrapper.get('[data-testid="product-secondary-action"]').text()).toBe('会员价｜¥0')
    await wrapper.get('[data-testid="product-secondary-action"]').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toBe('您已享会员免费权益，无需重复获取')
  })

  it('opens membership checkout with a portal return', async () => {
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    product.acquisitions = ['item_purchase', 'member']
    useEntitlementStore().list = []
    const wrapper = await mountProductDetail(product.id)
    expect(wrapper.get('[data-testid="product-secondary-action"]').text()).toMatch(/^开通会员｜会员价/)
    await wrapper.get('[data-testid="product-secondary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/app/checkout/member')
    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({
      returnProduct: product.id,
      returnPortal: '1'
    })
  })

  it('sends the selected item price into portal checkout', async () => {
    const product = useCatalogStore().byId('prod-logistics-monthly')!
    product.acquisitions = ['item_purchase', 'member']
    useEntitlementStore().list = []
    const wrapper = await mountProductDetail(product.id)
    await wrapper.get('[data-testid="product-primary-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe(`/portal/checkout/${product.id}`)
    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({
      pricePath: 'item',
      skipDual: '1'
    })
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
