<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { DemandCallback, CallbackOutcome } from '@/types/demandFlow'

defineProps<{ callbacks: DemandCallback[] }>()
const emit = defineEmits<{
  deliver: [id: string]
  fail: [id: string]
  manual: [id: string]
  outcome: [id: string, outcome: CallbackOutcome]
}>()

const outcomes: CallbackOutcome[] = ['viewed', 'trialed', 'purchased', 'abandoned']
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-[13px] font-medium text-slate-700">客户回告</div>
    <div v-for="c in callbacks" :key="c.id" data-testid="callback-row" :data-id="c.id" class="flex flex-wrap items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
      <span class="text-slate-600">{{ c.customerId }}</span>
      <StatusBadge dict="callbackStatus" :value="c.status" />
      <StatusBadge dict="callbackOutcome" :value="c.outcome" />
      <span class="text-slate-400">尝试 {{ c.attempts }}</span>
      <div class="ml-auto flex gap-1">
        <button v-if="c.status !== 'delivered' && c.status !== 'manual_confirmed'" class="rounded bg-emerald-500 px-2 py-0.5 text-white" data-testid="cb-deliver" @click="emit('deliver', c.id)">送达</button>
        <button v-if="c.status !== 'delivered' && c.status !== 'manual_confirmed'" class="rounded bg-amber-500 px-2 py-0.5 text-white" data-testid="cb-fail" @click="emit('fail', c.id)">失败</button>
        <button v-if="c.attempts >= 4 && c.status !== 'manual_confirmed'" class="rounded bg-blue-500 px-2 py-0.5 text-white" data-testid="cb-manual" @click="emit('manual', c.id)">手动确认</button>
        <select v-if="c.status === 'delivered' || c.status === 'manual_confirmed'" class="rounded border border-slate-200 px-1 py-0.5" data-testid="cb-outcome" @change="emit('outcome', c.id, ($event.target as HTMLSelectElement).value as CallbackOutcome)">
          <option value="none">记录结果</option>
          <option v-for="o in outcomes" :key="o" :value="o">{{ o }}</option>
        </select>
      </div>
    </div>
    <div v-if="!callbacks.length" class="py-3 text-center text-[12px] text-slate-400">发布后生成客户回告</div>
  </div>
</template>
