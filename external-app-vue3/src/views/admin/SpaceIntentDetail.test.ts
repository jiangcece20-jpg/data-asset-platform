import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { OPS_STATUS_LABELS } from '@/domain/spaceIntent'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import SpaceIntentDetail from './SpaceIntentDetail.vue'

async function mountDetail(intentId: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/orders/intents/:id', name: 'admin-order-intent-detail', component: SpaceIntentDetail },
      { path: '/app/space-bridge/:id', name: 'space-bridge', component: { template: '<div />' } },
      { path: '/admin/orders', name: 'admin-orders', component: { template: '<div />' } }
    ]
  })
  await router.push(`/admin/orders/intents/${intentId}`)
  await router.isReady()
  return { wrapper: mount(SpaceIntentDetail, { global: { plugins: [router] } }), router }
}

function submitPersonalApi() {
  return useSpaceIntentStore().submit({
    productId: 'prod-qualification-api',
    contactName: '陈静',
    contactPhone: '13800000000',
    scenario: '司机核验'
  })
}

async function clickTestId(wrapper: Awaited<ReturnType<typeof mountDetail>>['wrapper'], testId: string) {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
  await flushPromises()
}

describe('SpaceIntentDetail', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSpaceIntentStore().list = []
    useUserStore().completeEnterpriseAuth()
  })

  it('claims an intent, confirms transaction and payment before fulfillment', async () => {
    const intent = submitPersonalApi()
    const { wrapper } = await mountDetail(intent.id)

    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.unclaimed)

    await clickTestId(wrapper, 'claim-intent')
    expect(intent.opsStatus).toBe('processing')
    expect(useOrderStore().list.some((item) => item.spaceIntentId === intent.id)).toBe(false)
    expect(wrapper.find('[data-testid="confirm-transaction"]').exists()).toBe(true)

    await clickTestId(wrapper, 'confirm-transaction')
    expect(intent.opsStatus).toBe('converted')
    const order = useOrderStore().list.find((item) => item.spaceIntentId === intent.id)
    expect(order?.status).toBe('payment_pending_confirmation')

    await clickTestId(wrapper, 'confirm-order-payment')
    expect(order?.status).toBe('paid')

    await clickTestId(wrapper, 'complete-fulfillment')
    expect(order?.status).toBe('entitlement_active')
  })

  it('keeps a dataset order in fulfillment until complete-delivery is shown', async () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '画像'
    })
    const { wrapper } = await mountDetail(intent.id)

    await clickTestId(wrapper, 'claim-intent')
    await clickTestId(wrapper, 'confirm-transaction')
    await clickTestId(wrapper, 'confirm-order-payment')
    expect(wrapper.findAll('button').some((item) => item.text() === '完成接入')).toBe(true)
  })

  it('does not render go-space-ops before the intent is claimed', async () => {
    const intent = submitPersonalApi()
    const { wrapper } = await mountDetail(intent.id)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(false)
  })

  it('shows requested enterprise and submitted operator contact before claim', async () => {
    const intent = useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验',
      requestedEnterpriseName: '希望落到的物流公司'
    })
    const { wrapper } = await mountDetail(intent.id)
    expect(wrapper.get('[data-testid="buyer-enterprise"]').text()).toBe('希望落到的物流公司')
    expect(wrapper.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 13800000000')
    expect(wrapper.get('[data-testid="product-type"]').text()).toBe('API')
  })

  it('closes an intent from the detail page only', async () => {
    const intent = submitPersonalApi()
    const { wrapper } = await mountDetail(intent.id)
    await wrapper.get('[data-testid="close-reason"]').setValue('客户放弃')
    await clickTestId(wrapper, 'close-intent')
    expect(intent.opsStatus).toBe('closed')
    expect(intent.closeReason).toBe('客户放弃')
  })
})
