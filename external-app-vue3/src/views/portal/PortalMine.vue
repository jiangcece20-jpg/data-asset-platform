<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import StatusBadge from '@/components/StatusBadge.vue'
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
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const datasetCommerce = useDatasetCommerceStore()

type MineTab = 'orders' | 'data'
type SubjectFilter = 'all' | 'personal' | 'enterprise'
type ChannelFilter = 'all' | 'app' | 'space'
type ProductTypeFilter = 'all' | 'dataset' | 'api' | 'report' | 'dashboard'
type TimeFilter = 'all' | '30d' | '365d'
const activeTab = ref<MineTab>(['data', '我的数据'].includes(String(route.query.tab || '')) ? 'data' : 'orders')
const orderFilters: MyOrderFilter[] = ['all', 'pending_payment', 'processing', 'completed', 'closed']
const orderFilter = ref<MyOrderFilter>('all')
const subjectFilter = ref<SubjectFilter>(route.query.subject === 'enterprise' ? 'enterprise' : route.query.subject === 'personal' ? 'personal' : 'all')
const channelFilter = ref<ChannelFilter>('all')
const productTypeFilter = ref<ProductTypeFilter>('all')
const operatorFilter = ref('all')
const timeFilter = ref<TimeFilter>('all')
const exportNotice = ref('')

const enterpriseMember = computed(() => user.currentEnterpriseMember)
const isAdmin = computed(() => enterpriseMember.value?.role === 'admin')
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
     if (order.productType === 'dataset' && order.entitlementId) {
       const delivery = datasetCommerce.deliveries.find((item) => item.entitlementId === order.entitlementId)
       if (delivery?.downloadUrl) card.downloadUrl = delivery.downloadUrl
     }
     return card
   })
  const spaceCards = enterpriseContext
    ? spaceOrders.visibleFor(enterpriseContext).map((order) => spaceOrderCard(order, catalog.byId(order.appProductId)?.type, user.enterprise.name))
    : []
  return [...appCards, ...spaceCards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})
const filteredOrders = computed(() => {
  const now = new Date('2026-08-03T23:59:59').getTime()
  const cutoff = timeFilter.value === '30d' ? now - 30 * 86_400_000 : timeFilter.value === '365d' ? now - 365 * 86_400_000 : undefined
  return allOrders.value.filter((order) => (
    (orderFilter.value === 'all' || order.filter === orderFilter.value)
    && (subjectFilter.value === 'all' || order.ownerType === subjectFilter.value)
    && (channelFilter.value === 'all' || order.source === channelFilter.value)
    && (productTypeFilter.value === 'all' || order.productType === productTypeFilter.value)
    && (operatorFilter.value === 'all' || order.operatorMemberId === operatorFilter.value)
    && (!cutoff || new Date(order.createdAt).getTime() >= cutoff)
  ))
})

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
  activeTab.value = next
  void router.replace({ query: { ...route.query, tab: next } })
}

function setSubjectFilter(next: SubjectFilter) {
  subjectFilter.value = next
  void router.replace({ query: { ...route.query, subject: next === 'all' ? undefined : next } })
}

function exportEnterpriseOrders() {
  exportNotice.value = `已创建 ${user.enterprise.name} 企业订单导出任务，可在导出记录中查看进度。`
}

function goProduct(productId: string) {
  router.push(`/portal/product/${productId}`)
}

function pay(order: MyOrderCard) {
  if (order.productType === 'dataset') router.push(`/portal/payment/dataset/${order.id}`)
}

function renew(entitlement: Entitlement) {
  if (!entitlement.productId) return
  router.push({
    path: `/portal/checkout/dataset/${entitlement.productId}`,
    query: { subject: entitlement.source, offer: entitlement.datasetOfferId, renew: entitlement.id }
  })
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-5 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">我的</h1>
        <p class="mt-1 text-sm text-slate-500">统一管理个人与企业的购买订单，以及已交付数据集。</p>
      </div>
     <div class="text-right text-xs text-slate-400">
       <div class="font-medium text-slate-700">{{ user.context.name }}</div>
       <div class="mt-1">{{ user.isEnterpriseAuthenticated ? user.enterprise.name : '当前为个人身份' }}</div>
        <button v-if="user.isEnterpriseAuthenticated" class="mt-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600" @click="router.push('/portal/enterprise')">企业中心 ›</button>
     </div>
    </div>

    <div class="mb-5 flex w-fit gap-1 rounded-xl bg-slate-100 p-1 text-sm">
      <button data-testid="portal-my-orders-tab" class="rounded-lg px-8 py-2.5" :class="activeTab === 'orders' ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'" @click="selectTab('orders')">我的订单</button>
      <button data-testid="portal-my-data-tab" class="rounded-lg px-8 py-2.5" :class="activeTab === 'data' ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'" @click="selectTab('data')">我的数据</button>
    </div>

    <section v-if="activeTab === 'orders'" data-testid="portal-my-orders">
      <div v-if="subjectFilter === 'enterprise'" class="mb-4 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700" data-testid="portal-enterprise-order-filter-context">
        <span>当前仅显示 {{ user.enterprise.name }} 的可见订单</span>
        <button class="font-medium" @click="setSubjectFilter('all')">查看全部主体</button>
      </div>
      <div class="mb-4 flex items-center justify-between gap-4">
        <div class="flex gap-2">
          <button v-for="filter in orderFilters" :key="filter" class="rounded-lg border px-4 py-2 text-xs" :class="orderFilter === filter ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-500'" @click="orderFilter = filter">{{ orderFilterLabel(filter) }}</button>
        </div>
        <div class="flex gap-2">
          <button v-if="isAdmin" data-testid="export-enterprise-orders" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600" @click="exportEnterpriseOrders">导出企业订单</button>
          <button class="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-left" @click="router.push('/portal/bills')">
            <span>📈</span>
            <span><span class="block text-xs font-medium text-slate-800">API 调用与费用账单</span><span class="mt-0.5 block text-[11px] text-slate-500">按订单、API 与凭证追溯费用</span></span>
            <span class="text-brand-500">›</span>
          </button>
        </div>
      </div>

      <div class="mb-4 grid grid-cols-5 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
        <select :value="subjectFilter" aria-label="购买主体筛选" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600" @change="setSubjectFilter(($event.target as HTMLSelectElement).value as SubjectFilter)">
          <option value="all">全部购买主体</option><option value="personal">个人</option><option value="enterprise" :disabled="!user.isEnterpriseAuthenticated">当前企业</option>
        </select>
        <select v-model="productTypeFilter" aria-label="商品类型筛选" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600"><option value="all">全部商品类型</option><option value="dataset">数据集</option><option value="api">API</option><option value="report">报告</option><option value="dashboard">看板</option></select>
        <select v-model="channelFilter" aria-label="成交渠道筛选" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600"><option value="all">全部成交渠道</option><option value="app">APP 内购买</option><option value="space">可信空间购买</option></select>
        <select v-model="operatorFilter" aria-label="经办人筛选" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 disabled:bg-slate-50 disabled:text-slate-400" :disabled="!user.isEnterpriseAuthenticated || !isAdmin">
          <option value="all">{{ isAdmin ? '全部经办人' : '本人经办' }}</option>
          <option v-for="member in (user.isEnterpriseAuthenticated && isAdmin ? user.enterprise.members.filter(item => item.status === 'active') : [])" :key="member.id" :value="member.id">{{ member.name }}</option>
        </select>
        <select v-model="timeFilter" aria-label="下单时间筛选" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600"><option value="all">全部下单时间</option><option value="30d">近 30 天</option><option value="365d">近 1 年</option></select>
      </div>
      <div v-if="exportNotice" class="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700"><span>{{ exportNotice }}</span><button @click="exportNotice = ''">关闭</button></div>

      <div class="space-y-3">
        <article v-for="order in filteredOrders" :key="`${order.source}-${order.id}`" class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 text-xs">
                <span class="rounded bg-indigo-50 px-2 py-1 text-indigo-600">{{ order.productType ? productTypeLabels[order.productType] : '商品' }}</span>
                <span class="font-mono text-slate-400">订单号 {{ order.id }}</span>
                <span class="rounded bg-slate-100 px-2 py-1 text-slate-500">{{ order.channelLabel }}</span>
              </div>
              <h2 class="mt-2 text-base font-semibold text-slate-900">{{ order.productName }}</h2>
            </div>
            <StatusBadge :dict="order.statusDict" :value="order.status" />
          </div>

          <div class="mt-4 grid grid-cols-6 gap-4 rounded-lg bg-slate-50 p-4 text-xs">
            <div><div class="text-slate-400">购买主体</div><div class="mt-1 truncate text-slate-700">{{ order.ownerLabel }}</div></div>
            <div><div class="text-slate-400">购买方案</div><div class="mt-1 text-slate-700">{{ order.planSummary }}</div></div>
            <div><div class="text-slate-400">付款方式</div><div class="mt-1 text-slate-700">{{ order.paymentLabel }}</div></div>
            <div><div class="text-slate-400">下单时间</div><div class="mt-1 text-slate-700">{{ formatOrderTime(order.createdAt) }}</div></div>
            <div><div class="text-slate-400">付款时间</div><div class="mt-1 text-slate-700">{{ formatOrderTime(order.paidAt) }}</div></div>
            <div><div class="text-slate-400">订单金额</div><div class="mt-1 font-semibold text-brand-600">{{ order.amountText }}</div></div>
          </div>
          <div class="mt-3 flex items-center justify-between gap-4">
            <div class="text-xs text-emerald-700">{{ order.progressSummary }}<span v-if="order.source === 'space'" class="ml-2 text-slate-400">空间商品号 {{ order.spaceProductNo }} · 同步于 {{ formatOrderTime(order.syncedAt) }}</span></div>
            <div class="flex shrink-0 gap-2">
              <button class="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600" @click="goProduct(order.productId)">查看商品</button>
              <button v-if="order.canPay && order.productType === 'dataset'" class="rounded-lg bg-brand-500 px-3 py-2 text-xs text-white" @click="pay(order)">继续付款</button>
             <button v-if="order.productType === 'dataset' && order.filter === 'completed'" class="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600" @click="selectTab('data')">查看我的数据</button>
             <a v-if="order.downloadUrl" :href="order.downloadUrl" class="rounded-lg border border-brand-500 px-3 py-2 text-xs text-brand-600">下载数据</a>
             <button v-if="order.productType === 'api'" class="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600" @click="router.push('/portal/bills')">查看 API 账单</button>
              <a v-if="order.detailUrl" :href="order.detailUrl" target="_blank" rel="noopener noreferrer" class="rounded-lg bg-slate-800 px-3 py-2 text-xs text-white">前往可信空间</a>
            </div>
          </div>
        </article>
      </div>
      <div v-if="!filteredOrders.length" class="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">暂无符合条件的订单</div>
    </section>

    <section v-else data-testid="portal-my-data">
      <div class="mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div><div class="text-sm font-medium text-blue-900">已交付数据集</div><div class="mt-1 text-xs text-blue-700">管理交付状态、更新服务到期日与续订；用数模块内部能力不在本期范围。</div></div>
        <div class="text-sm font-semibold text-blue-900">{{ datasetEntitlements.length }} 项</div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <article v-for="entitlement in datasetEntitlements" :key="entitlement.id" data-testid="portal-dataset-entitlement" class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 text-xs text-slate-400"><span class="rounded bg-blue-50 px-2 py-1 text-blue-600">{{ entitlement.source === 'enterprise' ? '企业数据' : '个人数据' }}</span><span>订单 {{ entitlement.orderId || '—' }}</span></div>
              <h2 class="mt-2 text-base font-semibold text-slate-900">{{ catalog.byId(entitlement.productId || '')?.name || '未知数据集' }}</h2>
            </div>
            <StatusBadge dict="entitlementStatus" :value="entitlement.status" />
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-xs">
            <div><div class="text-slate-400">服务方式</div><div class="mt-1 text-slate-700">{{ isRenewable(entitlement) ? '持续更新' : '一次性快照' }}</div></div>
            <div><div class="text-slate-400">资产版本</div><div class="mt-1 text-slate-700">{{ entitlement.assetVersion || '—' }}</div></div>
            <div><div class="text-slate-400">用数交付</div><div class="mt-1 text-slate-700">{{ deliveryFor(entitlement.id)?.status === 'delivered' ? '已交付' : '处理中' }}</div></div>
            <div><div class="text-slate-400">最近更新</div><div class="mt-1 text-slate-700">{{ deliveryFor(entitlement.id)?.lastSuccessfulRefreshAt?.slice(0, 10) || '—' }}</div></div>
            <div class="col-span-2"><div class="text-slate-400">{{ isRenewable(entitlement) ? '更新服务到期日' : '数据保留期限' }}</div><div class="mt-1 font-medium" :class="isExpiring(entitlement) ? 'text-amber-600' : 'text-slate-700'">{{ effectiveExpiry(entitlement) || '当前快照长期保留' }}<span v-if="isExpiring(entitlement)"> · 即将到期</span></div></div>
          </div>
          <div v-if="isRenewable(entitlement)" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">到期后停止接收新版本，最近已交付版本仍可使用。</div>
          <div class="mt-4 flex gap-2">
           <a v-if="deliveryFor(entitlement.id)?.biEntryUrl" :href="deliveryFor(entitlement.id)?.biEntryUrl" class="rounded-lg bg-brand-500 px-4 py-2 text-xs text-white">进入用数模块</a>
           <a v-if="deliveryFor(entitlement.id)?.downloadUrl" :href="deliveryFor(entitlement.id)?.downloadUrl" class="rounded-lg border border-brand-500 px-4 py-2 text-xs text-brand-600">下载数据</a>
           <button v-if="isRenewable(entitlement)" data-testid="portal-renew-dataset" class="rounded-lg border border-brand-500 px-4 py-2 text-xs text-brand-600" @click="renew(entitlement)">续订</button>
            <button v-if="entitlement.productId" class="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600" @click="goProduct(entitlement.productId)">查看商品</button>
          </div>
        </article>
      </div>
      <div v-if="!datasetEntitlements.length" class="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">暂无已交付数据集</div>
    </section>
  </div>
</template>
