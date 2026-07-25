<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { useRefundStore } from '@/stores/refunds'

const router = useRouter()
const wo = useReverseWorkOrderStore()
const refunds = useRefundStore()

const filterStatus = ref('')

// 售后相关工单：subjectType 为 order / contract
const afterSalesWOs = computed(() => {
  let items = wo.workOrders.filter((w) => w.subjectType === 'order' || w.subjectType === 'contract')
  if (filterStatus.value) items = items.filter((w) => w.status === filterStatus.value)
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

function goToDetail(id: string) {
  router.push(`/admin/approval/after-sales/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="交易售后" desc="退款、支付对账、合同终止与席位收回" />

    <div class="mb-3 flex gap-2">
      <select v-model="filterStatus" data-testid="filter-status" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部状态</option>
        <option value="pending_assessment">待评估</option>
        <option value="impact_analysis">影响分析</option>
        <option value="executing">执行中</option>
        <option value="closed">已关闭</option>
      </select>
    </div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400">
          <tr>
            <th class="px-3 py-2">类型</th>
            <th class="px-3 py-2">对象</th>
            <th class="px-3 py-2">级别</th>
            <th class="px-3 py-2">状态</th>
            <th class="px-3 py-2">负责人</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in afterSalesWOs" :key="w.id" data-testid="as-row" :data-id="w.id" class="cursor-pointer border-t border-slate-100 hover:bg-slate-50" @click="goToDetail(w.id)">
            <td class="px-3 py-2 text-slate-600">{{ w.subjectType }}</td>
            <td class="px-3 py-2 text-slate-700">{{ w.subjectId }}</td>
            <td class="px-3 py-2"><StatusBadge dict="reverseSeverity" :value="w.severity" /></td>
            <td class="px-3 py-2"><StatusBadge dict="reverseWo" :value="w.status" /></td>
            <td class="px-3 py-2 text-slate-600">{{ w.owner }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!afterSalesWOs.length" class="py-6 text-center text-[12px] text-slate-400">暂无售后工单</div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">退款记录</div>
      <div v-for="r in refunds.list" :key="r.id" class="flex items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
        <span class="text-slate-600">订单 {{ r.orderId }} · {{ r.customerId }}</span>
        <StatusBadge dict="refund" :value="r.status" />
        <span class="ml-auto text-slate-400">¥{{ r.amount }}</span>
      </div>
      <div v-if="!refunds.list.length" class="py-3 text-center text-[12px] text-slate-400">暂无退款记录</div>
    </div>
  </div>
</template>
