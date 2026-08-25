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
      { path: '/admin/space-intents/:id', name: 'admin-space-intents-detail', component: SpaceIntentDetail },
      { path: '/app/space-bridge/:id', name: 'space-bridge', component: { template: '<div />' } }
    ]
  })
  await router.push(`/admin/space-intents/${intentId}`)
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

async function clickLabel(wrapper: Awaited<ReturnType<typeof mountDetail>>['wrapper'], label: string) {
  const btn = wrapper.findAll('button').find((item) => item.text() === label)
  expect(btn, `missing button ${label}`).toBeTruthy()
  await btn!.trigger('click')
  await flushPromises()
}

describe('SpaceIntentDetail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('walks a personal API intent from unclaimed through payment confirmation to fulfillment', async () => {
    const intent = submitPersonalApi()
    const { wrapper, router } = await mountDetail(intent.id)

    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.unclaimed)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('确认企业、确认方案、线下试用均在线下完成')

    await clickLabel(wrapper, '领取')
    expect(intent.opsStatus).toBe('processing')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.processing)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(true)

    const user = useUserStore()
    user.completeEnterpriseAuth()
    await clickLabel(wrapper, '确认到账')
    expect(intent.opsStatus).toBe('converted')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.converted)
    const order = useOrderStore().list.find((item) => item.spaceIntentId === intent.id)
    expect(order?.status).toBe('paid')

    await wrapper.get('[data-testid="go-space-ops"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      name: 'space-bridge',
      params: { id: intent.productId },
      query: { intent: `ops-${intent.id}` }
    })

    await router.push(`/admin/space-intents/${intent.id}`)
    await flushPromises()

    await clickLabel(wrapper, '完成开通')
    expect(order?.status).toBe('entitlement_active')
    expect(wrapper.find('[data-testid="complete-fulfillment"]').exists()).toBe(false)
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

    await clickLabel(wrapper, '领取')
    const user = useUserStore()
    user.completeEnterpriseAuth()
    expect(wrapper.findAll('button').some((item) => item.text() === '完成接入')).toBe(false)

    await clickLabel(wrapper, '确认到账')
    expect(intent.opsStatus).toBe('converted')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.converted)
    expect(wrapper.findAll('button').some((item) => item.text() === '完成接入')).toBe(true)
  })

  it('does not render go-space-ops before the intent is claimed', async () => {
    const intent = submitPersonalApi()
    const { wrapper } = await mountDetail(intent.id)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(false)
  })

  it('shows requested enterprise and submitted operator contact before payment confirmation', async () => {
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

  it('shows the authenticated enterprise name after payment confirmation', async () => {
    const intent = submitPersonalApi()
    const { wrapper } = await mountDetail(intent.id)
    const user = useUserStore()
    user.completeEnterpriseAuth()
    await clickLabel(wrapper, '确认到账')
    expect(wrapper.get('[data-testid="buyer-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(wrapper.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 13800000000')
  })
})
