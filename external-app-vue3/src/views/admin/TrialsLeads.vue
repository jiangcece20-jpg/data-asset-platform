<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { revealDemandPhoneForOps } from '@/domain/demandSubmitFields'
import { useDemandStore } from '@/stores/demand'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import type { DemandStatus } from '@/types/domain'

const demand = useDemandStore()
const catalog = useCatalogStore()
const user = useUserStore()
const visibleDemand = computed(() => demand.list.filter((item) => item.source !== 'listing_request'))

const feedbackDraft = reactive<Record<string, string>>({})
const noteDraft = reactive<Record<string, string>>({})

type LeadDecisionStatus = Extract<DemandStatus, 'recommended' | 'custom_required' | 'not_supported'>
type DemandItem = (typeof visibleDemand.value)[number]

const processTarget = ref<DemandItem | null>(null)
const viewTarget = ref<DemandItem | null>(null)

function openProcess(d: DemandItem) {
  processTarget.value = d
  if (!feedbackDraft[d.id] && d.feedbackMessage) feedbackDraft[d.id] = d.feedbackMessage
}

function decideFromModal(status: LeadDecisionStatus) {
  if (!processTarget.value) return
  updateLead(processTarget.value.id, status)
  processTarget.value = null
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

function updateLead(id: string, status: LeadDecisionStatus) {
  if (status === 'not_supported' && !window.confirm(`确认将该需求置为「${DEMAND_ACTION_LABEL[status]}」？该结果会作为反馈通知用户，且不便撤回。`)) return
  demand.updateStatus(id, status, feedbackDraft[id] || defaultFeedback(status))
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

    <div class="ui-card">
      <div class="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
        <div class="text-sm font-semibold text-ink-900">需求线索</div>
        <span class="text-xs text-ink-500">需求线索待处理{{ visibleDemand.filter((d) => d.status === 'new').length }}条</span>
      </div>
      <div v-for="d in visibleDemand" :key="d.id" class="border-b border-ink-100 px-5 py-5 last:border-b-0">
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
      <div v-if="!visibleDemand.length" class="py-8 text-center text-xs text-ink-500">暂无需求线索</div>
    </div>

    <!-- 处理线索弹窗 -->
    <div
      v-if="processTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40"
      @click.self="processTarget = null"
    >
      <div class="w-[560px] rounded-xl bg-white p-6 shadow-float">
        <div class="mb-5 flex items-center justify-between">
          <div class="text-base font-semibold text-ink-900">处理线索</div>
          <button class="text-ink-500 hover:text-ink-700" @click="processTarget = null">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="mb-4 text-sm font-medium text-ink-900">{{ processTarget.question || processTarget.objectDesc || '需求单' }}</div>
        <div class="space-y-4">
          <div>
            <div class="mb-1 text-xs text-ink-500">给用户的反馈</div>
            <textarea
              v-model="feedbackDraft[processTarget.id]"
              :placeholder="processTarget.feedbackMessage || '请填写推荐给用户的商品说明或查看指引，留空使用系统默认文案'"
              rows="3"
              class="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div class="mt-0.5 text-right text-[11px] text-ink-500">{{ (feedbackDraft[processTarget.id] || '').length }}/500</div>
          </div>
          <div>
            <div class="mb-1 text-xs text-ink-500">内部备注</div>
            <textarea
              v-model="noteDraft[processTarget.id]"
              placeholder="请填写运营内部备注，便于后续追溯（选填）"
              rows="3"
              class="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div class="mt-0.5 text-right text-[11px] text-ink-500">{{ (noteDraft[processTarget.id] || '').length }}/128</div>
          </div>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-sm text-ink-700 transition hover:bg-ink-100" @click="processTarget = null">取消</button>
          <button
            v-for="action in LEAD_DECISIONS"
            :key="action.status"
            class="rounded-md px-4 py-2 text-sm font-medium transition"
            :class="action.activeClass"
            @click="decideFromModal(action.status)"
          >{{ action.label }}</button>
        </div>
      </div>
    </div>

    <!-- 查看处理记录弹窗 -->
    <div
      v-if="viewTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40"
      @click.self="viewTarget = null"
    >
      <div class="w-[520px] rounded-xl bg-white p-6 shadow-float">
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
            <div><span class="text-ink-500">处理人</span>　<span class="text-ink-900">{{ user.enterprise?.adminName || '—' }}</span></div>
            <div><span class="text-ink-500">处理时间</span>　<span class="text-ink-900">{{ new Date().toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }).replace(/\//g, '-') }}</span></div>
          </div>
          <div>
            <div class="text-ink-500">给用户的反馈</div>
            <div class="mt-1 text-ink-900">{{ viewTarget.feedbackMessage || defaultFeedback(viewTarget.status) }}</div>
          </div>
          <div>
            <div class="text-ink-500">内部备注</div>
            <div class="mt-1 text-ink-900">{{ noteDraft[viewTarget.id] || '—' }}</div>
          </div>
        </div>
        <div class="mt-5 flex justify-end">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-sm text-ink-700 transition hover:bg-ink-100" @click="viewTarget = null">关闭</button>
        </div>
      </div>
    </div>

  </div>
</template>
