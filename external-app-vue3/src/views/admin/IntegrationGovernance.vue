<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import DeadLetterList from '@/components/admin/integration/DeadLetterList.vue'
import { useIntegrationStore } from '@/stores/integration'
import { useSpaceOrderStore } from '@/stores/spaceOrders'

const integration = useIntegrationStore()
const spaceOrders = useSpaceOrderStore()
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

function reconcile(subjectId: string) {
  const mirror = spaceOrders.byId(subjectId)
  if (mirror) void spaceOrders.reconcileIntent(mirror.purchaseIntentId)
}
</script>

<template>
  <div>
    <PageHeader title="集成治理" desc="连接器事件、对象版本、重试/死信与可审计人工修正" />
    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <DeadLetterList class="mb-4" :events="deadLetters" @repair="repair" @reconcile="reconcile" />

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">全部连接器事件</div>
      <div v-for="e in allEvents" :key="e.id" data-testid="event-row" :data-id="e.id" class="flex items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
        <span class="text-slate-600">{{ e.connector }} · 对象 {{ e.subjectId }} · {{ e.eventType }} · v{{ e.eventVersion }}</span>
        <StatusBadge dict="connectorEvent" :value="e.status" />
        <span class="text-slate-400">结果：{{ e.status }} · 重试 {{ e.attempts }} 次 · 处理版本 {{ e.processingVersion }}</span>
        <span v-if="e.workOrderId" class="ml-auto text-blue-600">工单 {{ e.workOrderId }}</span>
      </div>
      <div v-if="!allEvents.length" class="py-3 text-center text-[12px] text-slate-400">暂无事件</div>
    </div>
  </div>
</template>
