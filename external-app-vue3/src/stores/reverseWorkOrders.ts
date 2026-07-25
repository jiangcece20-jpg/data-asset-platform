import { defineStore } from 'pinia'
import { genId, now } from '@/utils/id'
import type {
  ReverseWorkOrder,
  ImpactSnapshot,
  TreatmentPlan,
  ExecutionTask,
  CustomerNotice,
  CompensationRecord,
  ReverseTimelineEntry,
  ReverseWorkOrderStatus,
  ProductReverseAction,
  ReverseReasonCode,
  ReverseSeverity,
  EntitlementTreatment,
} from '@/types/reverseFlow'

// ── SLA helpers ──────────────────────────────────────────────────
function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString()
}

function addBusinessDays(iso: string, days: number): string {
  const date = new Date(iso)
  let remaining = days
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining -= 1
  }
  return date.toISOString()
}

function deadlines(severity: ReverseSeverity, createdAt: string) {
  if (severity === 'S1') return {
    acknowledgeDueAt: addMinutes(createdAt, 15),
    planDueAt: addMinutes(createdAt, 60),
  }
  if (severity === 'S2') return {
    acknowledgeDueAt: addMinutes(createdAt, 120),
    planDueAt: addBusinessDays(createdAt, 1),
  }
  return {
    acknowledgeDueAt: addBusinessDays(createdAt, 1),
    planDueAt: addBusinessDays(createdAt, 3),
  }
}

// ── Legal flow ───────────────────────────────────────────────────
const FLOW: Record<ReverseWorkOrderStatus, ReverseWorkOrderStatus[]> = {
  pending_assessment: ['impact_analysis', 'cancelled'],
  impact_analysis: ['plan_confirmation'],
  plan_confirmation: ['executing'],
  executing: ['customer_handling'],
  customer_handling: ['cross_system_verification'],
  cross_system_verification: ['closed'],
  closed: [],
  cancelled: [],
}

const TASK_TITLES: Record<ExecutionTask['type'], string> = {
  stop_new_sales: '停止新销售',
  remove_references: '移除推荐与引用',
  decide_customer_treatment: '确定客户处置方案',
  notify_customers: '通知受影响客户',
  reconcile_state: '跨系统状态核验',
  process_refund: '执行退款',
  revoke_entitlement: '撤销权益',
  reclaim_seats: '回收企业席位',
  reconcile_payment: '支付对账',
  manual_repair: '人工修正',
}

// 各 subject 的默认执行任务模板；product 保持原五步不变。
const PRODUCT_TASK_TEMPLATE: ExecutionTask['type'][] = [
  'stop_new_sales',
  'remove_references',
  'decide_customer_treatment',
  'notify_customers',
  'reconcile_state',
]

function taskMeta(type: ExecutionTask['type']): Pick<ExecutionTask, 'system' | 'assigneeRole'> {
  switch (type) {
    case 'notify_customers':
      return { system: 'app', assigneeRole: 'customer_ops' }
    case 'reconcile_state':
    case 'reconcile_payment':
      return { system: 'asset_platform', assigneeRole: 'system_executor' }
    case 'process_refund':
      return { system: 'finance', assigneeRole: 'system_executor' }
    case 'revoke_entitlement':
      return { system: 'app', assigneeRole: 'system_executor' }
    case 'reclaim_seats':
      return { system: 'app', assigneeRole: 'product_ops' }
    case 'manual_repair':
      return { system: 'manual', assigneeRole: 'system_executor' }
    default:
      return { system: 'manual', assigneeRole: 'product_ops' }
  }
}

// ── Input contracts ──────────────────────────────────────────────
interface CreateProductWorkOrderInput {
  subjectId: string
  action: ProductReverseAction
  reason: ReverseReasonCode
  reasonDetail: string
  severity: ReverseSeverity
  impact: ImpactSnapshot
  entitlementTreatment: EntitlementTreatment
  treatmentSummary: string
  createdBy: string
  owner: string
  reviewAt: string
  customerNoticeContent: string
  parentWorkOrderId?: string
}

// 泛化输入：售后（order/contract）等子系统复用同一工单模型。
interface CreateWorkOrderInput extends Omit<CreateProductWorkOrderInput, 'action'> {
  action: ReverseWorkOrder['action']
  subjectType?: ReverseWorkOrder['subjectType']
  taskTemplate?: ExecutionTask['type'][]
}

interface CreateResult {
  workOrder: ReverseWorkOrder
  impact: ImpactSnapshot
  plan: TreatmentPlan
  tasks: ExecutionTask[]
  notices: CustomerNotice[]
  compensations: CompensationRecord[]
  timeline: ReverseTimelineEntry[]
}

export const useReverseWorkOrderStore = defineStore('reverseWorkOrders', {
  state: () => ({
    workOrders: [] as ReverseWorkOrder[],
    impacts: [] as ImpactSnapshot[],
    plans: [] as TreatmentPlan[],
    tasks: [] as ExecutionTask[],
    notices: [] as CustomerNotice[],
    compensations: [] as CompensationRecord[],
    timeline: [] as ReverseTimelineEntry[],
  }),

  getters: {
    byId(state) {
      return (id: string) => state.workOrders.find((w) => w.id === id)
    },
    impactFor(state) {
      return (workOrderId: string) => state.impacts.find((i) => i.workOrderId === workOrderId)
    },
    plansFor(state) {
      return (workOrderId: string) => state.plans.filter((p) => p.workOrderId === workOrderId)
    },
    tasksFor(state) {
      return (workOrderId: string) => state.tasks.filter((t) => t.workOrderId === workOrderId)
    },
    noticesFor(state) {
      return (workOrderId: string) => state.notices.filter((n) => n.workOrderId === workOrderId)
    },
    compensationsFor(state) {
      return (workOrderId: string) => state.compensations.filter((c) => c.workOrderId === workOrderId)
    },
    openForProduct(state) {
      return (productId: string) => state.workOrders.filter(
        (w) => w.subjectId === productId && w.status !== 'closed' && w.status !== 'cancelled',
      )
    },
  },

  actions: {
    createProductWorkOrder(input: CreateProductWorkOrderInput): CreateResult {
      return this.createWorkOrder({ ...input, subjectType: 'product' })
    },

    createWorkOrder(input: CreateWorkOrderInput): CreateResult {
      const createdAt = new Date().toISOString()
      const { acknowledgeDueAt, planDueAt } = deadlines(input.severity, createdAt)

      const workOrderId = genId('rwo')
      const impactId = input.impact.id
      const planId = genId('plan')

      // Clone impact arrays immutably
      const storedImpact: ImpactSnapshot = {
        ...input.impact,
        id: impactId,
        workOrderId,
        customerIds: [...input.impact.customerIds],
        inFlightOrderIds: [...input.impact.inFlightOrderIds],
        activeEntitlementIds: [...input.impact.activeEntitlementIds],
        enterpriseMemberIds: [...input.impact.enterpriseMemberIds],
        trialIds: [...input.impact.trialIds],
        listingRequestIds: [...input.impact.listingRequestIds],
        catalogReferenceIds: [...input.impact.catalogReferenceIds],
        contractIds: [...input.impact.contractIds],
      }

      const workOrder: ReverseWorkOrder = {
        id: workOrderId,
        subjectType: input.subjectType ?? 'product',
        subjectId: input.subjectId,
        action: input.action,
        reason: input.reason,
        reasonDetail: input.reasonDetail,
        severity: input.severity,
        status: 'pending_assessment',
        impactSnapshotId: impactId,
        treatmentPlanId: planId,
        createdBy: input.createdBy,
        owner: input.owner,
        reviewAt: input.reviewAt,
        acknowledgeDueAt,
        planDueAt,
        parentWorkOrderId: input.parentWorkOrderId,
        createdAt,
        updatedAt: createdAt,
      }

      const plan: TreatmentPlan = {
        id: planId,
        workOrderId,
        version: 1,
        status: 'draft',
        entitlementTreatment: input.entitlementTreatment,
        summary: input.treatmentSummary,
      }

      const taskTypes: ExecutionTask['type'][] = input.taskTemplate ?? PRODUCT_TASK_TEMPLATE
      const tasks: ExecutionTask[] = taskTypes.map((type) => ({
        id: genId('task'),
        workOrderId,
        type,
        title: TASK_TITLES[type],
        ...taskMeta(type),
      }))

      // Notices: one per affected customer
      const notices: CustomerNotice[] = input.impact.customerIds.map((customerId) => ({
        id: genId('notice'),
        workOrderId,
        customerId,
        status: 'pending',
        channel: 'in_app',
        contentVersion: 'v1',
        content: input.customerNoticeContent,
        attempts: 0,
      }))

      // Compensations based on treatment
      const compensations: CompensationRecord[] = []
      if (input.entitlementTreatment === 'keep_and_compensate') {
        input.impact.customerIds.forEach((customerId) => {
          compensations.push({
            id: genId('comp'),
            workOrderId,
            customerId,
            type: 'extension',
            status: 'proposed',
            description: '延长权益有效期作为补偿',
          })
        })
      } else if (input.entitlementTreatment === 'migrate_or_refund') {
        input.impact.customerIds.forEach((customerId) => {
          compensations.push({
            id: genId('comp'),
            workOrderId,
            customerId,
            type: 'replacement',
            status: 'proposed',
            description: '迁移至替代商品或退款',
          })
        })
      }

      // Pre-complete notify_customers if no customers (only when the template includes it)
      if (input.impact.customerIds.length === 0) {
        const notifyTask = tasks.find((t) => t.type === 'notify_customers')
        if (notifyTask) {
          notifyTask.completedAt = createdAt
          notifyTask.completedBy = 'system'
        }
      }

      const timelineEntry: ReverseTimelineEntry = {
        id: genId('tl'),
        workOrderId,
        type: 'created',
        actor: input.createdBy,
        detail: `创建逆向工单：${input.action} / ${input.reason}`,
        createdAt,
      }

      this.workOrders.push(workOrder)
      this.impacts.push(storedImpact)
      this.plans.push(plan)
      this.tasks.push(...tasks)
      this.notices.push(...notices)
      this.compensations.push(...compensations)
      this.timeline.push(timelineEntry)

      return {
        workOrder,
        impact: storedImpact,
        plan,
        tasks,
        notices,
        compensations,
        timeline: [timelineEntry],
      }
    },

    _appendTimeline(workOrderId: string, type: ReverseTimelineEntry['type'], actor: string, detail: string) {
      this.timeline.push({
        id: genId('tl'),
        workOrderId,
        type,
        actor,
        detail,
        createdAt: new Date().toISOString(),
      })
    },

    transition(id: string, nextStatus: ReverseWorkOrderStatus, actor: string) {
      const wo = this.workOrders.find((w) => w.id === id)
      if (!wo) throw new Error('工单不存在')

      if (!FLOW[wo.status].includes(nextStatus)) {
        throw new Error('工单状态流转不合法')
      }

      // Gate: transition to cross_system_verification requires notices and compensations resolved
      if (nextStatus === 'cross_system_verification') {
        const notices = this.notices.filter((n) => n.workOrderId === id)
        if (notices.some((n) => !['delivered', 'manual_confirmed'].includes(n.status))) {
          throw new Error('客户通知尚未完成')
        }
        const comps = this.compensations.filter((c) => c.workOrderId === id)
        if (comps.some((c) => c.status !== 'completed')) {
          throw new Error('客户补偿或迁移退款处置尚未完成')
        }
      }

      wo.status = nextStatus
      wo.updatedAt = new Date().toISOString()
      this._appendTimeline(id, 'status_changed', actor, `状态变更为 ${nextStatus}`)
    },

    acknowledge(id: string, actor: string) {
      const wo = this.workOrders.find((w) => w.id === id)
      if (!wo) throw new Error('工单不存在')
      wo.acknowledgedAt = new Date().toISOString()
      this._appendTimeline(id, 'acknowledged', actor, '工单已确认受理')
    },

    completeTask(workOrderId: string, taskId: string, actor: string) {
      const task = this.tasks.find((t) => t.id === taskId && t.workOrderId === workOrderId)
      if (!task) throw new Error('任务不存在')
      task.completedAt = new Date().toISOString()
      task.completedBy = actor
      this._appendTimeline(workOrderId, 'task_completed', actor, `完成任务：${task.title}`)
    },

    confirmPlan(workOrderId: string, actor: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')
      const plan = this.plans.find((p) => p.id === wo.treatmentPlanId)
      if (!plan) throw new Error('处置方案不存在')
      if (plan.status !== 'draft') throw new Error('当前方案不可确认')

      plan.status = 'confirmed'
      plan.confirmedBy = actor
      plan.confirmedAt = new Date().toISOString()
      this._appendTimeline(workOrderId, 'plan_confirmed', actor, `处置方案 v${plan.version} 已确认`)

      // Complete decide_customer_treatment task
      const task = this.tasks.find((t) => t.workOrderId === workOrderId && t.type === 'decide_customer_treatment')
      if (task && !task.completedAt) {
        task.completedAt = new Date().toISOString()
        task.completedBy = actor
      }
    },

    rejectPlan(workOrderId: string, actor: string, reason: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')
      if (wo.status !== 'plan_confirmation') throw new Error('当前状态不可驳回方案')

      const plan = this.plans.find((p) => p.id === wo.treatmentPlanId)
      if (!plan) throw new Error('处置方案不存在')

      plan.status = 'rejected'
      plan.rejectedBy = actor
      plan.rejectedAt = new Date().toISOString()
      plan.rejectionReason = reason

      // Return to impact_analysis
      wo.status = 'impact_analysis'
      wo.updatedAt = new Date().toISOString()
      this._appendTimeline(workOrderId, 'plan_rejected', actor, `处置方案 v${plan.version} 被驳回：${reason}`)
    },

    revisePlan(workOrderId: string, patch: Partial<Pick<TreatmentPlan, 'summary' | 'entitlementTreatment'>>, actor: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')

      const existingPlans = this.plans.filter((p) => p.workOrderId === workOrderId)
      const maxVersion = Math.max(...existingPlans.map((p) => p.version))
      const currentPlan = existingPlans.find((p) => p.id === wo.treatmentPlanId)!

      const newPlan: TreatmentPlan = {
        id: genId('plan'),
        workOrderId,
        version: maxVersion + 1,
        status: 'draft',
        entitlementTreatment: patch.entitlementTreatment ?? currentPlan.entitlementTreatment,
        summary: patch.summary ?? currentPlan.summary,
      }

      this.plans.push(newPlan)
      wo.treatmentPlanId = newPlan.id
      wo.updatedAt = new Date().toISOString()
      this._appendTimeline(workOrderId, 'plan_revised', actor, `处置方案修订为 v${newPlan.version}`)
    },

    markNoticeDelivered(workOrderId: string, noticeId: string, actor: string) {
      const notice = this.notices.find((n) => n.id === noticeId && n.workOrderId === workOrderId)
      if (!notice) throw new Error('通知不存在')
      notice.status = 'delivered'
      notice.deliveredAt = new Date().toISOString()
      this._appendTimeline(workOrderId, 'notice_delivered', actor, `通知已送达：${notice.customerId}`)

      this._checkAllNoticesResolved(workOrderId, actor)
    },

    markNoticeFailed(workOrderId: string, noticeId: string, actor: string) {
      const notice = this.notices.find((n) => n.id === noticeId && n.workOrderId === workOrderId)
      if (!notice) throw new Error('通知不存在')
      if (notice.attempts >= 4) throw new Error('通知失败次数已达上限，请手动确认')

      notice.attempts += 1
      notice.status = 'failed'
      this._appendTimeline(workOrderId, 'notice_failed', actor, `通知发送失败（第 ${notice.attempts} 次）：${notice.customerId}`)
    },

    markNoticeManualConfirmed(workOrderId: string, noticeId: string, actor: string, result: string) {
      const notice = this.notices.find((n) => n.id === noticeId && n.workOrderId === workOrderId)
      if (!notice) throw new Error('通知不存在')
      notice.status = 'manual_confirmed'
      notice.manualResult = result
      this._appendTimeline(workOrderId, 'notice_manual_confirmed', actor, `通知手动确认：${notice.customerId} - ${result}`)

      this._checkAllNoticesResolved(workOrderId, actor)
    },

    _checkAllNoticesResolved(workOrderId: string, actor: string) {
      const allNotices = this.notices.filter((n) => n.workOrderId === workOrderId)
      if (allNotices.length === 0) return
      if (allNotices.every((n) => ['delivered', 'manual_confirmed'].includes(n.status))) {
        const task = this.tasks.find((t) => t.workOrderId === workOrderId && t.type === 'notify_customers')
        if (task && !task.completedAt) {
          task.completedAt = new Date().toISOString()
          task.completedBy = actor
        }
      }
    },

    updateCompensation(workOrderId: string, compensationId: string, patch: Partial<CompensationRecord>, actor: string) {
      const comp = this.compensations.find((c) => c.id === compensationId && c.workOrderId === workOrderId)
      if (!comp) throw new Error('补偿记录不存在')

      if (patch.status === 'completed' && (!patch.evidenceReference || !patch.evidenceReference.trim())) {
        throw new Error('处置完成凭证尚未填写')
      }

      Object.assign(comp, patch)
      if (patch.status === 'completed') {
        comp.completedAt = new Date().toISOString()
      }
      this._appendTimeline(workOrderId, 'compensation_updated', actor, `补偿记录更新：${comp.type} → ${comp.status}`)
    },

    recordClosureReview(workOrderId: string, review: {
      rootCause: string
      improvementAction: string
      preventionAction: string
      responsibilityOwner: string
    }, actor: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')
      wo.rootCause = review.rootCause
      wo.improvementAction = review.improvementAction
      wo.preventionAction = review.preventionAction
      wo.responsibilityOwner = review.responsibilityOwner
      wo.updatedAt = new Date().toISOString()
      this._appendTimeline(workOrderId, 'closure_review_recorded', actor, '关闭审查信息已填写')
    },

    markCrossSystemReconciled(workOrderId: string, actor: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')
      wo.crossSystemReconciledAt = new Date().toISOString()
      wo.updatedAt = new Date().toISOString()

      // Complete reconcile_state task
      const task = this.tasks.find((t) => t.workOrderId === workOrderId && t.type === 'reconcile_state')
      if (task && !task.completedAt) {
        task.completedAt = new Date().toISOString()
        task.completedBy = actor
      }
      this._appendTimeline(workOrderId, 'reconciled', actor, '跨系统状态核验完成')
    },

    close(workOrderId: string, actor: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')

      const impact = this.impacts.find((i) => i.workOrderId === workOrderId)
      if (!impact || !impact.isComplete) throw new Error('影响快照尚未补齐')

      const tasks = this.tasks.filter((t) => t.workOrderId === workOrderId)
      if (tasks.some((t) => !t.completedAt)) throw new Error('仍有未完成执行任务')

      const notices = this.notices.filter((n) => n.workOrderId === workOrderId)
      if (notices.some((n) => !['delivered', 'manual_confirmed'].includes(n.status))) {
        throw new Error('客户通知尚未完成')
      }

      const comps = this.compensations.filter((c) => c.workOrderId === workOrderId)
      if (comps.some((c) => c.status !== 'completed')) {
        throw new Error('客户补偿或迁移退款处置尚未完成')
      }

      const plan = this.plans.find((p) => p.id === wo.treatmentPlanId)
      if (!plan || !plan.confirmedAt) throw new Error('处置方案尚未确认')

      if (!wo.crossSystemReconciledAt) throw new Error('跨系统状态尚未核验')

      if (![wo.rootCause, wo.improvementAction, wo.preventionAction, wo.responsibilityOwner].every((v) => v?.trim())) {
        throw new Error('根因和改进措施尚未填写')
      }

      if (['S1', 'S2'].includes(wo.severity)
        && wo.createdBy === plan.confirmedBy
        && wo.createdBy === actor) {
        throw new Error('S1/S2 工单不能由发起人独自审批并关闭')
      }

      wo.status = 'closed'
      wo.closedBy = actor
      wo.closedAt = new Date().toISOString()
      wo.updatedAt = wo.closedAt
      this._appendTimeline(workOrderId, 'closure_review_recorded', actor, '工单已关闭')
    },

    cancel(workOrderId: string, actor: string, reason: string) {
      const wo = this.workOrders.find((w) => w.id === workOrderId)
      if (!wo) throw new Error('工单不存在')
      if (wo.status !== 'pending_assessment') {
        throw new Error('已开始处理的工单不能取消，请创建后续工单')
      }

      // Verify untouched: no operator-completed task, no notice attempt, no plan confirmed/rejected, no compensation changed
      const tasks = this.tasks.filter((t) => t.workOrderId === workOrderId)
      if (tasks.some((t) => t.completedAt && t.completedBy !== 'system')) {
        throw new Error('已开始处理的工单不能取消，请创建后续工单')
      }
      const notices = this.notices.filter((n) => n.workOrderId === workOrderId)
      if (notices.some((n) => n.attempts > 0)) {
        throw new Error('已开始处理的工单不能取消，请创建后续工单')
      }
      const plans = this.plans.filter((p) => p.workOrderId === workOrderId)
      if (plans.some((p) => p.status === 'confirmed' || p.status === 'rejected')) {
        throw new Error('已开始处理的工单不能取消，请创建后续工单')
      }
      const comps = this.compensations.filter((c) => c.workOrderId === workOrderId)
      if (comps.some((c) => c.status !== 'proposed')) {
        throw new Error('已开始处理的工单不能取消，请创建后续工单')
      }

      wo.status = 'cancelled'
      wo.updatedAt = new Date().toISOString()
      this._appendTimeline(workOrderId, 'cancelled', actor, `工单已取消：${reason}`)
    },

    createFollowUp(parentWorkOrderId: string, input: CreateProductWorkOrderInput): CreateResult {
      const result = this.createProductWorkOrder({
        ...input,
        parentWorkOrderId,
      })

      // Append follow_up_created to parent timeline
      this._appendTimeline(parentWorkOrderId, 'follow_up_created', input.createdBy, `创建后续工单：${result.workOrder.id}`)

      return result
    },
  },
})
