import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReverseWorkOrderStore } from './reverseWorkOrders'
import type { ImpactSnapshot, ProductReverseAction, ReverseReasonCode, ReverseSeverity, EntitlementTreatment } from '@/types/reverseFlow'

const FIXED_TIME = new Date('2026-07-17T10:00:00.000Z')

function makeImpact(productId: string, customerIds: string[] = ['mem-1']): ImpactSnapshot {
  return {
    id: 'impact-test-' + Math.random().toString(36).slice(2, 8),
    productId,
    createdAt: '2026-07-17T10:00:00.000Z',
    customerIds,
    inFlightOrderIds: customerIds.length > 0 ? ['ord-1'] : [],
    activeEntitlementIds: customerIds.length > 0 ? ['ent-1'] : [],
    enterpriseMemberIds: [],
    trialIds: [],
    listingRequestIds: [],
    catalogReferenceIds: [],
    contractIds: [],
    isComplete: true,
  }
}

function createInput(overrides: Partial<{
  subjectId: string
  action: ProductReverseAction
  reason: ReverseReasonCode
  severity: ReverseSeverity
  entitlementTreatment: EntitlementTreatment
  impact: ImpactSnapshot
  createdBy: string
  owner: string
}> = {}) {
  return {
    subjectId: overrides.subjectId ?? 'prod-logistics-monthly',
    action: overrides.action ?? 'pause' as const,
    reason: overrides.reason ?? 'commercial_adjustment' as const,
    reasonDetail: 'Test reason detail',
    severity: overrides.severity ?? 'S3' as const,
    impact: overrides.impact ?? makeImpact(overrides.subjectId ?? 'prod-logistics-monthly'),
    entitlementTreatment: overrides.entitlementTreatment ?? 'keep' as const,
    treatmentSummary: 'Test treatment summary',
    createdBy: overrides.createdBy ?? 'operator-a',
    owner: overrides.owner ?? 'operator-a',
    reviewAt: '2026-07-17T10:00:00.000Z',
    customerNoticeContent: '您购买的商品因商业调整暂停销售',
    parentWorkOrderId: undefined as string | undefined,
  }
}

describe('useReverseWorkOrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TIME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createProductWorkOrder', () => {
    it('creates work order with impact, plan, five tasks, notices, compensations, and timeline', () => {
      const store = useReverseWorkOrderStore()
      const impact = makeImpact('prod-test', ['mem-1', 'mem-2'])
      const input = createInput({
        subjectId: 'prod-test',
        action: 'recall',
        reason: 'quality_issue',
        severity: 'S2',
        entitlementTreatment: 'keep_and_compensate',
        impact,
      })
      const result = store.createProductWorkOrder(input)

      // Work order
      expect(result.workOrder.id).toMatch(/^rwo-/)
      expect(result.workOrder.status).toBe('pending_assessment')
      expect(result.workOrder.subjectId).toBe('prod-test')
      expect(result.workOrder.impactSnapshotId).toBe(result.impact.id)
      expect(result.workOrder.treatmentPlanId).toBe(result.plan.id)

      // Impact stored and linked
      expect(result.impact.workOrderId).toBe(result.workOrder.id)
      expect(store.impactFor(result.workOrder.id)?.id).toBe(impact.id)

      // Treatment plan
      expect(result.plan.status).toBe('draft')
      expect(result.plan.entitlementTreatment).toBe('keep_and_compensate')
      expect(result.plan.version).toBe(1)

      // Five execution tasks with exact types
      const taskTypes = result.tasks.map((t) => t.type)
      expect(taskTypes).toEqual([
        'stop_new_sales',
        'remove_references',
        'decide_customer_treatment',
        'notify_customers',
        'reconcile_state',
      ])

      // One notice per affected customer
      expect(result.notices).toHaveLength(2)
      expect(result.notices.every((n) => n.status === 'pending')).toBe(true)
      expect(result.notices.map((n) => n.customerId).sort()).toEqual(['mem-1', 'mem-2'])

      // Compensation: keep_and_compensate → one extension per customer
      expect(result.compensations).toHaveLength(2)
      expect(result.compensations.every((c) => c.type === 'extension' && c.status === 'proposed')).toBe(true)

      // Timeline entry
      expect(result.timeline).toHaveLength(1)
      expect(result.timeline[0].type).toBe('created')
    })

    it('creates migration compensations for migrate_or_refund treatment', () => {
      const store = useReverseWorkOrderStore()
      const input = createInput({
        action: 'delist',
        reason: 'upstream_stop',
        severity: 'S2',
        entitlementTreatment: 'migrate_or_refund',
        impact: makeImpact('prod-test', ['mem-1']),
      })
      const result = store.createProductWorkOrder(input)
      expect(result.compensations).toHaveLength(1)
      expect(result.compensations[0].type).toBe('replacement')
      expect(result.compensations[0].status).toBe('proposed')
    })

    it('creates no notices or compensations when no customers are affected', () => {
      const store = useReverseWorkOrderStore()
      const input = createInput({
        impact: makeImpact('prod-test', []),
      })
      const result = store.createProductWorkOrder(input)
      expect(result.notices).toHaveLength(0)
      expect(result.compensations).toHaveLength(0)
      // notify_customers task should be pre-completed
      const notifyTask = result.tasks.find((t) => t.type === 'notify_customers')
      expect(notifyTask?.completedAt).toBeTruthy()
    })
  })

  describe('getters', () => {
    it('returns stable normalized views', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput())
      const id = result.workOrder.id

      expect(store.byId(id)?.id).toBe(id)
      expect(store.impactFor(id)?.id).toBe(result.impact.id)
      expect(store.plansFor(id)).toHaveLength(1)
      expect(store.tasksFor(id)).toHaveLength(5)
      expect(store.noticesFor(id)).toHaveLength(1)
      expect(store.compensationsFor(id)).toHaveLength(0) // 'keep' treatment = no compensations
      expect(store.openForProduct('prod-logistics-monthly')).toHaveLength(1)
      expect(store.openForProduct('prod-other')).toHaveLength(0)
    })
  })

  describe('status transitions', () => {
    it('follows the ordered workflow', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      expect(store.byId(id)?.status).toBe('impact_analysis')

      store.transition(id, 'plan_confirmation', 'operator-a')
      expect(store.byId(id)?.status).toBe('plan_confirmation')

      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')
      expect(store.byId(id)?.status).toBe('cross_system_verification')
    })

    it('throws when skipping a stage', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      expect(() => store.transition(result.workOrder.id, 'executing', 'operator-a')).toThrow('工单状态流转不合法')
    })
  })

  describe('cancellation', () => {
    it('works for untouched pending_assessment', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      store.cancel(result.workOrder.id, 'operator-a', '不再需要')
      expect(store.byId(result.workOrder.id)?.status).toBe('cancelled')
    })

    it('rejects cancellation after task completion', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const task = result.tasks[0]
      store.completeTask(result.workOrder.id, task.id, 'operator-a')
      expect(() => store.cancel(result.workOrder.id, 'operator-a', '不再需要')).toThrow('已开始处理的工单不能取消，请创建后续工单')
    })
  })

  describe('plan confirmation and rejection', () => {
    it('confirmPlan completes decide_customer_treatment task', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id
      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')

      const plan = store.plansFor(id).find((p) => p.status === 'confirmed')
      expect(plan).toBeTruthy()
      const task = store.tasksFor(id).find((t) => t.type === 'decide_customer_treatment')
      expect(task?.completedAt).toBeTruthy()
    })

    it('rejectPlan returns work order to impact_analysis and marks plan rejected', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id
      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.rejectPlan(id, 'operator-b', '方案不充分')

      expect(store.byId(id)?.status).toBe('impact_analysis')
      const rejected = store.plansFor(id).find((p) => p.status === 'rejected')
      expect(rejected).toBeTruthy()
    })

    it('revisePlan creates version 2 without overwriting rejected version 1', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id
      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.rejectPlan(id, 'operator-b', '方案不充分')
      store.revisePlan(id, { summary: 'Revised summary' }, 'operator-a')

      const plans = store.plansFor(id)
      expect(plans).toHaveLength(2)
      expect(plans.find((p) => p.version === 1)?.status).toBe('rejected')
      expect(plans.find((p) => p.version === 2)?.status).toBe('draft')
      expect(store.byId(id)?.treatmentPlanId).toBe(plans.find((p) => p.version === 2)?.id)
    })
  })

  describe('notice delivery', () => {
    it('allows initial failure plus three retries then requires manual confirmation', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      const id = result.workOrder.id
      const noticeId = result.notices[0].id

      // Initial fail + 3 retries = 4 attempts
      store.markNoticeFailed(id, noticeId, 'operator-a')
      store.markNoticeFailed(id, noticeId, 'operator-a')
      store.markNoticeFailed(id, noticeId, 'operator-a')
      store.markNoticeFailed(id, noticeId, 'operator-a')

      const notice = store.noticesFor(id)[0]
      expect(notice.attempts).toBe(4)
      expect(notice.status).toBe('failed')

      // Further failures should not increase attempts
      expect(() => store.markNoticeFailed(id, noticeId, 'operator-a')).toThrow()

      // Manual confirmation resolves it
      store.markNoticeManualConfirmed(id, noticeId, 'operator-a', '电话联系客户确认')
      expect(store.noticesFor(id)[0].status).toBe('manual_confirmed')
    })

    it('markNoticeDelivered resolves the notice', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      store.markNoticeDelivered(result.workOrder.id, result.notices[0].id, 'system')
      expect(store.noticesFor(result.workOrder.id)[0].status).toBe('delivered')
    })
  })

  describe('compensation', () => {
    it('cannot complete without evidence reference', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        action: 'recall',
        reason: 'quality_issue',
        severity: 'S2',
        entitlementTreatment: 'keep_and_compensate',
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      const compId = result.compensations[0].id
      expect(() => store.updateCompensation(result.workOrder.id, compId, { status: 'completed' }, 'operator-a')).toThrow('处置完成凭证尚未填写')
    })

    it('completes with evidence reference', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        action: 'recall',
        reason: 'quality_issue',
        severity: 'S2',
        entitlementTreatment: 'keep_and_compensate',
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      const compId = result.compensations[0].id
      store.updateCompensation(result.workOrder.id, compId, {
        status: 'completed',
        evidenceReference: 'COMP-001',
      }, 'operator-a')
      expect(store.compensationsFor(result.workOrder.id)[0].status).toBe('completed')
    })
  })

  describe('SLA dates', () => {
    it('S1 acknowledges in 15 minutes and plans in 1 hour', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        severity: 'S1',
        action: 'recall',
        reason: 'compliance_risk',
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      expect(result.workOrder.acknowledgeDueAt).toBe('2026-07-17T10:15:00.000Z')
      expect(result.workOrder.planDueAt).toBe('2026-07-17T11:00:00.000Z')
    })

    it('S2 acknowledges in 2 hours and plans in 1 business day', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        severity: 'S2',
        action: 'recall',
        reason: 'quality_issue',
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      expect(result.workOrder.acknowledgeDueAt).toBe('2026-07-17T12:00:00.000Z')
      // 2026-07-17 is Friday, +1 business day = Monday 2026-07-20
      expect(result.workOrder.planDueAt).toBe('2026-07-20T10:00:00.000Z')
    })

    it('S3 acknowledges in 1 business day and plans in 3 business days', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        severity: 'S3',
        impact: makeImpact('prod-test', []),
      }))
      // Friday +1 business day = Monday
      expect(result.workOrder.acknowledgeDueAt).toBe('2026-07-20T10:00:00.000Z')
      // Friday +3 business days = Wednesday
      expect(result.workOrder.planDueAt).toBe('2026-07-22T10:00:00.000Z')
    })
  })

  describe('cross-system verification gate', () => {
    it('blocked until notices and compensations are resolved', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        action: 'recall',
        reason: 'quality_issue',
        severity: 'S2',
        entitlementTreatment: 'keep_and_compensate',
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')

      // Complete all tasks except notify_customers and reconcile_state
      const tasks = store.tasksFor(id)
      tasks.forEach((t) => {
        if (t.type !== 'notify_customers' && t.type !== 'reconcile_state' && !t.completedAt) {
          store.completeTask(id, t.id, 'operator-a')
        }
      })

      // Deliver notice
      store.markNoticeDelivered(id, result.notices[0].id, 'system')

      // Complete compensation
      const comp = result.compensations[0]
      store.updateCompensation(id, comp.id, { status: 'completed', evidenceReference: 'COMP-001' }, 'operator-a')

      // Now customer_handling should work
      store.transition(id, 'customer_handling', 'operator-a')

      // Cross-system verification should be allowed now
      store.transition(id, 'cross_system_verification', 'operator-a')
      expect(store.byId(id)?.status).toBe('cross_system_verification')
    })

    it('blocked when notice is unresolved', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        action: 'recall',
        reason: 'quality_issue',
        severity: 'S2',
        entitlementTreatment: 'keep_and_compensate',
        impact: makeImpact('prod-test', ['mem-1']),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')

      // Notice still pending
      expect(() => store.transition(id, 'cross_system_verification', 'operator-a')).toThrow()
    })
  })

  describe('close gates', () => {
    it('rejects close when tasks are incomplete', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')

      // Tasks not all completed
      expect(() => store.close(id, 'operator-c')).toThrow('仍有未完成执行任务')
    })

    it('rejects close when plan is unconfirmed', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      // Don't confirm plan
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')

      // Complete all tasks
      store.tasksFor(id).forEach((t) => {
        if (!t.completedAt) store.completeTask(id, t.id, 'operator-a')
      })

      expect(() => store.close(id, 'operator-c')).toThrow('处置方案尚未确认')
    })

    it('rejects close when cross-system not reconciled', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')

      store.tasksFor(id).forEach((t) => {
        if (!t.completedAt) store.completeTask(id, t.id, 'operator-a')
      })

      expect(() => store.close(id, 'operator-c')).toThrow('跨系统状态尚未核验')
    })

    it('rejects close when closure review is incomplete', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')
      store.markCrossSystemReconciled(id, 'operator-a')

      store.tasksFor(id).forEach((t) => {
        if (!t.completedAt) store.completeTask(id, t.id, 'operator-a')
      })

      expect(() => store.close(id, 'operator-c')).toThrow('根因和改进措施尚未填写')
    })

    it('rejects S1/S2 close by same person who created and confirmed', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        severity: 'S2',
        action: 'recall',
        reason: 'quality_issue',
        createdBy: 'operator-a',
        owner: 'operator-a',
        impact: makeImpact('prod-test', []),
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-a') // same person as createdBy
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')
      store.markCrossSystemReconciled(id, 'operator-a')

      store.tasksFor(id).forEach((t) => {
        if (!t.completedAt) store.completeTask(id, t.id, 'operator-a')
      })

      store.recordClosureReview(id, {
        rootCause: 'Root cause',
        improvementAction: 'Improvement',
        preventionAction: 'Prevention',
        responsibilityOwner: 'Owner',
      }, 'operator-a')

      expect(() => store.close(id, 'operator-a')).toThrow('S1/S2 工单不能由发起人独自审批并关闭')
    })

    it('closes successfully when all gates pass with different operators', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput({
        severity: 'S3',
        impact: makeImpact('prod-test', []),
        createdBy: 'operator-a',
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')
      store.markCrossSystemReconciled(id, 'operator-a')

      store.tasksFor(id).forEach((t) => {
        if (!t.completedAt) store.completeTask(id, t.id, 'operator-a')
      })

      store.recordClosureReview(id, {
        rootCause: 'Root cause',
        improvementAction: 'Improvement',
        preventionAction: 'Prevention',
        responsibilityOwner: 'Owner',
      }, 'operator-a')

      store.close(id, 'operator-c')
      expect(store.byId(id)?.status).toBe('closed')
      expect(store.byId(id)?.closedAt).toBeTruthy()
    })
  })

  describe('createFollowUp', () => {
    it('sets parentWorkOrderId and appends timeline without editing closed parent', () => {
      const store = useReverseWorkOrderStore()
      // Create and close a work order first
      const result = store.createProductWorkOrder(createInput({
        severity: 'S3',
        impact: makeImpact('prod-test', []),
        createdBy: 'operator-a',
      }))
      const id = result.workOrder.id

      store.transition(id, 'impact_analysis', 'operator-a')
      store.transition(id, 'plan_confirmation', 'operator-a')
      store.confirmPlan(id, 'operator-b')
      store.transition(id, 'executing', 'operator-a')
      store.transition(id, 'customer_handling', 'operator-a')
      store.transition(id, 'cross_system_verification', 'operator-a')
      store.markCrossSystemReconciled(id, 'operator-a')
      store.tasksFor(id).forEach((t) => {
        if (!t.completedAt) store.completeTask(id, t.id, 'operator-a')
      })
      store.recordClosureReview(id, {
        rootCause: 'Root cause',
        improvementAction: 'Improvement',
        preventionAction: 'Prevention',
        responsibilityOwner: 'Owner',
      }, 'operator-a')
      store.close(id, 'operator-c')

      // Create follow-up
      const followUp = store.createFollowUp(id, createInput({
        severity: 'S3',
        impact: makeImpact('prod-test', []),
      }))

      expect(followUp.workOrder.parentWorkOrderId).toBe(id)
      // Parent timeline should have a follow_up_created entry
      const parentTimeline = store.timeline.filter((t) => t.workOrderId === id)
      expect(parentTimeline.some((t) => t.type === 'follow_up_created')).toBe(true)
    })
  })

  describe('impact immutability', () => {
    it('clones impact arrays before storing', () => {
      const store = useReverseWorkOrderStore()
      const impact = makeImpact('prod-test', ['mem-1', 'mem-2'])
      const originalCustomerIds = [...impact.customerIds]

      const result = store.createProductWorkOrder(createInput({
        impact,
      }))

      // Mutate the original impact
      impact.customerIds.push('mem-999')

      const stored = store.impactFor(result.workOrder.id)
      expect(stored?.customerIds).toEqual(originalCustomerIds)
      expect(stored?.customerIds).not.toContain('mem-999')
    })
  })

  describe('createWorkOrder (subject-agnostic)', () => {
    it('creates an order work order with a custom after-sales task template', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createWorkOrder({
        ...createInput({ subjectId: 'order-1' }),
        subjectType: 'order',
        taskTemplate: ['process_refund', 'revoke_entitlement', 'notify_customers', 'reconcile_payment'],
      })
      expect(result.workOrder.subjectType).toBe('order')
      const types = store.tasksFor(result.workOrder.id).map((t) => t.type).sort()
      expect(types).toEqual(['notify_customers', 'process_refund', 'reconcile_payment', 'revoke_entitlement'])
    })

    it('createProductWorkOrder still produces the product 5-task set', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createProductWorkOrder(createInput())
      expect(result.workOrder.subjectType).toBe('product')
      expect(store.tasksFor(result.workOrder.id)).toHaveLength(5)
    })

    it('contract work order with no customers does not throw on missing notify task', () => {
      const store = useReverseWorkOrderStore()
      const result = store.createWorkOrder({
        ...createInput({ subjectId: 'contract-1', impact: makeImpact('contract-1', []) }),
        subjectType: 'contract',
        taskTemplate: ['reclaim_seats', 'reconcile_state'],
      })
      expect(store.tasksFor(result.workOrder.id).map((t) => t.type).sort()).toEqual(['reclaim_seats', 'reconcile_state'])
    })
  })
})
