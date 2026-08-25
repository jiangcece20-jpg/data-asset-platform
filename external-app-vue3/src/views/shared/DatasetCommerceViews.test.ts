import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DatasetCheckout from './DatasetCheckout.vue'
import DatasetPayment from './DatasetPayment.vue'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'

const Dummy = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/checkout/dataset/:id', component: DatasetCheckout },
      { path: '/app/payment/dataset/:orderId', component: DatasetPayment },
      { path: '/app/mine', component: Dummy },
      { path: '/app/mine/enterprise', component: Dummy },
      { path: '/app/enterprise-auth', component: Dummy },
      { path: '/portal/checkout/dataset/:id', component: DatasetCheckout },
      { path: '/portal/payment/dataset/:orderId', component: DatasetPayment },
      { path: '/portal/mine', component: Dummy }
    ]
  })
}

async function mountRoute(path: string, component: typeof DatasetCheckout | typeof DatasetPayment) {
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  return { router, wrapper: mount(component, { global: { plugins: [router] } }) }
}

describe('dataset commerce views', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates a personal order from checkout and goes straight to payment', async () => {
    const { router, wrapper } = await mountRoute('/app/checkout/dataset/prod-truck-trajectory', DatasetCheckout)
    await flushPromises()
    expect(wrapper.find('[data-testid="dataset-subject-personal"]').exists()).toBe(false)
    expect(router.currentRoute.value.path).toMatch(/^\/app\/payment\/dataset\/order-dataset-/)
  })

 it('submits an enterprise approval for an ordinary member and lands on payment', async () => {
   const user = useUserStore()
   user.context.currentMemberId = 'mem-2'
   user.completeEnterpriseAuth()
    user.enterprise.purchasePolicy.memberPurchaseApprovalRequired = true
    const { router } = await mountRoute('/app/checkout/dataset/prod-truck-trajectory', DatasetCheckout)
    await flushPromises()
    expect(router.currentRoute.value.path).toMatch(/^\/app\/payment\/dataset\/order-dataset-/)

    const { wrapper } = await mountRoute(router.currentRoute.value.path, DatasetPayment)
    expect(wrapper.find('[data-testid="dataset-approval-submitted"]').text()).toContain('待管理员审批')
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('万联供应链管理有限公司')
  })

  it('demonstrates paid-but-failed use-module delivery and a successful retry', async () => {
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'personal')
    const { wrapper } = await mountRoute(`/app/payment/dataset/${order.id}`, DatasetPayment)
    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('个人 · 陈静')
    await wrapper.find('[data-testid="dataset-pay-fail-delivery"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="dataset-delivery-failed"]').text()).toContain('支付已成功')
    await wrapper.find('[data-testid="dataset-retry-delivery"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="dataset-delivery-success"]').text()).toContain('数据已交付至用数模块')
  })

  it('uses the current enterprise identity in the PC portal without a subject picker', async () => {
    useUserStore().completeEnterpriseAuth()
    const { router, wrapper } = await mountRoute('/portal/checkout/dataset/prod-truck-trajectory', DatasetCheckout)
    await flushPromises()
    expect(wrapper.find('[data-testid="dataset-subject-enterprise"]').exists()).toBe(false)
    expect(router.currentRoute.value.path).toMatch(/^\/portal\/payment\/dataset\/order-dataset-/)
  })

  it('offers enterprise-only payment methods without personal payment', async () => {
    useUserStore().completeEnterpriseAuth()
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'enterprise')
    const { wrapper } = await mountRoute(`/app/payment/dataset/${order.id}`, DatasetPayment)

    expect(wrapper.get('[data-testid="purchase-identity"]').text()).toContain('企业 · 万联供应链管理有限公司')
    expect(wrapper.find('[data-testid="dataset-payment-enterprise_balance"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dataset-payment-enterprise_contract"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dataset-payment-enterprise_bank_transfer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dataset-payment-personal_online"]').exists()).toBe(false)

    await wrapper.find('[data-testid="dataset-payment-enterprise_contract"]').trigger('click')
    await wrapper.find('[data-testid="dataset-pay"]').trigger('click')
    await flushPromises()
    expect(order.paymentMethod).toBe('enterprise_contract')
    expect(order.contractStatus).toBe('payment_confirmed')
  })
})
