<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'

const props = defineProps<{
  embedded?: boolean
  variant?: 'mobile' | 'portal'
}>()

const router = useRouter()
const seller = useSellerMarketStore()
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
  if (status === 'entitlement_active') return '运营已开通'
  if (status === 'payment_failed') return '付款失败'
  return status
}

function goProduct(productId: string) {
  const base = props.variant === 'portal' ? '/portal' : '/app'
  router.push(`${base}/product/${productId}`)
}
</script>

<template>
  <div :class="embedded ? 'mt-3 space-y-3' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!embedded" title="卖家订单" />
    <div :class="embedded ? 'space-y-3' : 'space-y-3 px-4 pt-3'">
      <div class="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-[12px] leading-relaxed text-orange-900">
        <div class="font-medium">状态说明</div>
        <div class="mt-1">买家打款到平台。支付后订单为「待开通」，由运营开通后买家才能查看。卖家无需确认收款，平台按合同结算。</div>
      </div>

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
        class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate text-[14px] font-semibold text-slate-900">{{ order.productName }}</div>
            <div class="mt-1 text-[11px] text-slate-500">{{ order.id }} · 买家 {{ order.ownerId }}</div>
          </div>
          <span class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{{ statusText(order.status) }}</span>
        </div>
        <div class="mt-2 flex items-center justify-between text-[12px] text-slate-600">
          <span>¥{{ order.amount }} · 平台收款</span>
          <span>{{ order.createdAt.slice(0, 16).replace('T', ' ') }}</span>
        </div>
        <div v-if="order.note" class="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">{{ order.note }}</div>
        <button class="mt-2 text-[11px] text-brand-600" @click="goProduct(order.productId)">查看商品 ›</button>
      </div>
    </div>
  </div>
</template>
