<script setup lang="ts">
import { computed, reactive } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useDemandStore } from '@/stores/demand'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import type { DemandStatus } from '@/types/domain'

const demand = useDemandStore()
const catalog = useCatalogStore()
const user = useUserStore()
const visibleDemand = computed(() => demand.list.filter((item) => item.source !== 'listing_request'))

const feedbackDraft = reactive<Record<string, string>>({})

type LeadDecisionStatus = Extract<DemandStatus, 'recommended' | 'custom_required' | 'not_supported'>

const LEAD_DECISIONS: Array<{
  status: LeadDecisionStatus
  label: string
  inactiveClass: string
  activeClass: string
}> = [
  {
    status: 'recommended',
    label: '推荐现有商品',
    inactiveClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    activeClass: 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
  },
  {
    status: 'custom_required',
    label: '需要定制',
    inactiveClass: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
    activeClass: 'border-purple-600 bg-purple-600 text-white shadow-sm'
  },
  {
    status: 'not_supported',
    label: '暂不支持',
    inactiveClass: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
    activeClass: 'border-red-600 bg-red-600 text-white shadow-sm'
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

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">需求线索（待处理 {{ visibleDemand.filter((d) => d.status === 'new').length }}）</div>
      <div v-for="d in visibleDemand" :key="d.id" class="mb-3 rounded-lg border border-slate-100 p-3">
        <div class="flex items-center justify-between">
          <div class="text-[13px] font-medium text-slate-800">{{ d.question || d.objectDesc || '需求单' }}</div>
          <StatusBadge dict="demand" :value="d.status" />
        </div>
        <div class="mt-1 space-y-0.5 text-[12px] text-slate-500">
          <div>企业名称：{{ leadEnterpriseName(d) }}</div>
          <div>需求描述：{{ d.scenario || '—' }}</div>
          <div>期望价格区间：{{ d.priceRange || '—' }}</div>
          <div>联系方式：{{ d.contact || '—' }}</div>
        </div>
        <div v-if="d.browsedProductIds.length" class="mt-1 text-[12px] text-slate-400">
          浏览过：{{ d.browsedProductIds.map((id) => catalog.byId(id)?.name).filter(Boolean).join('、') }}
        </div>
        <textarea v-model="feedbackDraft[d.id]" :placeholder="d.feedbackMessage || '给用户的反馈信息（留空使用默认文案）'" rows="1" class="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="mr-1 text-[11px] text-slate-400">处理结果：</span>
          <button
            v-for="action in LEAD_DECISIONS"
            :key="action.status"
            :data-testid="`lead-action-${action.status}`"
            :aria-pressed="d.status === action.status"
            class="rounded-lg border px-3 py-1 text-[11px] font-medium transition"
            :class="d.status === action.status ? action.activeClass : action.inactiveClass"
            @click="updateLead(d.id, action.status)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
      <div v-if="!visibleDemand.length" class="py-3 text-center text-[12px] text-slate-400">暂无需求线索</div>
    </div>

  </div>
</template>
