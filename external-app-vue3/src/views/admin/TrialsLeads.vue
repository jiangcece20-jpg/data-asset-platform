<script setup lang="ts">
import { reactive, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useTrialStore } from '@/stores/trials'
import { useDemandStore } from '@/stores/demand'
import { useCatalogStore } from '@/stores/catalog'
import { useListingRequestStore } from '@/stores/listingRequests'
import type { DemandStatus, ListingRequestStatus } from '@/types/domain'

const trials = useTrialStore()
const demand = useDemandStore()
const catalog = useCatalogStore()
const listingRequests = useListingRequestStore()

const feedbackDraft = reactive<Record<string, string>>({})
const altProductDraft = ref('')

const DEMAND_ACTION_LABEL: Partial<Record<DemandStatus, string>> = {
  assigned: '分派',
  recommended: '推荐现有商品',
  custom_required: '需要定制',
  not_supported: '暂不支持',
  closed: '关闭'
}

function updateLead(id: string, status: DemandStatus) {
  const destructive = status === 'not_supported' || status === 'closed'
  if (destructive && !window.confirm(`确认将该需求置为「${DEMAND_ACTION_LABEL[status]}」？该结果会作为反馈通知用户，且不便撤回。`)) return
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

function advanceListing(id: string, status: ListingRequestStatus) {
  const feedbackMap: Record<ListingRequestStatus, string> = {
    submitted: '已收到求上架请求',
    evaluating: '正在评估上架可行性',
    preparing: '已进入上架准备阶段',
    published: '已上架可信空间，可前往购买',
    unsupported: '当前资产暂不满足出域与商品化条件'
  }
  if (status === 'unsupported' && !window.confirm('确认标记为「暂不支持」？该结果会作为反馈通知用户。')) return
  const altIds = status === 'unsupported' && altProductDraft.value
    ? altProductDraft.value.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  listingRequests.advance(id, status, feedbackMap[status], altIds)
  altProductDraft.value = ''
}
</script>

<template>
  <div>
    <PageHeader title="试用与线索" desc="测试额度、试用审批、询价、无结果需求" />

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">试用审批（待处理 {{ trials.pendingApplications.length }}）</div>
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400"><tr><th class="py-1.5">商品</th><th class="py-1.5">方式</th><th class="py-1.5">额度</th><th class="py-1.5">状态</th><th class="py-1.5">操作</th></tr></thead>
        <tbody>
          <tr v-for="t in trials.list" :key="t.id" class="border-t border-slate-100">
            <td class="py-1.5 text-slate-700">{{ t.productName }}</td>
            <td class="py-1.5 text-slate-500">{{ t.mode === 'self_service' ? '自助试用' : '申请试用' }}</td>
            <td class="py-1.5 text-slate-500">{{ t.usedQuota }}/{{ t.quota }}</td>
            <td class="py-1.5"><StatusBadge dict="trial" :value="t.status" /></td>
            <td class="py-1.5">
              <template v-if="t.status === 'pending'">
                <button class="mr-2 text-emerald-600 hover:underline" @click="trials.approve(t.id)">通过</button>
                <button class="text-red-500 hover:underline" @click="trials.reject(t.id)">驳回</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!trials.list.length" class="py-3 text-center text-[12px] text-slate-400">暂无试用申请</div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">需求线索（待处理 {{ demand.list.filter((d) => d.status === 'new').length }}）</div>
      <div v-for="d in demand.list" :key="d.id" class="mb-3 rounded-lg border border-slate-100 p-3">
        <div class="flex items-center justify-between">
          <div class="text-[13px] font-medium text-slate-800">{{ d.question || d.objectDesc || '需求单' }}</div>
          <StatusBadge dict="demand" :value="d.status" />
        </div>
        <div class="mt-1 text-[12px] text-slate-400">
          对象：{{ d.objectDesc || '—' }} · 地域：{{ d.region || '—' }} · 场景：{{ d.scenario || '—' }} · 期望交付：{{ d.expectedDelivery || '—' }}
        </div>
        <div v-if="d.browsedProductIds.length" class="mt-1 text-[12px] text-slate-400">
          浏览过：{{ d.browsedProductIds.map((id) => catalog.byId(id)?.name).filter(Boolean).join('、') }}
        </div>
        <textarea v-model="feedbackDraft[d.id]" :placeholder="d.feedbackMessage || '给用户的反馈信息（留空使用默认文案）'" rows="1" class="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="mr-1 text-[11px] text-slate-400">处置：</span>
          <button class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100" @click="updateLead(d.id, 'assigned')">分派</button>
          <button class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100" @click="updateLead(d.id, 'recommended')">推荐现有商品</button>
          <button class="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-medium text-purple-700 transition hover:bg-purple-100" @click="updateLead(d.id, 'custom_required')">需要定制</button>
          <button class="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100" @click="updateLead(d.id, 'not_supported')">暂不支持</button>
          <button class="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100" @click="updateLead(d.id, 'closed')">关闭</button>
        </div>
      </div>
      <div v-if="!demand.list.length" class="py-3 text-center text-[12px] text-slate-400">暂无需求线索</div>
    </div>

    <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">求上架（{{ listingRequests.list.length }}）</div>
      <div v-for="r in listingRequests.list" :key="r.id" class="mb-3 rounded-lg border border-slate-100 p-3">
        <div class="flex items-center justify-between">
          <div class="text-[13px] font-medium text-slate-800">{{ r.productName }}</div>
          <StatusBadge dict="listingRequest" :value="r.status" />
        </div>
        <div class="mt-1 text-[12px] text-slate-400">
          场景：{{ r.scenario }} · 范围：{{ r.requestedScope }} · 时间：{{ r.timeRange }} · 频率：{{ r.updateFrequency }} · 期望：{{ r.expectedAvailableAt }}
        </div>
        <div v-if="r.note" class="mt-1 text-[12px] text-slate-400">备注：{{ r.note }}</div>
        <div v-if="r.feedbackMessage" class="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500">{{ r.feedbackMessage }}</div>
        <input
          v-if="r.status === 'submitted' || r.status === 'evaluating'"
          v-model="altProductDraft"
          placeholder="暂不支持时填写替代商品 ID（逗号分隔）"
          class="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-[12px]"
        />
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="mr-1 text-[11px] text-slate-400">处置：</span>
          <button v-if="r.status === 'submitted'" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100" @click="advanceListing(r.id, 'evaluating')">开始评估</button>
          <button v-if="r.status === 'evaluating'" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100" @click="advanceListing(r.id, 'preparing')">进入上架准备</button>
          <button v-if="r.status === 'preparing' || r.status === 'evaluating'" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100" @click="advanceListing(r.id, 'published')">标记已上架</button>
          <button v-if="r.status === 'submitted' || r.status === 'evaluating'" class="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100" @click="advanceListing(r.id, 'unsupported')">暂不支持</button>
        </div>
      </div>
      <div v-if="!listingRequests.list.length" class="py-3 text-center text-[12px] text-slate-400">暂无求上架请求</div>
    </div>
  </div>
</template>
