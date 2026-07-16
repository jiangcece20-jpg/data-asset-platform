<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { useCatalogStore } from '@/stores/catalog'
import type { ReverseWorkOrderStatus, ReverseSeverity } from '@/types/reverseFlow'

const router = useRouter()
const woStore = useReverseWorkOrderStore()
const catalog = useCatalogStore()

const severityRank: Record<ReverseSeverity, number> = { S1: 0, S2: 1, S3: 2 }
const terminal = new Set<ReverseWorkOrderStatus>(['closed', 'cancelled'])

const filterStatus = ref('')
const filterSeverity = ref('')
const filterAction = ref('')
const filterReason = ref('')
const filterProduct = ref('')

const sortedList = computed(() => {
  let items = [...woStore.workOrders]

  if (filterStatus.value) items = items.filter((w) => w.status === filterStatus.value)
  if (filterSeverity.value) items = items.filter((w) => w.severity === filterSeverity.value)
  if (filterAction.value) items = items.filter((w) => w.action === filterAction.value)
  if (filterReason.value) items = items.filter((w) => w.reason === filterReason.value)
  if (filterProduct.value) items = items.filter((w) => w.subjectId === filterProduct.value)

  return items.sort((a, b) =>
    Number(terminal.has(a.status)) - Number(terminal.has(b.status))
    || severityRank[a.severity] - severityRank[b.severity]
    || b.createdAt.localeCompare(a.createdAt),
  )
})

function productName(id: string) {
  return catalog.byId(id)?.name || id
}

function goToDetail(id: string) {
  router.push(`/admin/approval/reverse-work-orders/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="逆向工单" desc="商品暂停、下架、召回的统一工单管理" />

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap gap-2">
      <select v-model="filterStatus" data-testid="filter-status" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部状态</option>
        <option value="pending_assessment">待评估</option>
        <option value="impact_analysis">影响分析</option>
        <option value="plan_confirmation">方案确认</option>
        <option value="executing">执行中</option>
        <option value="customer_handling">客户处置</option>
        <option value="cross_system_verification">跨系统核验</option>
        <option value="closed">已关闭</option>
        <option value="cancelled">已取消</option>
      </select>
      <select v-model="filterSeverity" data-testid="filter-severity" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部级别</option>
        <option value="S1">S1</option>
        <option value="S2">S2</option>
        <option value="S3">S3</option>
      </select>
      <select v-model="filterAction" data-testid="filter-action" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部操作</option>
        <option value="pause">暂停销售</option>
        <option value="delist">下架</option>
        <option value="recall">召回</option>
      </select>
      <select v-model="filterReason" data-testid="filter-reason" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部原因</option>
        <option value="commercial_adjustment">商业调整</option>
        <option value="quality_issue">质量问题</option>
        <option value="compliance_risk">合规风险</option>
        <option value="upstream_stop">上游停供</option>
      </select>
      <input v-model="filterProduct" data-testid="filter-product" placeholder="商品ID" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400">
          <tr>
            <th class="px-3 py-2">级别</th>
            <th class="px-3 py-2">状态</th>
            <th class="px-3 py-2">商品</th>
            <th class="px-3 py-2">操作</th>
            <th class="px-3 py-2">原因</th>
            <th class="px-3 py-2">负责人</th>
            <th class="px-3 py-2">创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="w in sortedList"
            :key="w.id"
            data-testid="wo-row"
            :data-id="w.id"
            class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
            @click="goToDetail(w.id)"
          >
            <td class="px-3 py-2"><StatusBadge dict="reverseSeverity" :value="w.severity" /></td>
            <td class="px-3 py-2"><StatusBadge dict="reverseWo" :value="w.status" /></td>
            <td class="px-3 py-2 text-slate-700">{{ productName(w.subjectId) }}</td>
            <td class="px-3 py-2 text-slate-600">{{ w.action }}</td>
            <td class="px-3 py-2 text-slate-600">{{ w.reason }}</td>
            <td class="px-3 py-2 text-slate-600">{{ w.owner }}</td>
            <td class="px-3 py-2 text-slate-400">{{ w.createdAt.slice(0, 19) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!sortedList.length" class="py-6 text-center text-[12px] text-slate-400">暂无逆向工单</div>
    </div>
  </div>
</template>
