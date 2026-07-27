<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import DeadLetterList from '@/components/admin/integration/DeadLetterList.vue'
import { useIntegrationStore } from '@/stores/integration'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import type { ConnectorEvent } from '@/types/configGovernance'

const integration = useIntegrationStore()
const spaceOrders = useSpaceOrderStore()
const error = ref('')

const deadLetters = computed(() => integration.deadLetters)
const allEvents = computed(() => [...integration.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const longUnlinkedIntents = computed(() => spaceOrders.longUnlinkedIntents())

function repair(id: string) {
  error.value = ''
  try {
    integration.repair(id, 'op-1', new Date(Date.now() + 3600_000).toISOString())
  } catch (e) {
    error.value = (e as Error).message
  }
}

function canReconcile(event: ConnectorEvent): boolean {
  return Boolean(spaceOrders.reconciliationIntentId(event))
}

function reconcile(event: ConnectorEvent) {
  const intentId = spaceOrders.reconciliationIntentId(event)
  if (intentId) void spaceOrders.reconcileIntent(intentId)
}

function reconcileLongUnlinked(intentId: string) {
  void spaceOrders.reconcileIntent(intentId)
}
</script>

<template>
  <div>
    <PageHeader title="集成治理" desc="连接器事件、对象版本、重试/死信与可审计人工修正" />
    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="long-unlinked-list">
      <div class="mb-2 text-[13px] font-medium text-amber-900">长时间未关联购买意图</div>
      <div v-for="intent in longUnlinkedIntents" :key="intent.id" data-testid="long-unlinked-row" class="flex items-center gap-2 border-t border-amber-100 py-2 text-[12px]">
        <span class="text-amber-900">购买意图 {{ intent.id }} · 返回后仍未关联订单</span>
        <button class="ml-auto rounded border border-amber-300 px-2 py-0.5 text-amber-800" data-testid="reconcile-long-unlinked" @click="reconcileLongUnlinked(intent.id)">主动对账</button>
      </div>
      <div v-if="!longUnlinkedIntents.length" class="py-2 text-center text-[12px] text-amber-700">暂无长时间未关联购买意图</div>
    </div>

    <DeadLetterList class="mb-4" :events="deadLetters" :can-reconcile="canReconcile" @repair="repair" @reconcile="reconcile" />

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
