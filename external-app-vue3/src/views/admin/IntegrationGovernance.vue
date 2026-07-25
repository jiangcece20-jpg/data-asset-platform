<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import DeadLetterList from '@/components/admin/integration/DeadLetterList.vue'
import { useIntegrationStore } from '@/stores/integration'

const integration = useIntegrationStore()
const error = ref('')

const deadLetters = computed(() => integration.deadLetters)
const allEvents = computed(() => [...integration.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

function repair(id: string) {
  error.value = ''
  try {
    integration.repair(id, 'op-1', new Date(Date.now() + 3600_000).toISOString())
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div>
    <PageHeader title="集成治理" desc="连接器事件、死信队列与人工修正" />
    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <DeadLetterList class="mb-4" :events="deadLetters" @repair="repair" />

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">全部连接器事件</div>
      <div v-for="e in allEvents" :key="e.id" data-testid="event-row" class="flex items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
        <span class="text-slate-600">{{ e.connector }} · {{ e.eventType }} · v{{ e.eventVersion }}</span>
        <StatusBadge dict="connectorEvent" :value="e.status" />
        <span class="ml-auto text-slate-400">处理版本 {{ e.processingVersion }}</span>
      </div>
      <div v-if="!allEvents.length" class="py-3 text-center text-[12px] text-slate-400">暂无事件</div>
    </div>
  </div>
</template>
