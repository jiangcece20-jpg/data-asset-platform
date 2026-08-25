import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { OPS_STATUS_LABELS } from '@/domain/spaceIntent'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
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

  it('walks a personal API intent from unclaimed through space deal to completed', async () => {
    const intent = submitPersonalApi()
    const { wrapper, router } = await mountDetail(intent.id)

    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.unclaimed)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(false)

    await clickLabel(wrapper, '领取')
    expect(intent.opsStatus).toBe('pending_enterprise')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.pending_enterprise)

    const user = useUserStore()
    user.completeEnterpriseAuth()
    await clickLabel(wrapper, '确认企业')
    expect(intent.enterpriseId).toBe(user.enterprise.id)
    expect(intent.opsStatus).toBe('space_dealing')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.space_dealing)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(true)

    await wrapper.get('[data-testid="go-space-ops"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      name: 'space-bridge',
      params: { id: intent.productId },
      query: { intent: `ops-${intent.id}` }
    })

    await router.push(`/admin/space-intents/${intent.id}`)
    await flushPromises()

    await clickLabel(wrapper, '回填空间成交')
    expect(intent.opsStatus).toBe('completed')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.completed)
  })

  it('keeps a dataset intent in pending delivery until complete-delivery is shown', async () => {
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
    await clickLabel(wrapper, '确认企业')
    expect(wrapper.findAll('button').some((item) => item.text() === '完成接入')).toBe(false)

    await clickLabel(wrapper, '回填空间成交')
    expect(intent.opsStatus).toBe('pending_delivery')
    expect(wrapper.text()).toContain(OPS_STATUS_LABELS.pending_delivery)
    expect(wrapper.findAll('button').some((item) => item.text() === '完成接入')).toBe(true)
  })

  it('does not render go-space-ops when the intent has no enterprise', async () => {
    const intent = submitPersonalApi()
    const { wrapper } = await mountDetail(intent.id)
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(false)
    await clickLabel(wrapper, '领取')
    expect(wrapper.find('[data-testid="go-space-ops"]').exists()).toBe(false)
  })
})
