<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResponsiveNow } from '@/composables/useResponsiveNow'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import DeadLetterList from '@/components/admin/integration/DeadLetterList.vue'
import { useIntegrationStore } from '@/stores/integration'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useAssetPlatformMonitoringStore } from '@/stores/assetPlatformMonitoring'
import type { ConnectorEvent } from '@/types/configGovernance'

const integration = useIntegrationStore()
const spaceOrders = useSpaceOrderStore()
const assetMonitoring = useAssetPlatformMonitoringStore()
const now = useResponsiveNow()
const error = ref('')

const deadLetters = computed(() => integration.deadLetters)
const allEvents = computed(() => [...integration.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const longUnlinkedIntents = computed(() => spaceOrders.longUnlinkedIntents(now.value))

function recordDisposition(id: string) {
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
    <PageHeader title="集成治理" desc="连接器事件、业务版本、重试/死信、审计处置与可信空间主动对账" />
    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <div class="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4" data-testid="asset-monitoring-overview">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-[13px] font-medium text-slate-800">资产平台数据变更监控 <span class="ml-1 rounded bg-white px-1.5 py-0.5 text-[10px] text-blue-600">一期架构预留</span></div>
          <p class="mt-1 text-[12px] text-slate-500">已提供版本、风险与处置状态 mock；真实轮询、告警和自动迁移暂不启用。</p>
        </div>
        <div class="flex gap-4 text-right text-[12px]">
          <div><div class="text-lg font-semibold text-slate-800">{{ assetMonitoring.monitoredProductCount }}</div><div class="text-slate-400">关联商品</div></div>
          <div><div class="text-lg font-semibold text-red-600">{{ assetMonitoring.highRiskCount }}</div><div class="text-slate-400">高风险</div></div>
        </div>
      </div>
      <div class="mt-3 overflow-hidden rounded-lg border border-blue-100 bg-white">
        <div v-for="record in assetMonitoring.records" :key="record.id" data-testid="asset-monitor-record" class="grid grid-cols-[1.4fr_.8fr_.5fr_2fr] items-center gap-3 border-t border-slate-100 px-3 py-2 text-[11px] first:border-t-0">
          <span class="font-medium text-slate-700">{{ record.resourceName }}</span>
          <span class="text-slate-500">{{ record.previousVersion }} → {{ record.currentVersion }}</span>
          <span :class="record.risk === 'high' ? 'text-red-600' : record.risk === 'low' ? 'text-amber-600' : 'text-emerald-600'">{{ record.risk === 'high' ? '高风险' : record.risk === 'low' ? '低风险' : '正常' }}</span>
          <span class="text-slate-500">{{ record.summary }}</span>
        </div>
      </div>
    </div>

    <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="long-unlinked-list">
      <div class="mb-2 text-[13px] font-medium text-amber-900">长时间未关联购买意图</div>
      <div v-for="intent in longUnlinkedIntents" :key="intent.id" data-testid="long-unlinked-row" class="flex items-center gap-2 border-t border-amber-100 py-2 text-[12px]">
        <span class="text-amber-900">购买意图 {{ intent.id }} · 返回后仍未关联订单</span>
        <button class="ml-auto rounded border border-amber-300 px-2 py-0.5 text-amber-800" data-testid="reconcile-long-unlinked" @click="reconcileLongUnlinked(intent.id)">主动对账</button>
      </div>
      <div v-if="!longUnlinkedIntents.length" class="py-2 text-center text-[12px] text-amber-700">暂无长时间未关联购买意图</div>
    </div>

    <DeadLetterList class="mb-4" :events="deadLetters" :can-reconcile="canReconcile" @repair="recordDisposition" @reconcile="reconcile" />

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">全部连接器事件</div>
      <div v-for="e in allEvents" :key="e.id" data-testid="event-row" :data-id="e.id" class="flex items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
        <span class="text-slate-600">{{ e.connector }} · 对象 {{ e.subjectId }} · {{ e.eventType }} · v{{ e.eventVersion }}</span>
        <StatusBadge dict="connectorEvent" :value="e.status" />
        <span class="text-slate-400">结果：{{ e.status }} · 重试 {{ e.attempts }} 次 · 业务版本 {{ e.processingVersion }}</span>
        <span v-if="e.repairRevisionId" class="ml-auto text-blue-600">审计处置已记录 · 工单 {{ e.workOrderId }}</span>
        <span v-else-if="e.workOrderId" class="ml-auto text-blue-600">工单 {{ e.workOrderId }}</span>
      </div>
      <div v-if="!allEvents.length" class="py-3 text-center text-[12px] text-slate-400">暂无事件</div>
    </div>
  </div>
</template>
