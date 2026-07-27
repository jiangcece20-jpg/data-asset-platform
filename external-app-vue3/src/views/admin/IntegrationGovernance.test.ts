import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import IntegrationGovernance from './IntegrationGovernance.vue'
import ApprovalIntegration from './ApprovalIntegration.vue'
import { useIntegrationStore } from '@/stores/integration'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import type { SpacePurchaseIntent } from '@/types/trustedSpace'

function purchaseIntent(over: Partial<SpacePurchaseIntent> = {}): SpacePurchaseIntent {
  return {
    id: 'intent-delayed', appEnterpriseId: 'ent-wanlian-logistics', spaceEnterpriseId: 'space-ent-wanlian', operatorMemberId: 'mem-1',
    appProductId: 'prod-qualification-api', spaceProductNo: 'SPACE-API-20415', returnUrl: '/app/product/prod-qualification-api',
    idempotencyKey: 'intent-key', correlationId: 'corr-key', status: 'returned_pending_sync', createdAt: '2026-07-27T09:00:00.000Z',
    returnedAt: '2026-07-27T10:00:00.000Z', expiresAt: '2026-07-27T10:30:00.000Z', ...over,
  }
}

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/admin/approval/integration', name: 'admin-integration-governance', component: IntegrationGovernance }] })
}

describe('IntegrationGovernance page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserStore().completeEnterpriseAuth()
    useTrustedSpacePurchaseStore().intents = [purchaseIntent()]
    useTrustedSpaceCatalogStore().snapshots = [{ ...seedTrustedProductSnapshots[0] }]
  })

  it('registers the integration route', () => {
    expect(makeRouter().hasRoute('admin-integration-governance')).toBe(true)
  })

  it('shows dead letters and repairs them, then drops a stale replay', async () => {
    const store = useIntegrationStore()
    const { event } = store.processEvent({
      connector: 'trusted_space', subjectId: 'space-order-1', eventType: 'order_update', eventVersion: 5, idempotencyKey: 'k1', signatureValid: true,
      purchaseIntentId: 'intent-delayed', spaceEnterpriseId: 'space-ent-wanlian', spaceProductNo: 'SPACE-API-20415',
    })
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
    const reconcile = vi.spyOn(useSpaceOrderStore(), 'reconcileIntent').mockResolvedValue(undefined)
    await wrapper.find('[data-testid="reconcile-event"]').trigger('click')
    expect(reconcile).toHaveBeenCalledWith('intent-delayed')
    await wrapper.find('[data-testid="repair-btn"]').trigger('click')
    await flushPromises()
    expect(store.byId(event.id)?.status).toBe('repaired')
    expect(wrapper.find(`[data-id="${event.id}"]`).text()).toContain('工单')
    // a replayed stale event is dropped
    const replay = store.processEvent({ connector: 'trusted_space', subjectId: 'space-order-1', eventType: 'order_update', eventVersion: 5, idempotencyKey: 'k2', signatureValid: true })
    expect(replay.decision).toBe('stale_dropped')
  })

  it('does not offer reconciliation when an audited dead letter lacks a current valid purchase intent', async () => {
    const store = useIntegrationStore()
    const rejected = store.recordRejectedEvent({
      connector: 'trusted_space', subjectId: 'space-order-missing-intent', eventType: 'order_update', eventVersion: 5, idempotencyKey: 'missing-intent', signatureValid: false,
      purchaseIntentId: 'intent-missing', spaceEnterpriseId: 'space-ent-wanlian', spaceProductNo: 'SPACE-API-20415',
    })
    for (let i = 0; i < 4; i++) store.failEvent(rejected.id)

    const router = makeRouter()
    router.push('/admin/approval/integration')
    await router.isReady()
    const wrapper = mount(IntegrationGovernance, { global: { plugins: [router] } })

    expect(wrapper.find('[data-testid="reconcile-event"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dead-letter-row"]').text()).toContain('关联异常')
  })

  it('does not offer reconciliation or invoke the store when the audited intent association is mismatched', async () => {
    const store = useIntegrationStore()
    const rejected = store.recordRejectedEvent({
      connector: 'trusted_space', subjectId: 'space-order-wrong-product', eventType: 'order_update', eventVersion: 5, idempotencyKey: 'wrong-product', signatureValid: false,
      purchaseIntentId: 'intent-delayed', spaceEnterpriseId: 'space-ent-wanlian', spaceProductNo: 'SPACE-OTHER-999',
    })
    for (let i = 0; i < 4; i++) store.failEvent(rejected.id)
    const reconcile = vi.spyOn(useSpaceOrderStore(), 'reconcileIntent').mockResolvedValue(undefined)
    const router = makeRouter()
    router.push('/admin/approval/integration')
    await router.isReady()
    const wrapper = mount(IntegrationGovernance, { global: { plugins: [router] } })

    expect(wrapper.find('[data-testid="reconcile-event"]').exists()).toBe(false)
    expect(reconcile).not.toHaveBeenCalled()
  })

  it('shows a long-unlinked returned intent and reconciles it by its validated intent id', async () => {
    const router = makeRouter()
    router.push('/admin/approval/integration')
    await router.isReady()
    const wrapper = mount(IntegrationGovernance, { global: { plugins: [router] } })
    const reconcile = vi.spyOn(useSpaceOrderStore(), 'reconcileIntent').mockResolvedValue(undefined)

    expect(wrapper.findAll('[data-testid="long-unlinked-row"]')).toHaveLength(1)
    await wrapper.find('[data-testid="reconcile-long-unlinked"]').trigger('click')
    expect(reconcile).toHaveBeenCalledWith('intent-delayed')
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
