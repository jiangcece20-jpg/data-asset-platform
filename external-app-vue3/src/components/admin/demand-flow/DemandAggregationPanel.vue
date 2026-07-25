<script setup lang="ts">
import { computed, reactive } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { groupSimilarDemands } from '@/domain/demandNormalization'
import type { DemandLead } from '@/types/domain'

const props = defineProps<{ demands: DemandLead[] }>()
const emit = defineEmits<{ aggregate: [demandIds: string[], title: string] }>()

const selected = reactive<Record<string, boolean>>({})

// 仅对尚未归入任务、非撤回的需求做相似度分组。
const groups = computed(() => {
  const open = props.demands.filter((d) => !d.supplyTaskId && d.status !== 'withdrawn')
  const byId = new Map(open.map((d) => [d.id, d]))
  return groupSimilarDemands(open).map((g) => ({
    key: g.key,
    demands: g.demandIds.map((id) => byId.get(id)!).filter(Boolean)
  }))
})

function aggregateGroup(demands: DemandLead[]) {
  const ids = demands.filter((d) => selected[d.id]).map((d) => d.id)
  const chosen = ids.length ? ids : demands.map((d) => d.id)
  emit('aggregate', chosen, demands[0]?.objectDesc ?? '需求供给任务')
  chosen.forEach((id) => (selected[id] = false))
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-[13px] font-medium text-slate-700">待聚合需求（按相似度分组）</div>
    <div v-for="g in groups" :key="g.key" data-testid="demand-group" class="mb-3 rounded-lg border border-slate-100 p-2">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-[12px] text-slate-500">{{ g.demands[0]?.objectDesc }} · {{ g.demands[0]?.region }} · {{ g.demands[0]?.timeRange }}（{{ g.demands.length }} 条）</span>
        <button class="rounded-full bg-blue-600 px-3 py-1 text-[11px] text-white" data-testid="aggregate-btn" @click="aggregateGroup(g.demands)">聚合为供给任务</button>
      </div>
      <label v-for="d in g.demands" :key="d.id" class="flex items-center gap-2 py-1 text-[12px]">
        <input v-model="selected[d.id]" type="checkbox" data-testid="demand-check" :data-id="d.id" />
        <span class="text-slate-600">{{ d.question }}</span>
        <StatusBadge dict="demand" :value="d.status" />
        <span class="ml-auto text-slate-400">{{ d.ownerId }}</span>
      </label>
    </div>
    <div v-if="!groups.length" class="py-3 text-center text-[12px] text-slate-400">暂无待聚合需求</div>
  </div>
</template>
