<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useOrderStore } from '@/stores/orders'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { statusMeta } from '@/utils/statusMeta'
import type { PaymentMethod } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const orders = useOrderStore()
const commerce = useDatasetCommerceStore()
const isPortal = computed(() => route.path.startsWith('/portal'))
const order = computed(() => orders.list.find((item) => item.id === String(route.params.orderId) && item.productType === 'dataset'))
const delivery = computed(() => commerce.deliveries.find((item) => item.id === order.value?.biDeliveryId))
const error = ref('')
const orderStatusLabel = computed(() => order.value ? statusMeta('appOrder', order.value.status).label : '—')
const deliveryStatusLabel = computed(() => delivery.value ? statusMeta('biDelivery', delivery.value.status).label : '支付后创建')
const paymentOptions: Array<{ value: PaymentMethod; label: string; note: string }> = [
  { value: 'personal_online', label: '个人在线支付', note: '仅个人订单可用；模拟跳转个人收银台' },
  { value: 'enterprise_balance', label: '企业余额', note: '使用企业账户余额，模拟即时确认' },
  { value: 'enterprise_contract', label: '合同支付', note: '提交后进入付款确认中，运营确认后开通' },
  { value: 'enterprise_bank_transfer', label: '公对公转账', note: '提交后进入付款确认中，运营确认到账后开通' }
]
const availablePaymentOptions = computed(() => paymentOptions.filter((item) =>
  order.value?.ownerType === 'enterprise' ? item.value !== 'personal_online' : item.value === 'personal_online'
))
const selectedPaymentMethod = ref<PaymentMethod>(order.value?.paymentMethod || 'personal_online')
const selectedPaymentLabel = computed(() => paymentOptions.find((item) => item.value === selectedPaymentMethod.value)?.label || '—')
const payButtonLabel = computed(() => {
  if (selectedPaymentMethod.value === 'enterprise_contract') return '提交合同付款申请'
  if (selectedPaymentMethod.value === 'enterprise_bank_transfer') return '提交转账凭证，等待确认到账'
  return '确认支付并交付至用数模块'
})

function choosePaymentMethod(paymentMethod: PaymentMethod) {
  if (!order.value) return
  error.value = ''
  try {
    commerce.selectPaymentMethod(order.value.id, paymentMethod)
    selectedPaymentMethod.value = paymentMethod
  } catch (e) {
    error.value = e instanceof Error ? e.message : '支付方式不可用'
  }
}

function pay(simulateFailure = false) {
  if (!order.value) return
  error.value = ''
  try {
    commerce.selectPaymentMethod(order.value.id, selectedPaymentMethod.value)
    commerce.pay(order.value.id, simulateFailure)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '支付失败'
  }
}

function retry() {
  if (!delivery.value) return
  commerce.retryDelivery(delivery.value.id)
}

function goMyData() {
  router.push(isPortal.value ? '/portal/mine?tab=data' : '/app/mine?tab=我的数据')
}
</script>

<template>
  <div v-if="order" :class="isPortal ? 'mx-auto max-w-4xl' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!isPortal" title="订单支付" />
    <div :class="isPortal ? '' : 'px-4 pt-3'">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-start justify-between gap-4">
          <div><div class="text-xs text-slate-400">数据集订单 {{ order.id }}</div><h1 class="mt-1 text-lg font-semibold text-slate-900">{{ order.productName }}</h1></div>
          <div class="text-2xl font-semibold text-brand-600">¥{{ order.amount.toLocaleString() }}</div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
          <div><span class="text-slate-400">购买主体：</span>{{ order.ownerType === 'enterprise' ? '企业' : '个人' }}</div>
          <div><span class="text-slate-400">支付方式：</span>{{ selectedPaymentLabel }}（mock）</div>
          <div><span class="text-slate-400">交易状态：</span>{{ orderStatusLabel }}</div>
          <div><span class="text-slate-400">用数交付：</span>{{ deliveryStatusLabel }}</div>
        </div>
        <div v-if="order.status === 'pending_payment'" class="mt-4">
          <div class="text-sm font-semibold text-slate-800">选择付款方式</div>
          <div class="mt-2 grid gap-2" :class="order.ownerType === 'enterprise' ? 'sm:grid-cols-3' : 'grid-cols-1'">
            <button
              v-for="option in availablePaymentOptions"
              :key="option.value"
              :data-testid="`dataset-payment-${option.value}`"
              class="rounded-xl border p-3 text-left"
              :class="selectedPaymentMethod === option.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'"
              @click="choosePaymentMethod(option.value)"
            >
              <div class="text-sm font-medium text-slate-800">{{ option.label }}</div>
              <div class="mt-1 text-xs leading-relaxed text-slate-500">{{ option.note }}</div>
            </button>
          </div>
        </div>
        <div v-if="order.ownerType === 'enterprise'" class="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-700">企业订单只允许企业余额、合同支付或公对公转账，不提供个人支付方式；订单、付款、发票和权益主体保持一致。</div>
        <div v-if="error" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ error }}</div>

        <template v-if="order.status === 'pending_payment'">
          <button data-testid="dataset-pay" class="mt-5 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white" @click="pay(false)">{{ payButtonLabel }}</button>
          <button data-testid="dataset-pay-fail-delivery" class="mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-xs text-slate-500" @click="pay(true)">演示：支付成功，但用数模块首次交付失败</button>
       </template>

        <div v-else-if="order.status === 'payment_pending_confirmation'" data-testid="dataset-payment-pending-confirmation" class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <div class="text-base font-medium text-amber-900">付款确认中</div>
          <p class="mt-1 text-sm text-amber-700">订单已提交，等待运营确认{{ selectedPaymentLabel }}到账。确认完成后权益自动开通，你将在"我的数据"中看到交付结果。</p>
          <div class="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">订单编号 {{ order.id }} · 金额 ¥{{ order.amount.toLocaleString() }}</div>
        </div>

        <div v-else-if="delivery?.status === 'failed'" data-testid="dataset-delivery-failed" class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <div class="text-base font-medium text-amber-900">支付已成功，用数模块交付待重试</div>
          <p class="mt-1 text-sm text-amber-700">{{ delivery.failureReason }}。订单不会退回未支付，权益保持待交付。</p>
          <button data-testid="dataset-retry-delivery" class="mt-4 rounded-lg bg-amber-700 px-5 py-2.5 text-sm text-white" @click="retry">重试用数模块交付</button>
        </div>

        <div v-else-if="delivery?.status === 'delivered'" data-testid="dataset-delivery-success" class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <div class="text-3xl">✓</div><div class="mt-2 text-base font-medium text-emerald-800">支付成功，数据已交付至用数模块</div>
          <p class="mt-1 text-xs text-emerald-700">实例 {{ delivery.datasetInstanceId }} · 数据集权益已激活</p>
          <button class="mt-4 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm text-white" @click="goMyData">查看我的数据</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">数据集订单不存在</div>
</template>
