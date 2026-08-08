<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'

const router = useRouter()
const seller = useSellerMarketStore()
const filter = ref<'all' | 'pending' | 'done'>('all')
const message = ref('')

const list = computed(() => {
  const all = seller.mySellerOrders
  if (filter.value === 'pending') return all.filter((o) => o.status === 'payment_pending_confirmation')
  if (filter.value === 'done') return all.filter((o) => o.status === 'entitlement_active')
  return all
})

function statusText(status: string) {
  if (status === 'payment_pending_confirmation') return '待确认到账'
  if (status === 'entitlement_active') return '已确认 · 已发权'
  if (status === 'payment_failed') return '争议/未到账'
  return status
}

function confirm(orderId: string) {
  message.value = ''
  try {
    seller.confirmSellerPayment(orderId)
    message.value = '已确认到账，买家看板权益已开通'
  } catch (e) {
    message.value = e instanceof Error ? e.message : '操作失败'
  }
}

function dispute(orderId: string) {
  const reason = window.prompt('未收到款项的原因', '收款账户未到账')
  if (!reason) return
  message.value = ''
  try {
    seller.disputeSellerPayment(orderId, reason)
    message.value = '已标记未到账，订单进入争议'
  } catch (e) {
    message.value = e instanceof Error ? e.message : '操作失败'
  }
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="卖家订单" />
    <div class="space-y-3 px-4 pt-3">
      <div class="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-[12px] leading-relaxed text-orange-900">
        <div class="font-medium">状态说明（自收款 MVP）</div>
        <div class="mt-1">待确认到账 = 买家声称已付，请核对待收款账户后再确认。确认后系统开通买家看板权益。平台不垫资。</div>
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

      <div v-if="message" class="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{{ message }}</div>

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
          <span>¥{{ order.amount }} · 自收款</span>
          <span>{{ order.createdAt.slice(0, 16).replace('T', ' ') }}</span>
        </div>
        <div v-if="order.note" class="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">{{ order.note }}</div>
        <div v-if="order.status === 'payment_pending_confirmation'" class="mt-3 grid grid-cols-2 gap-2">
          <button class="rounded-xl bg-orange-500 py-2 text-[12px] font-medium text-white" @click="confirm(order.id)">确认到账</button>
          <button class="rounded-xl border border-slate-200 py-2 text-[12px] text-slate-600" @click="dispute(order.id)">未收到</button>
        </div>
        <button class="mt-2 text-[11px] text-brand-600" @click="router.push(`/app/product/${order.productId}`)">查看商品 ›</button>
      </div>
    </div>
  </div>
</template>
