<script setup lang="ts">
import ProductExpiredStamp from '@/components/shared/ProductExpiredStamp.vue'
import ProductDelistedStamp from '@/components/shared/ProductDelistedStamp.vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useMineOrders } from '@/composables/useMineOrders'
import { purchasedDatasetEntry } from '@/domain/datasetEntry'
import { buyDataProductTypeLabel, formatOrderTime, orderListStatusClass, orderListStatusLabel } from '@/domain/myCenter'

const route = useRoute()
const router = useRouter()
const { findOrder } = useMineOrders()
const isPortal = computed(() => route.path.startsWith('/portal'))
const base = computed(() => isPortal.value ? '/portal' : '/app')
const order = computed(() => findOrder(String(route.params.source), String(route.params.id)))
const showPcUseNotice = ref(false)
const time = (value?: string) => value ? formatOrderTime(value) : '未返回'
const transactionFields = computed(() => {
  const item = order.value
  if (!item) return []
  return [
    ['购买主体', item.ownerLabel],
    ['购买方案', item.planSummary], ['付款方式', item.paymentLabel],
    [item.source === 'intent' ? '申请时间' : '下单时间', time(item.createdAt)],
    ...(item.source === 'intent' ? [] : item.isZeroAmount
      ? [['订单完成时间', time(item.completedAt)]]
      : [['付款时间', item.paidAt ? time(item.paidAt) : item.status === 'payment_pending_confirmation' ? '待确认到账' : item.filter === 'pending_payment' ? '未付款' : '未返回']]),
    ['订单金额', item.source === 'intent' ? '无需付款' : item.amountText],
    ...(item.closedAt ? [['关闭时间', time(item.closedAt)]] : [])
  ]
})
function goOrders() {
  void router.push({ path: `${base.value}/mine`, query: { menu: 'orders', orderTab: 'buy' } })
}
function goProduct() {
  if (order.value) void router.push(`${base.value}/product/${order.value.productId}`)
}
function pay() {
  if (order.value?.canPay && order.value.paymentPath) void router.push(order.value.paymentPath.replace(/^\/app\//, `${base.value}/`))
}
function goDashboard() {
  if (!order.value?.canOpenDashboard || !order.value.dashboardPath) return
  void router.push({ path: order.value.dashboardPath.replace(/^\/app\//, `${base.value}/`), query: { orderId: order.value.id } })
}
function goDataset() {
  if (!order.value?.canUseDataset) return
  if (!isPortal.value) {
    showPcUseNotice.value = true
    return
  }
  void router.push(purchasedDatasetEntry(order.value.productId, 'portal', order.value.id))
}
</script>

<template>
  <main :class="isPortal ? 'mx-auto max-w-4xl' : 'min-h-full bg-slate-50 pb-8'" data-testid="order-detail">
    <template v-if="isPortal">
      <button class="mb-2 text-xs text-brand-600" @click="goOrders">← 返回我的订单</button>
      <h1 class="text-xl font-semibold text-slate-900">订单详情</h1>
    </template>
    <MobileHeader v-else title="订单详情" />
    <div v-if="!order" class="mt-4 bg-white p-8 text-center text-sm text-slate-500">未找到该订单</div>
    <article v-else :class="isPortal ? 'mt-5 p-6' : 'mx-3 mt-3 p-4'" class="rounded-lg border border-slate-100 bg-white">
      <header class="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div class="min-w-0 flex-1">
          <span class="text-xs text-brand-600">{{ buyDataProductTypeLabel(order.productType) }}</span>
          <h2 class="mt-2 break-words text-base font-semibold text-slate-900">{{ order.productName }}</h2>
          <ProductDelistedStamp v-if="order.productDelisted" class="mt-2" />
          <ProductExpiredStamp v-if="order.serviceStatus?.includes('已到期')" :dataset="order.productType === 'dataset' && order.source === 'app'" class="ml-2 mt-2" />
          <p class="mt-2 break-all text-xs text-slate-500">订单号 {{ order.id }}</p>
        </div>
        <span class="shrink-0 rounded px-2 py-1 text-xs" :class="orderListStatusClass(order)">{{ orderListStatusLabel(order) }}</span>
      </header>
      <section class="py-5">
        <h3 class="text-sm font-semibold text-slate-900">交易信息</h3>
        <dl class="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 text-xs" :class="isPortal ? 'sm:grid-cols-3' : ''">
          <div v-for="[label, value] in transactionFields" :key="label" class="min-w-0">
            <dt class="text-slate-500">{{ label }}</dt><dd class="mt-1 break-words leading-relaxed text-slate-800">{{ value }}</dd>
          </div>
        </dl>
      </section>
      <p v-if="order.serviceStatus" data-testid="order-rights" class="mb-4 text-xs text-slate-600">本单权益：{{ order.serviceStatus }}</p>
      <div v-if="!isPortal && order.productType === 'dataset'" class="mb-4 space-y-2 text-xs leading-relaxed">
        <p data-testid="dataset-pc-use-explanation" class="rounded-lg bg-brand-50 p-3 text-brand-700">App端不提供「用数」模块，请登录PC端查看和使用数据集。</p>
        <p v-if="order.canUseDataset && order.serviceStatus === '服务已到期'" class="text-slate-500">更新服务已到期，历史已交付数据仍可在PC端按原授权使用，不再更新。</p>
        <div v-if="showPcUseNotice" role="status" class="rounded-lg border border-brand-200 p-3 text-brand-700">
          <p v-if="order.source === 'space'">请登录PC端，前往原订单查看和使用已交付数据。</p>
          <p v-else-if="order.serviceStatus === '服务已到期'">请登录PC端，前往「用数」模块查看已交付数据。</p>
          <p v-else>请登录PC端，前往「用数」模块查看和使用。</p>
          <button type="button" aria-label="关闭PC端使用提示" class="mt-2 font-medium underline" @click="showPcUseNotice = false">知道了</button>
        </div>
      </div>
      <footer class="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
        <button class="rounded border border-slate-200 px-3 py-2 text-slate-600" @click="goProduct">查看商品</button>
        <button v-if="order.canOpenDashboard" class="rounded bg-brand-500 px-3 py-2 text-white" @click="goDashboard">前往看数</button>
        <button v-if="order.canPay && order.paymentPath" class="rounded bg-brand-500 px-3 py-2 text-white" @click="pay">继续支付</button>
        <a v-if="isPortal && order.canUseDataset && order.source === 'space'" :href="order.downloadUrl" target="_blank" rel="noopener" class="rounded bg-brand-500 px-3 py-2 text-white">查看已交付数据</a>
        <button v-else-if="order.canUseDataset" class="rounded bg-brand-500 px-3 py-2 text-white" @click="goDataset">{{ isPortal ? '查看已交付数据' : 'PC端使用' }}</button>
      </footer>
    </article>
  </main>
</template>
