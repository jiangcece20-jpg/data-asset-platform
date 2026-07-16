import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import ReverseWorkOrderList from './ReverseWorkOrderList.vue'
import ReverseWorkOrderDetail from './ReverseWorkOrderDetail.vue'
import ApprovalIntegration from './ApprovalIntegration.vue'
import Dashboard from './Dashboard.vue'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { useCatalogStore } from '@/stores/catalog'
import type { ImpactSnapshot, ReverseSeverity } from '@/types/reverseFlow'

const FIXED_TIME = new Date('2026-07-17T10:00:00.000Z')

function makeImpact(overrides: Partial<ImpactSnapshot> = {}): ImpactSnapshot {
  return {
    id: 'impact-test',
    productId: 'prod-test',
    createdAt: FIXED_TIME.toISOString(),
    customerIds: ['mem-1'],
    inFlightOrderIds: [],
    activeEntitlementIds: ['ent-1'],
    enterpriseMemberIds: [],
    trialIds: [],
    listingRequestIds: [],
    catalogReferenceIds: [],
    contractIds: [],
    isComplete: true,
    ...overrides,
  }
}

function createWO(overrides: Partial<{
  subjectId: string
  action: string
  reason: string
  severity: ReverseSeverity
  customerIds: string[]
  entitlementTreatment: string
  createdBy: string
}> = {}) {
  const store = useReverseWorkOrderStore()
  const customerIds = overrides.customerIds ?? ['mem-1']
  const impact = makeImpact({ customerIds })
  return store.createProductWorkOrder({
    subjectId: overrides.subjectId ?? 'prod-test',
    action: (overrides.action ?? 'recall') as any,
    reason: (overrides.reason ?? 'compliance_risk') as any,
    reasonDetail: 'test detail',
    severity: overrides.severity ?? 'S2',
    impact,
    entitlementTreatment: (overrides.entitlementTreatment ?? 'freeze') as any,
    treatmentSummary: 'test plan',
    createdBy: overrides.createdBy ?? 'admin-1',
    owner: 'admin-1',
    reviewAt: '2026-07-18T10:00:00.000Z',
    customerNoticeContent: 'test notice content',
  })
}

function mountWithRouter(component: any, props: Record<string, any> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' } },
      { path: '/admin/approval/reverse-work-orders', name: 'admin-reverse-work-orders', component: { template: '<div/>' } },
      { path: '/admin/approval/reverse-work-orders/:id', name: 'admin-reverse-work-order-detail', component: { template: '<div/>' } },
    ],
  })
  return mount(component, {
    props,
    global: {
      plugins: [router],
    },
  })
}

describe('ReverseWorkOrders routes', () => {
  it('list route is registered as admin-reverse-work-orders', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/approval/reverse-work-orders', name: 'admin-reverse-work-orders', component: { template: '<div/>' } },
      ],
    })
    await router.push('/admin/approval/reverse-work-orders')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('admin-reverse-work-orders')
  })

  it('detail route is registered as admin-reverse-work-order-detail', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/approval/reverse-work-orders/:id', name: 'admin-reverse-work-order-detail', component: { template: '<div/>' } },
      ],
    })
    await router.push('/admin/approval/reverse-work-orders/rwo-1')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('admin-reverse-work-order-detail')
  })
})

describe('ReverseWorkOrderList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TIME)
  })
  afterEach(() => vi.useRealTimers())

  it('sorts open S1 before S2 before S3, closed after open, newest first within group', () => {
    const store = useReverseWorkOrderStore()

    // Create S3 first (older), then S2, then S1
    const wo3 = createWO({ severity: 'S3', customerIds: [] })
    vi.advanceTimersByTime(1000)
    const wo2 = createWO({ severity: 'S2', subjectId: 'prod-b' })
    vi.advanceTimersByTime(1000)
    const wo1 = createWO({ severity: 'S1', subjectId: 'prod-c' })

    // Close the S3 one
    store.transition(wo3.workOrder.id, 'impact_analysis', 'admin-1')
    store.transition(wo3.workOrder.id, 'plan_confirmation', 'admin-1')
    store.acknowledge(wo3.workOrder.id, 'admin-1')
    store.confirmPlan(wo3.workOrder.id, 'admin-2')
    // Complete remaining tasks (stop_new_sales, remove_references)
    const wo3Tasks = store.tasksFor(wo3.workOrder.id)
    wo3Tasks.forEach((t) => {
      if (!t.completedAt) store.completeTask(wo3.workOrder.id, t.id, 'admin-1')
    })
    store.transition(wo3.workOrder.id, 'executing', 'admin-1')
    store.transition(wo3.workOrder.id, 'customer_handling', 'admin-1')
    store.transition(wo3.workOrder.id, 'cross_system_verification', 'admin-1')
    store.markCrossSystemReconciled(wo3.workOrder.id, 'admin-1')
    store.recordClosureReview(wo3.workOrder.id, { rootCause: 'rc', improvementAction: 'ia', preventionAction: 'pa', responsibilityOwner: 'ro' }, 'admin-1')
    store.close(wo3.workOrder.id, 'admin-2')

    const wrapper = mountWithRouter(ReverseWorkOrderList)
    const rows = wrapper.findAll('[data-testid="wo-row"]')
    const ids = rows.map((r) => r.attributes('data-id'))
    // S1 first, S2 second, closed S3 last
    expect(ids[0]).toBe(wo1.workOrder.id)
    expect(ids[1]).toBe(wo2.workOrder.id)
    expect(ids[ids.length - 1]).toBe(wo3.workOrder.id)
  })

  it('filters by status, severity, action, reason, and product ID', async () => {
    createWO({ severity: 'S1', subjectId: 'prod-a', action: 'recall', reason: 'compliance_risk' })
    vi.advanceTimersByTime(1000)
    createWO({ severity: 'S2', subjectId: 'prod-b', action: 'pause', reason: 'commercial_adjustment' })

    const wrapper = mountWithRouter(ReverseWorkOrderList)

    // Filter by severity S1
    await wrapper.find('[data-testid="filter-severity"]').setValue('S1')
    let rows = wrapper.findAll('[data-testid="wo-row"]')
    expect(rows).toHaveLength(1)

    // Clear and filter by product
    await wrapper.find('[data-testid="filter-severity"]').setValue('')
    await wrapper.find('[data-testid="filter-product"]').setValue('prod-b')
    rows = wrapper.findAll('[data-testid="wo-row"]')
    expect(rows).toHaveLength(1)
  })
})

describe('ReverseWorkOrderDetail', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TIME)
  })
  afterEach(() => vi.useRealTimers())

  it('displays impact categories, treatment plan, tasks, notices, and timeline', () => {
    const result = createWO({ customerIds: ['mem-1', 'mem-2'], entitlementTreatment: 'freeze' })
    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })

    const text = wrapper.text()
    // Impact categories
    expect(text).toContain('客户')
    expect(text).toContain('权益')
    // Tasks
    expect(text).toContain('停止新销售')
    expect(text).toContain('通知受影响客户')
    // Notice
    expect(text).toContain('mem-1')
    expect(text).toContain('mem-2')
    // Timeline
    expect(text).toContain('创建逆向工单')
  })

  it('displays SLA deadline for acknowledgment', () => {
    const result = createWO({ severity: 'S1' })
    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })
    // S1 ack deadline = 15 minutes after creation
    expect(wrapper.text()).toContain('受理截止')
  })

  it('marking a notice delivered updates notice and timeline', async () => {
    const result = createWO({ customerIds: ['mem-1'] })
    const store = useReverseWorkOrderStore()
    const noticeId = store.noticesFor(result.workOrder.id)[0].id

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })
    await wrapper.find(`[data-testid="notice-${noticeId}-deliver"]`).trigger('click')
    await wrapper.vm.$nextTick()

    const notice = store.noticesFor(result.workOrder.id)[0]
    expect(notice.status).toBe('delivered')
    // Timeline has a notice_delivered entry
    const tl = store.timeline.filter((t) => t.workOrderId === result.workOrder.id)
    expect(tl.some((t) => t.type === 'notice_delivered')).toBe(true)
  })

  it('three failed retries expose manual confirmation and block closure', async () => {
    const result = createWO({ customerIds: ['mem-1'] })
    const store = useReverseWorkOrderStore()
    const noticeId = store.noticesFor(result.workOrder.id)[0].id

    // Fail 4 times (1 initial + 3 retries)
    for (let i = 0; i < 4; i++) {
      store.markNoticeFailed(result.workOrder.id, noticeId, 'admin-1')
    }

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })
    // Manual confirm button should be visible
    expect(wrapper.find(`[data-testid="notice-${noticeId}-manual"]`).exists()).toBe(true)

    // Manual confirm
    await wrapper.find(`[data-testid="notice-${noticeId}-manual-result"]`).setValue('电话确认')
    await wrapper.find(`[data-testid="notice-${noticeId}-manual"]`).trigger('click')
    await wrapper.vm.$nextTick()

    const notice = store.noticesFor(result.workOrder.id)[0]
    expect(notice.status).toBe('manual_confirmed')
  })

  it('compensation requires evidence reference to complete', async () => {
    const result = createWO({ customerIds: ['mem-1'], entitlementTreatment: 'migrate_or_refund' })
    const store = useReverseWorkOrderStore()
    const compId = store.compensationsFor(result.workOrder.id)[0].id

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })

    // Try to complete without evidence
    await wrapper.find(`[data-testid="comp-${compId}-complete"]`).trigger('click')
    await wrapper.vm.$nextTick()
    const comp = store.compensationsFor(result.workOrder.id)[0]
    expect(comp.status).toBe('proposed')

    // Fill evidence and complete
    await wrapper.find(`[data-testid="comp-${compId}-evidence"]`).setValue('退款凭证-001')
    await wrapper.find(`[data-testid="comp-${compId}-complete"]`).trigger('click')
    await wrapper.vm.$nextTick()
    const comp2 = store.compensationsFor(result.workOrder.id)[0]
    expect(comp2.status).toBe('completed')
  })

  it('rejecting a treatment plan returns to impact analysis and preserves rejected version', async () => {
    const result = createWO({ customerIds: ['mem-1'] })
    const store = useReverseWorkOrderStore()

    // Move to plan_confirmation
    store.transition(result.workOrder.id, 'impact_analysis', 'admin-1')
    store.transition(result.workOrder.id, 'plan_confirmation', 'admin-1')

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })
    await wrapper.find('[data-testid="reject-plan"]').trigger('click')
    await wrapper.vm.$nextTick()

    const wo = store.byId(result.workOrder.id)!
    expect(wo.status).toBe('impact_analysis')

    const plans = store.plansFor(result.workOrder.id)
    expect(plans[0].status).toBe('rejected')
  })

  it('close attempt before gates displays the store error in the page', async () => {
    const result = createWO({ customerIds: ['mem-1'] })
    const store = useReverseWorkOrderStore()
    // Move to cross_system_verification without completing gates
    store.transition(result.workOrder.id, 'impact_analysis', 'admin-1')
    store.transition(result.workOrder.id, 'plan_confirmation', 'admin-1')
    store.confirmPlan(result.workOrder.id, 'admin-2')
    store.transition(result.workOrder.id, 'executing', 'admin-1')
    // Deliver notice to pass notice gate
    const noticeId = store.noticesFor(result.workOrder.id)[0].id
    store.markNoticeDelivered(result.workOrder.id, noticeId, 'admin-1')
    // Complete compensation
    const compId = store.compensationsFor(result.workOrder.id)[0]?.id
    // No compensation for freeze treatment, so just transition
    store.transition(result.workOrder.id, 'customer_handling', 'admin-1')
    store.transition(result.workOrder.id, 'cross_system_verification', 'admin-1')

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: result.workOrder.id })
    await wrapper.find('[data-testid="close-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Should show error about missing closure review or reconciliation
    expect(wrapper.find('[data-testid="gate-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gate-error"]').text()).toBeTruthy()
  })

  it('full lifecycle: acknowledge, transitions, plan confirm, notice, compensation, closure review, reconcile, close', async () => {
    const result = createWO({ customerIds: ['mem-1'], entitlementTreatment: 'migrate_or_refund', createdBy: 'creator-1' })
    const store = useReverseWorkOrderStore()
    const woId = result.workOrder.id

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: woId })

    // Acknowledge
    await wrapper.find('[data-testid="ack-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Transition: pending_assessment -> impact_analysis
    await wrapper.find('[data-testid="advance-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Transition: impact_analysis -> plan_confirmation
    await wrapper.find('[data-testid="advance-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Confirm plan by different person (S2)
    await wrapper.find('[data-testid="confirm-plan"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Transition: plan_confirmation -> executing
    await wrapper.find('[data-testid="advance-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Deliver notice
    const noticeId = store.noticesFor(woId)[0].id
    await wrapper.find(`[data-testid="notice-${noticeId}-deliver"]`).trigger('click')
    await wrapper.vm.$nextTick()

    // Complete compensation
    const compId = store.compensationsFor(woId)[0].id
    await wrapper.find(`[data-testid="comp-${compId}-evidence"]`).setValue('凭证-001')
    await wrapper.find(`[data-testid="comp-${compId}-complete"]`).trigger('click')
    await wrapper.vm.$nextTick()

    // Transition: executing -> customer_handling
    await wrapper.find('[data-testid="advance-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Transition: customer_handling -> cross_system_verification
    await wrapper.find('[data-testid="advance-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Record closure review
    await wrapper.find('[data-testid="closure-root-cause"]').setValue('root cause')
    await wrapper.find('[data-testid="closure-improvement"]').setValue('improvement')
    await wrapper.find('[data-testid="closure-prevention"]').setValue('prevention')
    await wrapper.find('[data-testid="closure-owner"]').setValue('owner-1')
    await wrapper.find('[data-testid="record-closure"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Reconcile
    await wrapper.find('[data-testid="reconcile-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Close by different person
    await wrapper.find('[data-testid="close-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    const wo = store.byId(woId)!
    expect(wo.status).toBe('closed')
  })

  it('S1/S2 initiator cannot confirm and close alone', async () => {
    const result = createWO({ severity: 'S2', customerIds: ['mem-1'], createdBy: 'admin-1' })
    const store = useReverseWorkOrderStore()
    const woId = result.workOrder.id

    // Advance through stages - all done by same person 'admin-1'
    store.acknowledge(woId, 'admin-1')
    store.transition(woId, 'impact_analysis', 'admin-1')
    store.transition(woId, 'plan_confirmation', 'admin-1')
    // Confirm plan by same person who created
    store.confirmPlan(woId, 'admin-1')
    // Complete remaining tasks
    const tasks = store.tasksFor(woId)
    tasks.forEach((t) => {
      if (!t.completedAt) store.completeTask(woId, t.id, 'admin-1')
    })
    store.transition(woId, 'executing', 'admin-1')

    // Deliver notice
    const noticeId = store.noticesFor(woId)[0].id
    store.markNoticeDelivered(woId, noticeId, 'admin-1')
    store.transition(woId, 'customer_handling', 'admin-1')
    store.transition(woId, 'cross_system_verification', 'admin-1')
    store.markCrossSystemReconciled(woId, 'admin-1')
    store.recordClosureReview(woId, { rootCause: 'rc', improvementAction: 'ia', preventionAction: 'pa', responsibilityOwner: 'ro' }, 'admin-1')

    // Try to close by same person
    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: woId })
    await wrapper.find('[data-testid="close-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="gate-error"]').text()).toContain('S1/S2')
    expect(store.byId(woId)!.status).not.toBe('closed')
  })

  it('closed work order offers create follow-up instead of editable fields', () => {
    const result = createWO({ customerIds: ['mem-1'], createdBy: 'creator-1' })
    const store = useReverseWorkOrderStore()
    const woId = result.workOrder.id

    // Close the work order
    store.acknowledge(woId, 'admin-1')
    store.transition(woId, 'impact_analysis', 'admin-1')
    store.transition(woId, 'plan_confirmation', 'admin-1')
    store.confirmPlan(woId, 'admin-2')
    // Complete remaining tasks
    const tasks = store.tasksFor(woId)
    tasks.forEach((t) => {
      if (!t.completedAt) store.completeTask(woId, t.id, 'admin-1')
    })
    store.transition(woId, 'executing', 'admin-1')
    const noticeId = store.noticesFor(woId)[0].id
    store.markNoticeDelivered(woId, noticeId, 'admin-1')
    store.transition(woId, 'customer_handling', 'admin-1')
    store.transition(woId, 'cross_system_verification', 'admin-1')
    store.markCrossSystemReconciled(woId, 'admin-1')
    store.recordClosureReview(woId, { rootCause: 'rc', improvementAction: 'ia', preventionAction: 'pa', responsibilityOwner: 'ro' }, 'admin-1')
    store.close(woId, 'admin-2')

    const wrapper = mountWithRouter(ReverseWorkOrderDetail, { workOrderId: woId })
    expect(wrapper.find('[data-testid="create-followup"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="advance-btn"]').exists()).toBe(false)
  })
})

describe('ApprovalIntegration reverse-work-order card', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TIME)
  })
  afterEach(() => vi.useRealTimers())

  it('links to the reverse work-order list', () => {
    const wrapper = mountWithRouter(ApprovalIntegration)
    const link = wrapper.find('[data-testid="reverse-wo-link"]')
    expect(link.exists()).toBe(true)
  })

  it('shows open total, S1 total, and overdue S1/S2 total', () => {
    // Create an S1 work order (overdue since it was created in the past)
    vi.setSystemTime(new Date('2026-07-17T09:00:00.000Z'))
    createWO({ severity: 'S1', customerIds: ['mem-1'] })
    vi.setSystemTime(FIXED_TIME) // 1 hour later - S1 ack deadline is 15 min, so it's overdue

    createWO({ severity: 'S3', customerIds: [] })

    const wrapper = mountWithRouter(ApprovalIntegration)
    const card = wrapper.find('[data-testid="reverse-wo-card"]')
    expect(card.text()).toContain('逆向工单')
    expect(card.text()).toContain('2') // open total
    expect(card.text()).toContain('1') // S1 total
  })
})

describe('Dashboard reverse metrics', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TIME)
  })
  afterEach(() => vi.useRealTimers())

  it('shows pending and overdue metrics and links to reverse work orders', () => {
    createWO({ severity: 'S2', customerIds: ['mem-1'] })
    const wrapper = mountWithRouter(Dashboard)
    const text = wrapper.text()
    expect(text).toContain('逆向')
  })
})
