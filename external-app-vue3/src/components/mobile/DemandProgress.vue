<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import type { DemandLead } from '@/types/domain'
import type { DemandCallback } from '@/types/demandFlow'

// 只接收当前客户自己的需求与回告；调用方负责过滤，组件不跨客户读取。
const props = defineProps<{
  demands: DemandLead[]
  callbacks: DemandCallback[]
}>()

const emit = defineEmits<{ view: [productId: string] }>()

function callbackFor(demandId: string): DemandCallback | undefined {
  // 仅展示已送达 / 手动确认的回告
  return props.callbacks.find(
    (c) => c.demandId === demandId && (c.status === 'delivered' || c.status === 'manual_confirmed')
  )
}

const items = computed(() => props.demands.map((d) => ({ demand: d, callback: callbackFor(d.id) })))
</script>

<template>
  <div>
    <div
      v-for="{ demand, callback } in items"
      :key="demand.id"
      data-testid="demand-item"
      :data-id="demand.id"
      class="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] text-slate-700">{{ demand.question }}</span>
        <StatusBadge dict="demand" :value="demand.status" />
      </div>
      <div v-if="demand.status === 'withdrawn'" class="mt-1 text-[12px] text-slate-400">该需求已撤回，不再接收后续通知</div>
      <div v-else-if="demand.status === 'aggregated'" class="mt-1 text-[12px] text-slate-400">需求处理中，上架后将通知您</div>
      <div v-if="callback && callback.status !== 'pending'" data-testid="demand-callback" class="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
        <div class="text-[12px] text-emerald-700">您的需求已上架</div>
        <button class="mt-1 text-[12px] font-medium text-brand-600" data-testid="view-product" @click="emit('view', callback.supplyTaskId)">查看商品</button>
      </div>
    </div>
    <div v-if="!items.length" class="py-6 text-center text-[12px] text-slate-400">暂无需求记录</div>
  </div>
</template>
