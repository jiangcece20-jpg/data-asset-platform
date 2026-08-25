<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useMineOrders } from '@/composables/useMineOrders'
import { formatOrderTime, productTypeLabels } from '@/domain/myCenter'

const route = useRoute()
const router = useRouter()
const { findOrder } = useMineOrders()

const isPortal = computed(() => route.path.startsWith('/portal'))
const source = computed(() => String(route.params.source))
const orderId = computed(() => String(route.params.id))
const order = computed(() => findOrder(source.value, orderId.value))

const typeLabel = computed(() => {
  if (!order.value?.productType) return '商品'
  return productTypeLabels[order.value.productType]
})

function goOrders() {
  void router.push({
    path: isPortal.value ? '/portal/mine' : '/app/mine',
    query: { menu: 'orders', orderTab: 'buy' }
  })
}

function goProduct() {
  if (!order.value) return
  const base = isPortal.value ? '/portal' : '/app'
  void router.push(`${base}/product/${order.value.productId}`)
}

function pay() {
  if (!order.value?.paymentPath) return
  const path = isPortal.value
    ? order.value.paymentPath.replace(/^\/app\//, '/portal/')
    : order.value.paymentPath
  void router.push(path)
}

function goData() {
  void router.push({
    path: isPortal.value ? '/portal/mine' : '/app/mine',
    query: { menu: 'data' }
  })
}

function goRenewal() {
  if (!order.value?.renewalInfo) return
  const path = isPortal.value
    ? order.value.renewalInfo.renewalPath
    : order.value.renewalInfo.renewalPath.replace(/^\/portal\//, '/app/')
  void router.push(path)
}

const actionBtn = 'rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600'
const actionPrimary = 'rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white'
const actionBrand = 'rounded-full border border-brand-500 px-3 py-1.5 text-[11px] text-brand-600'
const actionSoft = 'rounded-full bg-brand-50 px-3 py-1.5 text-[11px] text-brand-600'
const actionDark = 'rounded-full bg-slate-800 px-3 py-1.5 text-[11px] text-white'
const actionWarn = 'rounded-full bg-amber-500 px-3 py-1.5 text-[11px] text-white'
</script>

<template>
  <div v-if="isPortal" class="mx-auto max-w-4xl" data-testid="order-detail">
    <button class="mb-2 text-xs text-brand-600" @click="goOrders">← 返回我的订单</button>
    <h1 class="text-xl font-semibold text-slate-900">订单详情</h1>

    <div v-if="!order" class="mt-5 rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400 shadow-card">
      未找到该订单
    </div>

    <article v-else class="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">{{ typeLabel }}</span>
            <span class="font-mono text-slate-400">订单号 {{ order.id }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{{ order.channelLabel }}</span>
          </div>
          <h2 class="mt-2 text-base font-semibold leading-snug text-slate-900">{{ order.productName }}</h2>
        </div>
        <StatusBadge :dict="order.statusDict" :value="order.status" />
      </div>

      <div class="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-xs">
        <div><div class="text-slate-400">购买主体</div><div class="mt-1 truncate text-slate-700">{{ order.ownerLabel }}</div></div>
        <div><div class="text-slate-400">成交渠道</div><div class="mt-1 text-slate-700">{{ order.channelLabel }}</div></div>
        <div><div class="text-slate-400">购买方案</div><div class="mt-1 text-slate-700">{{ order.planSummary }}</div></div>
        <div><div class="text-slate-400">付款方式</div><div class="mt-1 text-slate-700">{{ order.paymentLabel }}</div></div>
        <div><div class="text-slate-400">下单时间</div><div class="mt-1 text-slate-700">{{ formatOrderTime(order.createdAt) }}</div></div>
        <div><div class="text-slate-400">付款时间</div><div class="mt-1 text-slate-700">{{ formatOrderTime(order.paidAt) }}</div></div>
        <div><div class="text-slate-400">到期时间</div><div class="mt-1 text-slate-700">{{ order.expiryText || '—' }}</div></div>
        <div><div class="text-slate-400">订单金额</div><div class="mt-1 font-semibold text-brand-600">{{ order.amountText }}</div></div>
      </div>

      <div class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-700">
        {{ order.progressSummary }}
        <span v-if="order.source === 'space'" class="ml-2 text-slate-400">空间商品号 {{ order.spaceProductNo }} · 同步于 {{ formatOrderTime(order.syncedAt) }}</span>
      </div>
      <div v-if="order.note" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{{ order.note }}</div>
      <div
        v-if="order.renewalInfo"
        class="mt-2 rounded-lg px-3 py-2.5 text-xs"
        :class="order.renewalInfo.status === 'expired' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'"
      >
        <div class="font-medium">
          {{ order.renewalInfo.status === 'expired' ? '⚠️ 权益已过期' : `⏰ 权益将在 ${order.renewalInfo.daysUntilExpiry} 天后到期` }}
        </div>
        <div class="mt-0.5 opacity-80">到期日期 {{ order.renewalInfo.expiryDate }} · 续订后可继续获取最新数据</div>
      </div>

      <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <button :class="actionBtn" @click="goProduct">查看商品</button>
        <button v-if="order.canPay && order.paymentPath" :class="actionPrimary" @click="pay">继续付款</button>
        <button v-if="order.filter === 'completed'" :class="actionSoft" @click="goData">查看我的数据</button>
        <button v-if="order.renewalInfo" :class="actionWarn" @click="goRenewal">
          {{ order.renewalInfo.status === 'expired' ? '重新订阅' : '立即续订' }}
        </button>
        <a v-if="order.downloadUrl" :href="order.downloadUrl" :class="actionBrand">下载数据</a>
        <a v-if="order.detailUrl" :href="order.detailUrl" target="_blank" rel="noopener noreferrer" :class="actionDark">前往可信空间</a>
      </div>
    </article>
  </div>

  <div v-else class="min-h-full bg-slate-50 pb-8" data-testid="order-detail">
    <MobileHeader title="订单详情" />

    <div v-if="!order" class="mx-4 mt-3 rounded-2xl bg-white p-4 text-center text-[13px] text-slate-400">
      未找到该订单
    </div>

    <article v-else class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">{{ typeLabel }}</span>
            <span class="font-mono text-slate-400">{{ order.id }}</span>
          </div>
          <h2 class="mt-2 text-[14px] font-semibold leading-snug text-slate-900">{{ order.productName }}</h2>
        </div>
        <StatusBadge :dict="order.statusDict" :value="order.status" />
      </div>

      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 text-[10px]">
        <div><span class="text-slate-400">购买主体</span><div class="mt-0.5 truncate text-slate-700">{{ order.ownerLabel }}</div></div>
        <div><span class="text-slate-400">成交渠道</span><div class="mt-0.5 text-slate-700">{{ order.channelLabel }}</div></div>
        <div><span class="text-slate-400">购买方案</span><div class="mt-0.5 text-slate-700">{{ order.planSummary }}</div></div>
        <div><span class="text-slate-400">付款方式</span><div class="mt-0.5 text-slate-700">{{ order.paymentLabel }}</div></div>
        <div><span class="text-slate-400">下单时间</span><div class="mt-0.5 text-slate-700">{{ formatOrderTime(order.createdAt) }}</div></div>
        <div><span class="text-slate-400">付款时间</span><div class="mt-0.5 text-slate-700">{{ formatOrderTime(order.paidAt) }}</div></div>
        <div><span class="text-slate-400">到期时间</span><div class="mt-0.5 text-slate-700">{{ order.expiryText || '—' }}</div></div>
        <div class="col-span-2"><span class="text-slate-400">订单金额</span><div class="mt-0.5 font-semibold text-brand-600">{{ order.amountText }}</div></div>
      </div>

      <div class="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] leading-relaxed text-emerald-700">{{ order.progressSummary }}</div>
      <div v-if="order.note" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-500">{{ order.note }}</div>
      <div
        v-if="order.renewalInfo"
        class="mt-2 rounded-lg px-3 py-2 text-[10px]"
        :class="order.renewalInfo.status === 'expired' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'"
      >
        <div class="font-medium">
          {{ order.renewalInfo.status === 'expired' ? '⚠️ 权益已过期' : `⏰ 权益将在 ${order.renewalInfo.daysUntilExpiry} 天后到期` }}
        </div>
        <div class="mt-0.5 opacity-80">到期日期 {{ order.renewalInfo.expiryDate }} · 续订后可继续获取最新数据</div>
      </div>
      <div v-if="order.source === 'space'" class="mt-2 text-[10px] text-slate-400">空间商品号 {{ order.spaceProductNo }} · 同步于 {{ formatOrderTime(order.syncedAt) }}</div>

      <div class="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
        <button :class="actionBtn" @click="goProduct">查看商品</button>
        <button v-if="order.canPay && order.paymentPath" :class="actionPrimary" @click="pay">继续付款</button>
        <button v-if="order.filter === 'completed'" :class="actionSoft" @click="goData">查看我的数据</button>
        <button v-if="order.renewalInfo" :class="actionWarn" @click="goRenewal">
          {{ order.renewalInfo.status === 'expired' ? '重新订阅' : '立即续订' }}
        </button>
        <a v-if="order.downloadUrl" :href="order.downloadUrl" :class="actionBrand">下载数据</a>
        <a v-if="order.detailUrl" :href="order.detailUrl" target="_blank" rel="noopener noreferrer" :class="actionDark">前往可信空间</a>
      </div>
    </article>
  </div>
</template>
