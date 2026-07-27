import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import IntegrationGovernance from './IntegrationGovernance.vue'
import ApprovalIntegration from './ApprovalIntegration.vue'
import { useIntegrationStore } from '@/stores/integration'

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/admin/approval/integration', name: 'admin-integration-governance', component: IntegrationGovernance }] })
}

describe('IntegrationGovernance page', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('registers the integration route', () => {
    expect(makeRouter().hasRoute('admin-integration-governance')).toBe(true)
  })

  it('shows dead letters and repairs them, then drops a stale replay', async () => {
    const store = useIntegrationStore()
    const { event } = store.processEvent({ connector: 'trusted_space', subjectId: 'space-order-1', eventType: 'order_update', eventVersion: 5, idempotencyKey: 'k1', signatureValid: true })
    // force to dead letter
    for (let i = 0; i < 4; i++) store.failEvent(event.id)
    const router = makeRouter()
    router.push('/admin/approval/integration')
    await router.isReady()
    const wrapper = mount(IntegrationGovernance, { global: { plugins: [router] } })
    expect(wrapper.findAll('[data-testid="dead-letter-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="dead-letter-row"]').text()).toContain('space-order-1')
    expect(wrapper.find('[data-testid="dead-letter-row"]').text()).toContain('v5')
    expect(wrapper.find('[data-testid="reconcile-event"]').exists()).toBe(true)
    await wrapper.find('[data-testid="repair-btn"]').trigger('click')
    await flushPromises()
    expect(store.byId(event.id)?.status).toBe('repaired')
    expect(wrapper.find(`[data-id="${event.id}"]`).text()).toContain('工单')
    // a replayed stale event is dropped
    const replay = store.processEvent({ connector: 'trusted_space', subjectId: 'space-order-1', eventType: 'order_update', eventVersion: 5, idempotencyKey: 'k2', signatureValid: true })
    expect(replay.decision).toBe('stale_dropped')
  })

  it('ApprovalIntegration links to integration governance', async () => {
    const router = makeRouter()
    router.addRoute({ path: '/admin/approval', name: 'admin-approval', component: ApprovalIntegration })
    router.push('/admin/approval')
    await router.isReady()
    const wrapper = mount(ApprovalIntegration, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="integration-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="integration-link"]').exists()).toBe(true)
  })
})
