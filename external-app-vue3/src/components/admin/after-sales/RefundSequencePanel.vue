<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { RefundRecord } from '@/types/afterSales'

const props = defineProps<{ refund: RefundRecord }>()
const emit = defineEmits<{
  execute: [id: string, outcome: 'succeeded' | 'failed' | 'rejected']
}>()

// 撤销权益按钮在退款成功前禁用：先冻结 → 执行 → 成功后才撤销。
const canExecute = () => props.refund.status === 'reviewing' || props.refund.status === 'processing'
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" data-testid="refund-sequence">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-[13px] font-medium text-slate-700">退款处置</span>
      <StatusBadge dict="refund" :value="refund.status" />
      <StatusBadge dict="refundScope" :value="refund.scope" />
      <span class="ml-auto text-[12px] text-slate-500">¥{{ refund.amount }}</span>
    </div>
    <ol class="mb-3 space-y-1 text-[12px] text-slate-500">
      <li>1. 冻结受影响权益（发起退款时自动完成）</li>
      <li>2. 支付/财务执行退款</li>
      <li>3. 退款成功后撤销权益</li>
    </ol>
    <div class="flex gap-2">
      <button
        class="rounded-lg bg-emerald-600 px-3 py-1 text-[12px] text-white disabled:opacity-40"
        data-testid="refund-succeed"
        :disabled="!canExecute()"
        @click="emit('execute', refund.id, 'succeeded')"
      >退款成功并撤销权益</button>
      <button
        class="rounded-lg bg-red-500 px-3 py-1 text-[12px] text-white disabled:opacity-40"
        data-testid="refund-fail"
        :disabled="!canExecute()"
        @click="emit('execute', refund.id, 'failed')"
      >退款失败并恢复权益</button>
    </div>
  </div>
</template>
