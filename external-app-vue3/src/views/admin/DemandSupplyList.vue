<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import DemandAggregationPanel from '@/components/admin/demand-flow/DemandAggregationPanel.vue'
import { useDemandStore } from '@/stores/demand'
import { useSupplyTaskStore } from '@/stores/supplyTasks'
import type { SupplyDecision } from '@/types/demandFlow'

const router = useRouter()
const demand = useDemandStore()
const supply = useSupplyTaskStore()

const filterStatus = ref('')
const filterDecision = ref('')

const tasks = computed(() => {
  let items = [...supply.tasks]
  if (filterStatus.value) items = items.filter((t) => t.status === filterStatus.value)
  if (filterDecision.value) items = items.filter((t) => t.decision === filterDecision.value)
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

function onAggregate(demandIds: string[], title: string) {
  const decision: SupplyDecision = 'initiate_product'
  const task = supply.aggregateDemands(demandIds, decision, 'op-1', title)
  router.push(`/admin/approval/demand-supply/${task.id}`)
}

function goToDetail(id: string) {
  router.push(`/admin/approval/demand-supply/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="需求供给" desc="需求去重聚合、供给任务与发布回告" />

    <DemandAggregationPanel :demands="demand.list" class="mb-4" @aggregate="onAggregate" />

    <div class="mb-3 flex flex-wrap gap-2">
      <select v-model="filterStatus" data-testid="filter-status" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部状态</option>
        <option value="evaluating">评估中</option>
        <option value="planned">已规划</option>
        <option value="in_production">加工中</option>
        <option value="published">已发布</option>
        <option value="cancelled">已取消</option>
      </select>
      <select v-model="filterDecision" data-testid="filter-decision" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部决策</option>
        <option value="recommend_existing">推荐现有</option>
        <option value="link_preparing">关联准备中</option>
        <option value="initiate_product">商品立项</option>
        <option value="custom_project">定制项目</option>
        <option value="unsupported">暂不支持</option>
      </select>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400">
          <tr>
            <th class="px-3 py-2">供给任务</th>
            <th class="px-3 py-2">状态</th>
            <th class="px-3 py-2">决策</th>
            <th class="px-3 py-2">需求数</th>
            <th class="px-3 py-2">负责人</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tasks" :key="t.id" data-testid="task-row" :data-id="t.id" class="cursor-pointer border-t border-slate-100 hover:bg-slate-50" @click="goToDetail(t.id)">
            <td class="px-3 py-2 text-slate-700">{{ t.title }}</td>
            <td class="px-3 py-2"><StatusBadge dict="supplyTask" :value="t.status" /></td>
            <td class="px-3 py-2"><StatusBadge dict="supplyDecision" :value="t.decision" /></td>
            <td class="px-3 py-2 text-slate-600">{{ t.demandIds.length }}</td>
            <td class="px-3 py-2 text-slate-600">{{ t.owner }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!tasks.length" class="py-6 text-center text-[12px] text-slate-400">暂无供给任务</div>
    </div>
  </div>
</template>
