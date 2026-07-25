import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AfterSalesList from './AfterSalesList.vue'
import AfterSalesDetail from './AfterSalesDetail.vue'
import ApprovalIntegration from './ApprovalIntegration.vue'
import { useAfterSalesStore } from '@/stores/afterSales'
import { useEntitlementStore } from '@/stores/entitlements'
import type { Entitlement } from '@/types/domain'

function ent(id: string): Entitlement {
  return { id, source: 'personal', type: 'item', productId: 'prod-1', ownerId: 'mem-1', validFrom: '2026-07-01', status: 'active' }
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/approval/after-sales', name: 'admin-after-sales', component: AfterSalesList },
      { path: '/admin/approval/after-sales/:id', name: 'admin-after-sales-detail', component: AfterSalesDetail }
    ]
  })
}

describe('AfterSales admin pages', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('registers list and detail routes', () => {
    const router = makeRouter()
    expect(router.hasRoute('admin-after-sales')).toBe(true)
    expect(router.hasRoute('admin-after-sales-detail')).toBe(true)
  })

  it('refund sequence disables revoke until refund succeeds, then revokes', async () => {
    const entitlements = useEntitlementStore()
    entitlements.list = [ent('e1')]
    const after = useAfterSalesStore()
    const { workOrderId } = after.initiateCustomerRefund({
      orderId: 'o1', customerId: 'mem-1', entitlementId: 'e1', reason: 'x', scope: 'full',
      amount: 99, actor: 'op-1', owner: 'op-1', reviewAt: '2026-07-18T10:00:00.000Z'
    })
    const router = makeRouter()
    router.push(`/admin/approval/after-sales/${workOrderId}`)
    await router.isReady()
    const wrapper = mount(AfterSalesDetail, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="refund-sequence"]').exists()).toBe(true)
    // freeze first
    expect(entitlements.list[0].status).toBe('frozen')
    await wrapper.find('[data-testid="refund-succeed"]').trigger('click')
    await flushPromises()
    expect(entitlements.list[0].status).toBe('revoked')
  })

  it('ApprovalIntegration links to after-sales', async () => {
    const router = makeRouter()
    router.addRoute({ path: '/admin/approval', name: 'admin-approval', component: ApprovalIntegration })
    router.push('/admin/approval')
    await router.isReady()
    const wrapper = mount(ApprovalIntegration, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="after-sales-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="after-sales-link"]').exists()).toBe(true)
  })
})
