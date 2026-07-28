<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ImpactSnapshotPanel from '@/components/admin/reverse-flow/ImpactSnapshotPanel.vue'
import ExecutionTaskList from '@/components/admin/reverse-flow/ExecutionTaskList.vue'
import WorkOrderTimeline from '@/components/admin/reverse-flow/WorkOrderTimeline.vue'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { useCatalogStore } from '@/stores/catalog'
import type { ReverseWorkOrderStatus } from '@/types/reverseFlow'

const props = defineProps<{
  workOrderId: string
}>()

const router = useRouter()
const woStore = useReverseWorkOrderStore()
const catalog = useCatalogStore()

const gateError = ref('')
const actor = 'admin-1'

// Local form state for closure review
const closureRootCause = ref('')
const closureImprovement = ref('')
const closurePrevention = ref('')
const closureOwner = ref('')

// Local form state for manual notice confirmation
const manualResults = ref<Record<string, string>>({})
// Local form state for compensation evidence
const compEvidence = ref<Record<string, string>>({})

const wo = computed(() => woStore.byId(props.workOrderId))
const impact = computed(() => woStore.impactFor(props.workOrderId))
const plans = computed(() => woStore.plansFor(props.workOrderId))
const currentPlan = computed(() => plans.value.find((p) => p.id === wo.value?.treatmentPlanId))
const tasks = computed(() => woStore.tasksFor(props.workOrderId))
const notices = computed(() => woStore.noticesFor(props.workOrderId))
const compensations = computed(() => woStore.compensationsFor(props.workOrderId))
const timeline = computed(() => woStore.timeline.filter((t) => t.workOrderId === props.workOrderId))

const isClosed = computed(() => wo.value?.status === 'closed' || wo.value?.status === 'cancelled')

const nextStatus = computed<ReverseWorkOrderStatus | null>(() => {
  if (!wo.value) return null
  const flow: Record<ReverseWorkOrderStatus, ReverseWorkOrderStatus | null> = {
    pending_assessment: 'impact_analysis',
    impact_analysis: 'plan_confirmation',
    plan_confirmation: 'executing',
    executing: 'customer_handling',
    customer_handling: 'cross_system_verification',
    cross_system_verification: null,
    closed: null,
    cancelled: null,
  }
  return flow[wo.value.status]
})

const nextStatusLabel: Record<ReverseWorkOrderStatus, string> = {
  pending_assessment: '推进至影响分析',
  impact_analysis: '推进至方案确认',
  plan_confirmation: '推进至执行',
  executing: '推进至客户处置',
  customer_handling: '推进至跨系统核验',
  cross_system_verification: '',
  closed: '',
  cancelled: '',
}

const isOverdue = computed(() => {
  if (!wo.value || isClosed.value) return false
  const now = new Date().toISOString()
  return wo.value.acknowledgeDueAt < now && !wo.value.acknowledgedAt
})

const productName = computed(() => {
  if (!wo.value) return ''
  return catalog.byId(wo.value.subjectId)?.name || wo.value.subjectId
})

function clearError() { gateError.value = '' }

function handleAcknowledge() {
  clearError()
  try {
    woStore.acknowledge(props.workOrderId, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleAdvance() {
  clearError()
  if (!nextStatus.value || !wo.value) return
  try {
    // When leaving executing stage, complete stop_new_sales and remove_references tasks
    if (wo.value.status === 'executing') {
      const execTasks = woStore.tasksFor(props.workOrderId)
      execTasks.forEach((t) => {
        if ((t.type === 'stop_new_sales' || t.type === 'remove_references') && !t.completedAt) {
          woStore.completeTask(props.workOrderId, t.id, actor)
        }
      })
    }
    woStore.transition(props.workOrderId, nextStatus.value, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleConfirmPlan() {
  clearError()
  try {
    woStore.confirmPlan(props.workOrderId, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleRejectPlan() {
  clearError()
  try {
    woStore.rejectPlan(props.workOrderId, actor, '方案需要调整')
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleNoticeDeliver(noticeId: string) {
  clearError()
  try {
    woStore.markNoticeDelivered(props.workOrderId, noticeId, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleNoticeFail(noticeId: string) {
  clearError()
  try {
    woStore.markNoticeFailed(props.workOrderId, noticeId, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleNoticeManual(noticeId: string) {
  clearError()
  try {
    woStore.markNoticeManualConfirmed(props.workOrderId, noticeId, actor, manualResults.value[noticeId] || '已电话确认')
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleCompComplete(compId: string) {
  clearError()
  try {
    woStore.updateCompensation(props.workOrderId, compId, {
      status: 'completed',
      evidenceReference: compEvidence.value[compId] || '',
    }, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleRecordClosure() {
  clearError()
  try {
    woStore.recordClosureReview(props.workOrderId, {
      rootCause: closureRootCause.value,
      improvementAction: closureImprovement.value,
      preventionAction: closurePrevention.value,
      responsibilityOwner: closureOwner.value,
    }, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleReconcile() {
  clearError()
  try {
    woStore.markCrossSystemReconciled(props.workOrderId, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleClose() {
  clearError()
  try {
    woStore.close(props.workOrderId, actor)
  } catch (e: any) {
    gateError.value = e.message
  }
}

function handleCreateFollowUp() {
  // Navigate to resource edit to initiate a new reverse action
  if (!wo.value) return
  const product = catalog.byId(wo.value.subjectId)
  router.push(`/admin/resources/${product?.resourceId ?? wo.value.subjectId}`)
}
</script>

<template>
  <div v-if="wo">
    <div class="mb-1 flex items-center gap-2 text-[12px] text-slate-400">
      <button class="hover:underline" @click="router.push('/admin/approval/reverse-work-orders')">逆向工单</button>
      <span>/</span>
      <span>{{ wo.id }}</span>
    </div>
    <PageHeader :title="`逆向工单 ${wo.id}`" :desc="`${wo.action} / ${wo.reason} · ${productName}`" />

    <!-- Status bar -->
    <div class="mb-4 flex items-center gap-2">
      <StatusBadge dict="reverseWo" :value="wo.status" />
      <StatusBadge dict="reverseSeverity" :value="wo.severity" />
      <span v-if="isOverdue" class="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-600">受理超时</span>
      <span class="text-xs text-slate-400">创建于 {{ wo.createdAt.slice(0, 19) }}</span>
    </div>

    <!-- Gate error -->
    <div v-if="gateError" data-testid="gate-error" class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-600">
      {{ gateError }}
    </div>

    <!-- Basic info -->
    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">基本信息</div>
      <div class="grid grid-cols-3 gap-3 text-[12px]">
        <div><span class="text-slate-400">发起人</span><span class="ml-2 text-slate-700">{{ wo.createdBy }}</span></div>
        <div><span class="text-slate-400">负责人</span><span class="ml-2 text-slate-700">{{ wo.owner }}</span></div>
        <div><span class="text-slate-400">原因说明</span><span class="ml-2 text-slate-700">{{ wo.reasonDetail }}</span></div>
        <div><span class="text-slate-400">受理截止</span><span class="ml-2 text-slate-700">{{ wo.acknowledgeDueAt.slice(0, 19) }}</span></div>
        <div><span class="text-slate-400">方案截止</span><span class="ml-2 text-slate-700">{{ wo.planDueAt.slice(0, 19) }}</span></div>
        <div><span class="text-slate-400">复核时间</span><span class="ml-2 text-slate-700">{{ wo.reviewAt.slice(0, 19) }}</span></div>
        <div v-if="wo.acknowledgedAt"><span class="text-slate-400">受理时间</span><span class="ml-2 text-slate-700">{{ wo.acknowledgedAt.slice(0, 19) }}</span></div>
        <div v-if="wo.parentWorkOrderId"><span class="text-slate-400">父工单</span><span class="ml-2 text-blue-600 cursor-pointer" @click="router.push(`/admin/approval/reverse-work-orders/${wo.parentWorkOrderId}`)">{{ wo.parentWorkOrderId }}</span></div>
      </div>
    </div>

    <!-- Impact snapshot -->
    <div class="mb-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">影响快照</div>
      <ImpactSnapshotPanel :impact="impact" />
    </div>

    <!-- Treatment plan -->
    <div v-if="currentPlan" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-[13px] font-medium text-slate-700">处置方案 (v{{ currentPlan.version }})</div>
        <StatusBadge dict="compStatus" :value="currentPlan.status === 'confirmed' ? 'completed' : currentPlan.status === 'rejected' ? 'rejected' : 'proposed'" />
      </div>
      <div class="text-[12px] text-slate-600">{{ currentPlan.summary }}</div>
      <div class="mt-1 text-[11px] text-slate-400">权益处置：{{ currentPlan.entitlementTreatment }}</div>

      <!-- Plan actions (only in plan_confirmation and not closed) -->
      <div v-if="wo.status === 'plan_confirmation' && !isClosed" class="mt-3 flex gap-2">
        <button data-testid="confirm-plan" class="rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] text-white" @click="handleConfirmPlan">确认方案</button>
        <button data-testid="reject-plan" class="rounded-lg bg-red-50 px-3 py-1.5 text-[12px] text-red-600" @click="handleRejectPlan">驳回方案</button>
      </div>
    </div>

    <!-- All plans history -->
    <div v-if="plans.length > 1" class="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div class="mb-1 text-[12px] text-slate-500">方案历史</div>
      <div v-for="p in plans" :key="p.id" class="text-[11px] text-slate-400">
        v{{ p.version }} - {{ p.status }}{{ p.rejectionReason ? ` (${p.rejectionReason})` : '' }}
      </div>
    </div>

    <!-- Execution tasks -->
    <div class="mb-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">执行任务</div>
      <ExecutionTaskList :tasks="tasks" />
    </div>

    <!-- Customer notices -->
    <div v-if="notices.length > 0" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">客户通知</div>
      <div v-for="n in notices" :key="n.id" class="mb-2 rounded-lg border border-slate-100 p-3">
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-slate-700">客户：{{ n.customerId }}</span>
          <StatusBadge dict="noticeStatus" :value="n.status" />
        </div>
        <div class="mt-1 text-[11px] text-slate-400">尝试次数：{{ n.attempts }} / 4</div>
        <div v-if="n.manualResult" class="mt-1 text-[11px] text-slate-400">手动结果：{{ n.manualResult }}</div>

        <!-- Notice actions (when not closed) -->
        <div v-if="!isClosed" class="mt-2 flex gap-2">
          <button
            v-if="n.status === 'pending' || n.status === 'failed'"
            :data-testid="`notice-${n.id}-deliver`"
            class="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-600"
            @click="handleNoticeDeliver(n.id)"
          >标记送达</button>
          <button
            v-if="n.status === 'pending' || n.status === 'failed'"
            :data-testid="`notice-${n.id}-fail`"
            class="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600"
            @click="handleNoticeFail(n.id)"
          >标记失败</button>
          <template v-if="n.attempts >= 4 && n.status !== 'delivered' && n.status !== 'manual_confirmed'">
            <input
              :data-testid="`notice-${n.id}-manual-result`"
              v-model="manualResults[n.id]"
              placeholder="手动确认结果"
              class="rounded border border-slate-200 px-2 py-1 text-[11px]"
            />
            <button
              :data-testid="`notice-${n.id}-manual`"
              class="rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-600"
              @click="handleNoticeManual(n.id)"
            >手动确认</button>
          </template>
        </div>
      </div>
    </div>

    <!-- Compensation records -->
    <div v-if="compensations.length > 0" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">补偿/迁移退款</div>
      <div v-for="c in compensations" :key="c.id" class="mb-2 rounded-lg border border-slate-100 p-3">
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-slate-700">客户：{{ c.customerId }} · {{ c.type }}</span>
          <StatusBadge dict="compStatus" :value="c.status" />
        </div>
        <div class="mt-1 text-[11px] text-slate-400">{{ c.description }}</div>

        <div v-if="c.status !== 'completed' && !isClosed" class="mt-2 flex items-center gap-2">
          <input
            :data-testid="`comp-${c.id}-evidence`"
            v-model="compEvidence[c.id]"
            placeholder="完成凭证"
            class="rounded border border-slate-200 px-2 py-1 text-[11px]"
          />
          <button
            :data-testid="`comp-${c.id}-complete`"
            class="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-600"
            @click="handleCompComplete(c.id)"
          >完成</button>
        </div>
      </div>
    </div>

    <!-- Closure review form -->
    <div v-if="wo.status === 'cross_system_verification' && !isClosed" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">关闭审查</div>
      <div class="grid grid-cols-2 gap-2 text-[12px]">
        <label class="block"><span class="mb-1 block text-xs text-slate-400">根因</span><input data-testid="closure-root-cause" v-model="closureRootCause" class="w-full rounded-lg border border-slate-200 px-2 py-1" /></label>
        <label class="block"><span class="mb-1 block text-xs text-slate-400">负责人</span><input data-testid="closure-owner" v-model="closureOwner" class="w-full rounded-lg border border-slate-200 px-2 py-1" /></label>
        <label class="block"><span class="mb-1 block text-xs text-slate-400">改进措施</span><input data-testid="closure-improvement" v-model="closureImprovement" class="w-full rounded-lg border border-slate-200 px-2 py-1" /></label>
        <label class="block"><span class="mb-1 block text-xs text-slate-400">预防措施</span><input data-testid="closure-prevention" v-model="closurePrevention" class="w-full rounded-lg border border-slate-200 px-2 py-1" /></label>
      </div>
      <button data-testid="record-closure" class="mt-2 rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="handleRecordClosure">保存关闭审查</button>
    </div>

    <!-- Timeline -->
    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">时间线</div>
      <WorkOrderTimeline :entries="timeline" />
    </div>

    <!-- Action bar -->
    <div class="flex gap-2">
      <!-- Acknowledge button -->
      <button
        v-if="!wo.acknowledgedAt && !isClosed"
        data-testid="ack-btn"
        class="rounded-lg bg-blue-500 px-4 py-2 text-[13px] text-white"
        @click="handleAcknowledge"
      >确认受理</button>

      <!-- Advance button -->
      <button
        v-if="nextStatus && !isClosed"
        data-testid="advance-btn"
        class="rounded-lg bg-brand-500 px-4 py-2 text-[13px] text-white"
        @click="handleAdvance"
      >{{ nextStatusLabel[wo.status] }}</button>

      <!-- Reconcile button -->
      <button
        v-if="wo.status === 'cross_system_verification' && !wo.crossSystemReconciledAt && !isClosed"
        data-testid="reconcile-btn"
        class="rounded-lg bg-purple-500 px-4 py-2 text-[13px] text-white"
        @click="handleReconcile"
      >跨系统核验</button>

      <!-- Close button -->
      <button
        v-if="wo.status === 'cross_system_verification' && !isClosed"
        data-testid="close-btn"
        class="rounded-lg bg-red-500 px-4 py-2 text-[13px] text-white"
        @click="handleClose"
      >关闭工单</button>

      <!-- Create follow-up -->
      <button
        v-if="isClosed"
        data-testid="create-followup"
        class="rounded-lg bg-slate-800 px-4 py-2 text-[13px] text-white"
        @click="handleCreateFollowUp"
      >创建后续工单</button>
    </div>
  </div>
  <div v-else class="text-sm text-slate-400">工单不存在</div>
</template>
