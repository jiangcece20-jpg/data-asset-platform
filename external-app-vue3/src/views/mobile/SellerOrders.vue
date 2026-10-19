<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'
import { addMonthsDate } from '@/domain/orderExpiry'
import type { Order } from '@/types/domain'

const props = defineProps<{
  embedded?: boolean
  variant?: 'mobile' | 'portal'
}>()

const router = useRouter()
const seller = useSellerMarketStore()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const commerce = useDatasetCommerceStore()
const user = useUserStore()
const selectedOrderId = ref('')
const selectedOrder = computed(() => seller.mySellerOrders.find(order => order.id === selectedOrderId.value))
const filter = ref<'all' | 'pending' | 'done'>('all')

const list = computed(() => {
  const all = seller.mySellerOrders
  if (filter.value === 'pending') return all.filter((o) => o.status === 'pending_payment' || o.status === 'pending_activation' || o.status === 'payment_pending_confirmation')
  if (filter.value === 'done') return all.filter((o) => o.status === 'entitlement_active')
  return all
})

function statusText(status: string) {
  if (status === 'pending_payment' || status === 'payment_pending_confirmation') return '待平台确认到账'
  if (status === 'pending_activation') return '待开通'
  if (status === 'entitlement_active') return '已交付'
  if (status === 'refunded') return '已退款'
  if (status === 'payment_failed') return '付款失败'
  if (status === 'cancelled' || status === 'payment_cancelled') return '已取消'
  if (status === 'paid') return '已支付'
  if (status === 'pending_approval') return '待审核'
  if (status === 'approval_rejected') return '审核未通过'
  return status
}

function serviceDates(order: Order) {
  const entitlement = entitlements.list.find((item) => item.orderId === order.id)
  const start = entitlement?.validFrom
  const end = entitlement?.updateValidTo || (start && order.selectedTermMonths ? addMonthsDate(start, order.selectedTermMonths) : undefined)
  return start ? `${start.slice(0, 10)} 至 ${end?.slice(0, 10) || '—'}` : '待生效'
}

function buyerName(order: Order) {
  return user.enterprise.id === order.ownerId ? user.enterprise.name : order.ownerId
}

function latestDelivery(order: Order) {
  return commerce.deliveries.filter(item => item.orderId === order.id && item.status === 'delivered')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.dataVersionUpdatedAt || '未返回'
}

function serviceRisk(order: Order) {
  const status = catalog.byId(order.productId)?.serviceStatus
  return status && status !== 'normal' ? '服务处理中' : '无'
}

function goProduct(productId: string) {
  const base = props.variant === 'portal' ? '/portal' : '/app'
  router.push(`${base}/product/${productId}`)
}
</script>

<template>
  <div :class="embedded ? 'mt-3 space-y-3' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!embedded" title="卖家中心订单" />
    <div :class="embedded ? 'space-y-3' : 'space-y-3 px-4 pt-3'">
      <div class="rounded-lg border border-orange-100 bg-orange-50 p-3 text-[12px] text-orange-900">平台收款并结算；新上架数据集付款后自动交付，历史订单按原流程处理。</div>

      <div class="flex gap-2">
        <button
          v-for="item in [
            { id: 'all', label: '全部' },
            { id: 'pending', label: '待确认' },
            { id: 'done', label: '已完成' }
          ]"
          :key="item.id"
          class="rounded-full px-3 py-1.5 text-[11px]"
          :class="filter === item.id ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-500'"
          @click="filter = item.id as typeof filter"
        >{{ item.label }}</button>
      </div>

      <div v-if="!list.length" class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-[13px] text-slate-400">
        暂无卖家订单
      </div>

      <div
        v-for="order in list"
        :key="order.id"
        :data-testid="`seller-order-${order.id}`"
        class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate text-[14px] font-semibold text-slate-900">{{ catalog.byId(order.productId)?.name || order.productName }}</div>
            <div class="mt-1 text-[11px] text-slate-500">{{ order.id }} · 买家企业 {{ buyerName(order) }}</div>
          </div>
          <span class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{{ statusText(order.status) }}</span>
        </div>
        <div class="mt-2 text-[12px] font-semibold text-slate-800">实付 ¥{{ order.amount }} · 平台收款</div>
        <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
          <div><dt class="text-slate-400">订单时间</dt><dd>{{ order.createdAt.slice(0, 16).replace('T', ' ') }}</dd></div>
          <div><dt class="text-slate-400">付款时间</dt><dd>{{ order.paidAt?.slice(0, 16).replace('T', ' ') || '—' }}</dd></div>
          <div><dt class="text-slate-400">更新频率</dt><dd>{{ order.updateFrequencyAtPurchase || '未返回' }}</dd></div>
          <div><dt class="text-slate-400">服务周期</dt><dd>{{ order.selectedTermMonths ? `${order.selectedTermMonths}个月` : '未返回' }}</dd></div>
          <div class="col-span-2"><dt class="text-slate-400">服务起止</dt><dd>{{ serviceDates(order) }}</dd></div>
          <div><dt class="text-slate-400">数据版本时间</dt><dd>{{ order.dataVersionUpdatedAt || '—' }}</dd></div>
          <div><dt class="text-slate-400">退款状态</dt><dd>{{ order.status === 'refunded' ? '已退款' : '无' }}</dd></div>
          <div><dt class="text-slate-400">服务风险</dt><dd>{{ serviceRisk(order) }}</dd></div>
        </dl>
        <button data-testid="seller-order-detail-open" class="mr-4 mt-2 text-[11px] text-brand-600" @click="selectedOrderId = order.id">查看订单</button>
        <button class="mt-2 text-[11px] text-brand-600" @click="goProduct(order.productId)">查看商品 ›</button>
      </div>
    </div>
    <div v-if="selectedOrder" data-testid="seller-order-detail" role="dialog" aria-modal="true" aria-labelledby="seller-order-title" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="selectedOrderId = ''" @keydown.esc="selectedOrderId = ''">
      <section class="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5">
        <header class="flex items-start justify-between gap-4 border-b pb-4">
          <div><h2 id="seller-order-title" class="text-lg font-semibold">卖家中心订单详情</h2><p class="mt-1 text-xs text-slate-500 break-all">{{ selectedOrder.id }}</p></div>
          <button class="text-sm text-brand-600" @click="selectedOrderId = ''">关闭</button>
        </header>
        <h3 class="mt-4 font-semibold">{{ catalog.byId(selectedOrder.productId)?.name || selectedOrder.productName }}</h3>
        <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div class="col-span-2"><dt class="text-slate-500">购买企业</dt><dd>{{ buyerName(selectedOrder) }}</dd></div>
          <div><dt class="text-slate-500">订单状态</dt><dd>{{ statusText(selectedOrder.status) }}</dd></div>
          <div><dt class="text-slate-500">实付金额</dt><dd>¥{{ selectedOrder.amount }}</dd></div>
          <div><dt class="text-slate-500">订单时间</dt><dd>{{ selectedOrder.createdAt }}</dd></div>
          <div><dt class="text-slate-500">付款时间</dt><dd>{{ selectedOrder.paidAt || '未付款' }}</dd></div>
          <div><dt class="text-slate-500">约定更新频率</dt><dd>{{ selectedOrder.updateFrequencyAtPurchase || '未返回' }}</dd></div>
          <div><dt class="text-slate-500">服务周期</dt><dd>{{ selectedOrder.selectedTermMonths ? `${selectedOrder.selectedTermMonths}个月` : '未返回' }}</dd></div>
          <div class="col-span-2"><dt class="text-slate-500">服务起止</dt><dd>{{ serviceDates(selectedOrder) }}</dd></div>
          <div class="col-span-2"><dt class="text-slate-500">最近成功交付版本时间</dt><dd>{{ latestDelivery(selectedOrder) }}</dd></div>
          <div><dt class="text-slate-500">退款状态</dt><dd>{{ selectedOrder.status === 'refunded' ? '已退款' : '无' }}</dd></div>
          <div><dt class="text-slate-500">服务风险</dt><dd>{{ serviceRisk(selectedOrder) }}</dd></div>
        </dl>
      </section>
    </div>
  </div>
</template>
