<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import RefundSequencePanel from '@/components/admin/after-sales/RefundSequencePanel.vue'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { useRefundStore } from '@/stores/refunds'
import { useAfterSalesStore } from '@/stores/afterSales'

const route = useRoute()
const wo = useReverseWorkOrderStore()
const refunds = useRefundStore()
const after = useAfterSalesStore()

const workOrderId = computed(() => String(route.params.id))
const workOrder = computed(() => wo.byId(workOrderId.value))
const relatedRefunds = computed(() => refunds.list.filter((r) => r.workOrderId === workOrderId.value))
const error = ref('')

function onExecute(refundId: string, outcome: 'succeeded' | 'failed' | 'rejected') {
  error.value = ''
  try {
    after.completeCustomerRefund(refundId, outcome, 'op-1')
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div v-if="workOrder">
    <PageHeader :title="`售后工单 ${workOrder.id}`" desc="退款排序与客户处置" />
    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <div class="mb-4 flex items-center gap-2">
      <StatusBadge dict="reverseSeverity" :value="workOrder.severity" />
      <StatusBadge dict="reverseWo" :value="workOrder.status" />
      <span class="text-[12px] text-slate-500">对象：{{ workOrder.subjectType }} · {{ workOrder.subjectId }}</span>
    </div>

    <RefundSequencePanel
      v-for="r in relatedRefunds"
      :key="r.id"
      class="mb-3"
      :refund="r"
      @execute="onExecute"
    />
    <div v-if="!relatedRefunds.length" class="rounded-xl border border-slate-200 bg-white p-4 text-[12px] text-slate-400">该工单暂无关联退款</div>
  </div>
  <div v-else class="py-10 text-center text-[13px] text-slate-400">售后工单不存在</div>
</template>
