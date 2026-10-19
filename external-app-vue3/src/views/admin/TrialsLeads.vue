<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { revealDemandPhoneForOps } from '@/domain/demandSubmitFields'
import { useDemandStore } from '@/stores/demand'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import type { DemandStatus } from '@/types/domain'
import { useCollectionDispatchStore, type DispatchOutcome } from '@/stores/collectionDispatch'

const demand = useDemandStore()
const catalog = useCatalogStore()
const user = useUserStore()
const dispatch = useCollectionDispatchStore()
const dispatchOutcome = ref<DispatchOutcome>('success')
const dispatchFilter = ref('')
const visibleDemand = computed(() => demand.list.filter((item) => item.source !== 'listing_request'))
const commissionStatuses = computed(() => [...new Set(visibleDemand.value
  .filter((item) => item.status === 'custom_required')
  .map((item) => dispatch.commissionStatusByLead(item.id)))])
const filteredDemand = computed(() => visibleDemand.value.filter((item) => {
  return !dispatchFilter.value || (item.status === 'custom_required' && dispatch.commissionStatusByLead(item.id) === dispatchFilter.value)
}))

const feedbackDraft = reactive<Record<string, string>>({})
const noteDraft = reactive<Record<string, string>>({})
const processErrors = reactive<Record<string, string>>({})
const processingLeadId = ref<string | null>(null)

type LeadDecisionStatus = Extract<DemandStatus, 'recommended' | 'custom_required' | 'not_supported'>
type DemandItem = (typeof visibleDemand.value)[number]

const processTarget = ref<DemandItem | null>(null)
const viewTarget = ref<DemandItem | null>(null)

function openProcess(d: DemandItem) {
  processTarget.value = d
  if (!feedbackDraft[d.id] && d.feedbackMessage) feedbackDraft[d.id] = d.feedbackMessage
  processErrors[d.id] = dispatch.byLead(d.id)?.error || ''
}

async function decideFromModal(status: LeadDecisionStatus) {
  if (!processTarget.value || processingLeadId.value) return
  if (await updateLead(processTarget.value.id, status)) processTarget.value = null
}

const LEAD_DECISIONS: Array<{
  status: LeadDecisionStatus
  label: string
  inactiveClass: string
  activeClass: string
}> = [
  {
    status: 'recommended',
    label: '推荐现有商品',
    inactiveClass: 'border-ink-200 bg-white text-brand-600 hover:border-brand-300 hover:bg-brand-50',
    activeClass: 'border-brand-500 bg-brand-500 text-white'
  },
  {
    status: 'custom_required',
    label: '需要定制',
    inactiveClass: 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-100',
    activeClass: 'border-ink-700 bg-ink-700 text-white'
  },
  {
    status: 'not_supported',
    label: '暂不支持',
    inactiveClass: 'border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:bg-ink-100',
    activeClass: 'border-ink-500 bg-ink-500 text-white'
  }
]

const DEMAND_ACTION_LABEL: Record<LeadDecisionStatus, string> = {
  recommended: '推荐现有商品',
  custom_required: '需要定制',
  not_supported: '暂不支持'
}

async function updateLead(id: string, status: LeadDecisionStatus) {
  if (processingLeadId.value) return false
  const lead = demand.byId(id)
  if (!lead || lead.status !== 'new') return false
  if (status !== 'custom_required' && dispatch.byLead(id)?.status === 'unknown') {
    processErrors[id] = '本次委托结果尚未确认，请稍后重试「需要定制」'
    return false
  }
  if (status === 'not_supported' && !window.confirm(`确认将该需求置为「${DEMAND_ACTION_LABEL[status]}」？该结果会作为反馈通知用户，且不便撤回。`)) return false
  processErrors[id] = ''
  if (status === 'custom_required') {
    processingLeadId.value = id
    const selectedOutcome = dispatchOutcome.value
    try {
      // Give the prototype a visible submitting state while the simulated request completes.
      await new Promise((resolve) => setTimeout(resolve, 450))
      const record = dispatch.create(lead, selectedOutcome)
      if (record.status === 'unknown' && selectedOutcome === 'unknown') {
        // An ambiguous receipt is reconciled within the same submission.
        dispatch.send(id)
      }
      if (record.status !== 'sent') {
        processErrors[id] = record.error || '处理暂未完成，请稍后重试'
        return false
      }
    } finally {
      processingLeadId.value = null
    }
  }
  return demand.processLead(id, status, feedbackDraft[id] || defaultFeedback(status), noteDraft[id] || '', '平台运营')
}

function defaultFeedback(status: DemandStatus) {
  const map: Record<DemandStatus, string> = {
    new: '',
    assigned: '需求已分派至商品运营跟进',
    aggregated: '需求已归入供给任务，正在处理',
    recommended: '已为你推荐相关现有商品，请查看详情',
    custom_required: '该需求需要定制加工，商务将与你联系',
    not_supported: '暂不支持该需求，感谢反馈',
    closed: '需求已关闭',
    withdrawn: '需求已撤回',
    reopened: '需求已重新打开'
  }
  return map[status]
}

function leadEnterpriseName(lead: { enterpriseName?: string; ownerId: string }) {
  if (lead.enterpriseName) return lead.enterpriseName
  return user.enterprise.members.some((member) => member.id === lead.ownerId)
    ? user.enterprise.name
    : '个人'
}

</script>

<template>
  <div>
    <PageHeader title="试用与线索" desc="集中处理询价与无结果需求" />

    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
      <label>委托状态 <select v-model="dispatchFilter" class="ml-2 rounded border border-ink-200 p-2" data-testid="dispatch-filter"><option value="">全部</option><option v-for="status in commissionStatuses" :key="status" :value="status">{{ status }}</option></select></label>
      <label class="ml-auto text-xs text-ink-500">原型模拟 · 采数据创建结果 <select v-model="dispatchOutcome" data-testid="dispatch-outcome" class="ml-2 rounded border border-ink-200 p-2"><option value="success">成功</option><option value="failure">失败</option><option value="unknown">回执不明，核对后确认已创建</option><option value="unresolved">回执不明，核对也超时</option></select></label>
    </div>

    <div class="ui-card">
      <div class="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
        <div class="text-sm font-semibold text-ink-900">需求线索</div>
        <span class="text-xs text-ink-500">需求线索待处理{{ visibleDemand.filter((d) => d.status === 'new').length }}条</span>
      </div>
      <div v-for="d in filteredDemand" :key="d.id" :data-testid="`lead-${d.id}`" class="border-b border-ink-100 px-5 py-5 last:border-b-0">
        <div class="flex items-start gap-4">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-100 text-sm text-ink-500">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-ink-900">{{ d.question || d.objectDesc || '需求单' }}</div>
              <div class="mt-1 line-clamp-2 text-xs leading-5 text-ink-600">需求描述：{{ d.scenario || '—' }}</div>
              <div class="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-xs lg:grid-cols-3">
                <div><span class="text-ink-500">企业名称：</span>{{ leadEnterpriseName(d) }}</div>
                <div><span class="text-ink-500">联系人：</span>{{ d.contactName || '—' }}</div>
                <div><span class="text-ink-500">联系方式：</span>{{ revealDemandPhoneForOps(d.contact || '') || '—' }}</div>
                <div><span class="text-ink-500">提交人账号：</span>{{ revealDemandPhoneForOps(d.submitterAccount || '') || '—' }}</div>
                <div><span class="text-ink-500">用户ID：</span>{{ d.submitterUserId || '—' }}</div>
                <div><span class="text-ink-500">期望价格区间：</span>{{ d.priceRange || '—' }}</div>
              </div>
              <div v-if="d.browsedProductIds.length" class="mt-1.5 text-xs text-ink-500">
                浏览过：{{ d.browsedProductIds.map((id) => catalog.byId(id)?.name).filter(Boolean).join('、') }}
              </div>
            </div>
          </div>
          <div class="shrink-0 pl-4">
            <div class="flex flex-col items-end gap-2 text-right">
              <StatusBadge dict="demand" :value="d.status" />
              <span v-if="d.status === 'custom_required'" class="text-xs text-ink-600">委托状态：{{ dispatch.commissionStatusByLead(d.id) }}</span>
              <button
                v-if="d.status === 'new'"
                class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                @click="openProcess(d)"
              >处理</button>
              <button
                v-else
                class="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs text-ink-600 transition hover:border-brand-300 hover:text-brand-600"
                @click="viewTarget = d"
              >查看</button>
            </div>
          </div>
        </div>
        <!-- 保持 DOM 内供测试直接定位 -->
        <div class="hidden">
          <button
            v-for="action in LEAD_DECISIONS"
            :key="action.status"
            :data-testid="`lead-action-${action.status}`"
            :aria-pressed="d.status === action.status"
            @click="updateLead(d.id, action.status)"
          >{{ action.label }}</button>
        </div>
      </div>
      <div v-if="!filteredDemand.length" class="py-8 text-center text-xs text-ink-500">暂无符合条件的需求线索</div>
    </div>

    <!-- 处理线索弹窗 -->
    <div
      v-if="processTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40"
      @click.self="!processingLeadId && (processTarget = null)"
    >
      <div data-testid="process-dialog" class="max-h-[90vh] w-[560px] max-w-[95vw] overflow-y-auto rounded-xl bg-white p-6 shadow-float">
        <div class="mb-5 flex items-center justify-between">
          <div class="text-base font-semibold text-ink-900">处理线索</div>
          <button class="text-ink-500 hover:text-ink-700" :disabled="!!processingLeadId" @click="processTarget = null">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="mb-4 text-sm font-medium text-ink-900">{{ processTarget.question || processTarget.objectDesc || '需求单' }}</div>
        <div v-if="processErrors[processTarget.id]" role="alert" class="mb-4 rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-600">{{ processErrors[processTarget.id] }}</div>
        <div class="space-y-4">
          <div>
            <div class="mb-1 text-xs text-ink-500">给用户的反馈</div>
            <textarea
              v-model="feedbackDraft[processTarget.id]"
              maxlength="500"
              :placeholder="processTarget.feedbackMessage || '请填写推荐给用户的商品说明或查看指引，留空使用系统默认文案'"
              rows="3"
              class="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              :disabled="!!processingLeadId"
            />
            <div class="mt-0.5 text-right text-[11px] text-ink-500">{{ (feedbackDraft[processTarget.id] || '').length }}/500</div>
          </div>
          <div>
            <div class="mb-1 text-xs text-ink-500">内部备注</div>
            <textarea
              v-model="noteDraft[processTarget.id]"
              maxlength="128"
              placeholder="请填写运营内部备注，便于后续追溯（选填）"
              rows="3"
              class="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              :disabled="!!processingLeadId"
            />
            <div class="mt-0.5 text-right text-[11px] text-ink-500">{{ (noteDraft[processTarget.id] || '').length }}/128</div>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-sm text-ink-700 transition hover:bg-ink-100" :disabled="!!processingLeadId" @click="processTarget = null">取消</button>
          <button
            v-for="action in LEAD_DECISIONS"
            :key="action.status"
            class="rounded-md px-4 py-2 text-sm font-medium transition"
            :class="action.activeClass"
            :disabled="!!processingLeadId"
            :aria-busy="processingLeadId === processTarget.id && action.status === 'custom_required'"
            @click="decideFromModal(action.status)"
          >
            <span v-if="processingLeadId === processTarget.id && action.status === 'custom_required'" class="inline-flex items-center gap-2">
              <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
              处理中…
            </span>
            <template v-else>{{ action.label }}</template>
          </button>
        </div>
      </div>
    </div>

    <!-- 查看处理记录弹窗 -->
    <div
      v-if="viewTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40"
      @click.self="viewTarget = null"
    >
      <div class="max-h-[90vh] w-[640px] max-w-[95vw] overflow-y-auto rounded-xl bg-white p-6 shadow-float">
        <div class="mb-5 flex items-center justify-between">
          <div class="text-base font-semibold text-ink-900">查看处理记录</div>
          <button class="text-ink-500 hover:text-ink-700" @click="viewTarget = null">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="space-y-4 text-xs">
          <div>
            <div class="text-ink-500">处理结果</div>
            <div class="mt-1 inline-block rounded px-2 py-0.5 text-sm font-medium" :class="LEAD_DECISIONS.find((a) => a.status === viewTarget.status)?.activeClass ?? 'border-ink-300 bg-ink-100 text-ink-700'">
              {{ DEMAND_ACTION_LABEL[viewTarget.status] || viewTarget.status }}
            </div>
          </div>
          <div class="flex gap-6">
            <div><span class="text-ink-500">处理人</span>　<span class="text-ink-900">{{ viewTarget.processedBy || '—' }}</span></div>
            <div><span class="text-ink-500">处理时间</span>　<span class="text-ink-900">{{ viewTarget.processedAt || '—' }}</span></div>
          </div>
          <div>
            <div class="text-ink-500">给用户的反馈</div>
            <div class="mt-1 text-ink-900">{{ viewTarget.feedbackMessage || defaultFeedback(viewTarget.status) }}</div>
          </div>
          <div>
            <div class="text-ink-500">内部备注</div>
            <div class="mt-1 text-ink-900">{{ viewTarget.internalNote || '—' }}</div>
          </div>
          <section v-if="dispatch.byLead(viewTarget.id)" class="border-t border-ink-200 pt-4" data-testid="dispatch-detail">
            <h3 class="mb-3 text-sm font-semibold">采数据委托</h3>
            <dl v-for="record in [dispatch.byLead(viewTarget.id)!]" :key="record.leadId" class="grid grid-cols-[100px_1fr] gap-2 break-words">
              <dt>委托状态</dt><dd>{{ dispatch.commissionStatusByLead(viewTarget.id) }}</dd>
              <dt>委托 ID</dt><dd>{{ record.payload.id }}</dd>
              <dt>委托名称</dt><dd>{{ record.payload.title }}</dd>
              <dt>委托预算</dt><dd>{{ record.payload.budget === undefined ? '未填写' : `¥${record.payload.budget}` }}</dd>
              <dt>委托人</dt><dd>{{ record.payload.client || '—' }}</dd>
              <dt>委托描述</dt><dd>{{ record.payload.description }}</dd>
              <dt>创建时间</dt><dd>{{ record.sentAt || '—' }}</dd>
              <dt v-if="record.shortened">发送内容</dt><dd v-if="record.shortened">超长内容已缩短，完整内容保留在线索中</dd>
            </dl>
          </section>
        </div>
        <div class="mt-5 flex justify-end">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-sm text-ink-700 transition hover:bg-ink-100" @click="viewTarget = null">关闭</button>
        </div>
      </div>
    </div>

  </div>
</template>
