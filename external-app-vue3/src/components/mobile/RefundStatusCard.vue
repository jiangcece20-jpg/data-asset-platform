<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { RefundRecord } from '@/types/afterSales'

// 只展示当前客户自己的退款记录；调用方负责过滤。
defineProps<{ refunds: RefundRecord[] }>()

// 退款成功前不承诺“仍可使用”，仅陈述处理状态。
const message: Record<string, string> = {
  reviewing: '退款审核中，受影响权益已冻结。',
  processing: '退款执行中，请耐心等待。',
  succeeded: '退款成功，相关权益已撤销。',
  failed: '退款失败，我们将与您联系；权益已恢复。',
  rejected: '退款未通过，我们将与您联系说明原因。'
}
</script>

<template>
  <div>
    <div v-for="r in refunds" :key="r.id" data-testid="refund-card" :data-id="r.id" class="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card">
      <div class="flex items-center justify-between">
        <span class="text-[13px] text-slate-700">订单 {{ r.orderId }}</span>
        <StatusBadge dict="refund" :value="r.status" />
      </div>
      <div class="mt-1 text-[12px] text-slate-500">{{ message[r.status] || '退款处理中' }}</div>
    </div>
    <div v-if="!refunds.length" class="py-6 text-center text-[12px] text-slate-400">暂无退款记录</div>
  </div>
</template>
