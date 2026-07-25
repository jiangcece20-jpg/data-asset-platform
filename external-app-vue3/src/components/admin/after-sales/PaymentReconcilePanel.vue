<script setup lang="ts">
import { ref } from 'vue'
import type { PaymentAmbiguityCase } from '@/types/afterSales'

const emit = defineEmits<{ reconcile: [orderId: string, scenario: PaymentAmbiguityCase] }>()
const props = defineProps<{ orderId: string }>()

const scenarios: Array<{ value: PaymentAmbiguityCase; label: string }> = [
  { value: 'space_success_app_stale', label: '空间成功·APP未更新 → 补写订单' },
  { value: 'space_failed_app_processing', label: '空间失败·APP处理中 → 关闭并允许重试' },
  { value: 'space_charged_delivery_failed', label: '已扣款·交付失败 → 继续或退款' },
  { value: 'identity_mismatch', label: '企业身份不匹配 → 暂停并修正绑定' },
  { value: 'product_delisted', label: '商品已下架 → 专项处置' }
]
const chosen = ref<PaymentAmbiguityCase>('space_success_app_stale')
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" data-testid="payment-reconcile">
    <div class="mb-2 text-[13px] font-medium text-slate-700">支付结果核对</div>
    <select v-model="chosen" data-testid="reconcile-case" class="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
      <option v-for="s in scenarios" :key="s.value" :value="s.value">{{ s.label }}</option>
    </select>
    <button class="rounded-lg bg-blue-600 px-3 py-1 text-[12px] text-white" data-testid="reconcile-run" @click="emit('reconcile', props.orderId, chosen)">执行对账决策</button>
  </div>
</template>
