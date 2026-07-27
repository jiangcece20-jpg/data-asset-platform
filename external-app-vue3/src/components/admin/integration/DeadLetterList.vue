<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { ConnectorEvent } from '@/types/configGovernance'

defineProps<{ events: ConnectorEvent[] }>()
const emit = defineEmits<{ repair: [id: string]; reconcile: [subjectId: string] }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" data-testid="dead-letter-list">
    <div class="mb-2 text-[13px] font-medium text-slate-700">死信队列</div>
    <div v-for="e in events" :key="e.id" data-testid="dead-letter-row" :data-id="e.id" class="flex items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
      <span class="text-slate-600">{{ e.connector }} · 对象 {{ e.subjectId }} · {{ e.eventType }} · v{{ e.eventVersion }}</span>
      <StatusBadge dict="connectorEvent" :value="e.status" />
      <span class="text-slate-400">处理版本 {{ e.processingVersion }} · 尝试 {{ e.attempts }}</span>
      <button v-if="e.connector === 'trusted_space'" class="rounded border border-blue-200 px-2 py-0.5 text-blue-600" data-testid="reconcile-event" @click="emit('reconcile', e.subjectId)">主动对账</button>
      <button class="ml-auto rounded bg-blue-600 px-2 py-0.5 text-white" data-testid="repair-btn" @click="emit('repair', e.id)">人工修正</button>
    </div>
    <div v-if="!events.length" class="py-3 text-center text-[12px] text-slate-400">暂无死信事件</div>
  </div>
</template>
