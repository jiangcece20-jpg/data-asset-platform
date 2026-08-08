<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useCatalogStore } from '@/stores/catalog'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import {
  appOrderCard,
  formatOrderTime,
  orderFilterLabel,
  productTypeLabels,
  spaceOrderCard,
  type MyOrderCard,
  type MyOrderFilter
} from '@/domain/myCenter'
import type { Entitlement } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const entitlements = useEntitlementStore()
const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const catalog = useCatalogStore()
const datasetCommerce = useDatasetCommerceStore()

type MineTab = 'orders' | 'data'
type SubjectFilter = 'all' | 'personal' | 'enterprise'
type ChannelFilter = 'all' | 'app' | 'space'
type ProductTypeFilter = 'all' | 'dataset' | 'api' | 'report' | 'dashboard'
const tabs: Array<{ value: MineTab; label: string }> = [
  { value: 'orders', label: '我的订单' },
  { value: 'data', label: '我的数据' }
]
const initialTab = ['data', '我的数据'].includes(String(route.query.tab || '')) ? 'data' : 'orders'
const tab = ref<MineTab>(initialTab)
const orderFilters: MyOrderFilter[] = ['all', 'pending_payment', 'processing', 'completed', 'closed']
const orderFilter = ref<MyOrderFilter>('all')
const subjectFilter = ref<SubjectFilter>(route.query.subject === 'enterprise' ? 'enterprise' : route.query.subject === 'personal' ? 'personal' : 'all')
const channelFilter = ref<ChannelFilter>('all')
const productTypeFilter = ref<ProductTypeFilter>('all')

const enterpriseMember = computed(() => user.currentEnterpriseMember)
const enterpriseOrderUser = computed(() => {
  if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId || !enterpriseMember.value) return undefined
  return {
    currentEnterpriseId: user.context.currentEnterpriseId,
    currentMemberId: user.context.currentMemberId,
    enterpriseAuthStatus: user.context.enterpriseAuthStatus,
    role: enterpriseMember.value.role
  }
})

const allOrders = computed<MyOrderCard[]>(() => {
  const enterpriseContext = enterpriseOrderUser.value
  const appCards = orders.appOrders
    .filter((order) => {
      if (order.ownerType === 'personal') return order.ownerId === user.context.currentMemberId
      if (!enterpriseContext || order.ownerId !== enterpriseContext.currentEnterpriseId) return false
      return enterpriseContext.role === 'admin' || order.operatorMemberId === enterpriseContext.currentMemberId
    })
    .map((order) => {
      const card = appOrderCard(order, user.enterprise.name)
      card.productType ||= catalog.byId(order.productId)?.type
      return card
    })

  const spaceCards = enterpriseContext
    ? spaceOrders.visibleFor(enterpriseContext).map((order) => spaceOrderCard(order, catalog.byId(order.appProductId)?.type, user.enterprise.name))
    : []

  return [...appCards, ...spaceCards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const filteredOrders = computed(() => allOrders.value.filter((order) => (
  (orderFilter.value === 'all' || order.filter === orderFilter.value)
  && (subjectFilter.value === 'all' || order.ownerType === subjectFilter.value)
  && (channelFilter.value === 'all' || order.source === channelFilter.value)
  && (productTypeFilter.value === 'all' || order.productType === productTypeFilter.value)
)))

const datasetEntitlements = computed(() => entitlements.visibleDatasetEntitlements)
const deliveryFor = (entitlementId: string) => datasetCommerce.deliveries.find((item) => item.entitlementId === entitlementId)
const effectiveExpiry = (entitlement: Entitlement) => entitlement.updateValidTo || entitlement.validTo
const isRenewable = (entitlement: Entitlement) => entitlement.licenseKind === 'subscription' || entitlement.serviceMode === 'continuous'
const isExpiring = (entitlement: Entitlement) => {
  const value = effectiveExpiry(entitlement)
  if (!value) return false
  const days = Math.ceil((new Date(`${value}T23:59:59`).getTime() - Date.now()) / 86_400_000)
  return days >= 0 && days <= 90
}

function selectTab(next: MineTab) {
  tab.value = next
  void router.replace({ query: { ...route.query, tab: next } })
}

function setSubjectFilter(next: SubjectFilter) {
  subjectFilter.value = next
  void router.replace({ query: { ...route.query, subject: next === 'all' ? undefined : next } })
}

function goProduct(order: MyOrderCard) {
  router.push(`/app/product/${order.productId}`)
}

function pay(order: MyOrderCard) {
  if (order.paymentPath) router.push(order.paymentPath)
}

function goData() {
  selectTab('data')
}

function renew(entitlement: Entitlement) {
  if (!entitlement.productId) return
  router.push({
    path: `/app/checkout/dataset/${entitlement.productId}`,
    query: {
      subject: entitlement.source,
      offer: entitlement.datasetOfferId,
      renew: entitlement.id
    }
  })
}

function openBills() {
  if (user.isEnterpriseAuthenticated) {
    router.push('/app/mine/enterprise/bills')
    return
  }
  router.push({ path: '/app/enterprise-auth', query: { redirect: '/app/mine/enterprise/bills' } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="我的" :show-back="false" />

    <div class="px-4 pt-3">
      <div class="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-900 to-brand-800 p-4 text-white shadow-card">
        <div class="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-lg">👤</div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[14px] font-semibold">{{ user.context.name }}</div>
          <div class="mt-0.5 truncate text-[11px] text-white/65">
            {{ user.isEnterpriseAuthenticated ? user.enterprise.name : '个人身份 · 企业认证后可查看企业订单' }}
          </div>
        </div>
        <button class="rounded-full bg-white/15 px-3 py-1.5 text-[11px]" @click="router.push('/app/mine/enterprise')">企业中心 ›</button>
      </div>
      <button
        data-testid="seller-center-entry"
        class="mt-2 flex w-full items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-left"
        @click="router.push('/app/seller')"
      >
        <div>
          <div class="text-[13px] font-medium text-orange-800">卖家中心 · 入驻商家</div>
          <div class="mt-0.5 text-[11px] text-orange-700/80">上架用数看板 · 自收款确认 · 卖家订单</div>
        </div>
        <span class="text-orange-600">›</span>
      </button>
    </div>

    <div class="mx-4 mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-[13px]">
      <button
        v-for="item in tabs"
        :key="item.value"
        class="rounded-lg py-2.5 transition"
        :class="tab === item.value ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="selectTab(item.value)"
      >{{ item.label }}</button>
    </div>

    <section v-if="tab === 'orders'" class="mt-3 space-y-3 px-4" data-testid="my-orders">
      <div v-if="subjectFilter === 'enterprise'" class="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-[11px] text-violet-700" data-testid="enterprise-order-filter-context">
        <span>当前仅显示 {{ user.enterprise.name }} 的可见订单</span>
        <button class="font-medium" @click="setSubjectFilter('all')">查看全部</button>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-0.5">
        <button
          v-for="filter in orderFilters"
          :key="filter"
          class="shrink-0 rounded-full border px-3 py-1.5 text-[11px]"
          :class="orderFilter === filter ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-500'"
          @click="orderFilter = filter"
        >{{ orderFilterLabel(filter) }}</button>
      </div>

      <div class="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-white p-2.5 text-[11px]">
        <div class="col-span-2 flex gap-1 rounded-lg bg-slate-50 p-1">
          <button class="flex-1 rounded-md py-1.5" :class="subjectFilter === 'all' ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'" @click="setSubjectFilter('all')">全部主体</button>
          <button class="flex-1 rounded-md py-1.5" :class="subjectFilter === 'personal' ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'" @click="setSubjectFilter('personal')">个人</button>
          <button class="flex-1 rounded-md py-1.5" :class="subjectFilter === 'enterprise' ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'" :disabled="!user.isEnterpriseAuthenticated" @click="setSubjectFilter('enterprise')">企业</button>
        </div>
        <select v-model="productTypeFilter" aria-label="商品类型筛选" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600">
          <option value="all">全部商品类型</option><option value="dataset">数据集</option><option value="api">API</option><option value="report">报告</option><option value="dashboard">看板</option>
        </select>
        <select v-model="channelFilter" aria-label="成交渠道筛选" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600">
          <option value="all">全部成交渠道</option><option value="app">APP 内购买</option><option value="space">可信空间购买</option>
        </select>
      </div>

      <button data-testid="api-bills-order-entry" class="flex w-full items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 p-3.5 text-left" @click="openBills">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base">📈</div>
          <div>
            <div class="text-[12px] font-medium text-slate-800">API 调用与费用账单</div>
            <div class="mt-0.5 text-[10px] text-slate-500">从订单追溯到具体 API、凭证、调用量和费用</div>
          </div>
        </div>
        <span class="text-brand-500">›</span>
      </button>

      <article v-for="order in filteredOrders" :key="`${order.source}-${order.id}`" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">{{ order.productType ? productTypeLabels[order.productType] : '商品' }}</span>
              <span class="font-mono text-slate-400">{{ order.id }}</span>
            </div>
            <h3 class="mt-2 text-[14px] font-semibold leading-snug text-slate-900">{{ order.productName }}</h3>
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
          <div class="col-span-2"><span class="text-slate-400">订单金额</span><div class="mt-0.5 font-semibold text-brand-600">{{ order.amountText }}</div></div>
        </div>
        <div class="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] leading-relaxed text-emerald-700">{{ order.progressSummary }}</div>
        <div v-if="order.source === 'space'" class="mt-2 text-[10px] text-slate-400">空间商品号 {{ order.spaceProductNo }} · 同步于 {{ formatOrderTime(order.syncedAt) }}</div>

        <div class="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <button class="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600" @click="goProduct(order)">查看商品</button>
          <button v-if="order.canPay && order.paymentPath" class="rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white" @click="pay(order)">继续付款</button>
          <button v-if="order.productType === 'dataset' && order.filter === 'completed'" class="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] text-brand-600" @click="goData">查看我的数据</button>
          <button v-if="order.productType === 'api'" class="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] text-brand-600" @click="openBills">查看 API 账单</button>
          <a v-if="order.detailUrl" :href="order.detailUrl" target="_blank" rel="noopener noreferrer" class="rounded-full bg-slate-800 px-3 py-1.5 text-[11px] text-white">前往可信空间</a>
        </div>
      </article>
      <EmptyState v-if="!filteredOrders.length" icon="🧾" title="暂无符合条件的订单" desc="订单会统一展示个人、企业、APP 与可信空间来源" />
    </section>

    <section v-else class="mt-3 space-y-3 px-4" data-testid="my-datasets">
      <div class="rounded-xl bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700">这里管理已购数据集的交付与有效期；报告、看板和 API 的使用入口从“我的订单”进入。</div>
      <article v-for="entitlement in datasetEntitlements" :key="entitlement.id" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
              <span class="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">{{ entitlement.source === 'enterprise' ? '企业数据' : '个人数据' }}</span>
              <span>订单 {{ entitlement.orderId || '—' }}</span>
            </div>
            <h3 class="mt-2 text-[14px] font-semibold text-slate-900">{{ catalog.byId(entitlement.productId || '')?.name || '未知数据集' }}</h3>
          </div>
          <StatusBadge dict="entitlementStatus" :value="entitlement.status" />
        </div>

        <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 text-[10px]">
          <div><span class="text-slate-400">服务方式</span><div class="mt-0.5 text-slate-700">{{ isRenewable(entitlement) ? '持续更新' : '一次性快照' }}</div></div>
          <div><span class="text-slate-400">资产版本</span><div class="mt-0.5 text-slate-700">{{ entitlement.assetVersion || '—' }}</div></div>
          <div><span class="text-slate-400">用数交付</span><div class="mt-0.5 text-slate-700">{{ deliveryFor(entitlement.id)?.status === 'delivered' ? '已交付' : '处理中' }}</div></div>
          <div><span class="text-slate-400">最近更新</span><div class="mt-0.5 text-slate-700">{{ deliveryFor(entitlement.id)?.lastSuccessfulRefreshAt?.slice(0, 10) || '—' }}</div></div>
          <div class="col-span-2"><span class="text-slate-400">{{ isRenewable(entitlement) ? '更新服务到期日' : '数据保留期限' }}</span><div class="mt-0.5 font-medium" :class="isExpiring(entitlement) ? 'text-amber-600' : 'text-slate-700'">{{ effectiveExpiry(entitlement) || '当前快照长期保留' }}<span v-if="isExpiring(entitlement)"> · 即将到期</span></div></div>
        </div>
        <div v-if="isRenewable(entitlement)" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-700">到期后停止接收新版本，最近已交付版本仍可使用；续订后延长更新服务。</div>

        <div class="mt-3 flex gap-2">
         <a v-if="deliveryFor(entitlement.id)?.biEntryUrl" :href="deliveryFor(entitlement.id)?.biEntryUrl" class="flex-1 rounded-full bg-brand-500 py-2.5 text-center text-[11px] font-medium text-white">进入用数模块</a>
         <a v-if="deliveryFor(entitlement.id)?.downloadUrl" :href="deliveryFor(entitlement.id)?.downloadUrl" class="flex-1 rounded-full border border-brand-500 py-2.5 text-center text-[11px] font-medium text-brand-600">下载数据</a>
         <button v-if="isRenewable(entitlement)" data-testid="renew-dataset" class="rounded-full border border-brand-500 px-4 py-2.5 text-[11px] font-medium text-brand-600" @click="renew(entitlement)">续订</button>
        </div>
      </article>
      <EmptyState v-if="!datasetEntitlements.length" icon="🗂️" title="暂无可用数据" desc="已购买并完成交付的数据集会显示在这里" />
    </section>
  </div>
</template>
