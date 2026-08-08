<script setup lang="ts">
import { computed, ref } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
import { useUserStore } from '@/stores/user'
import { useMineOrders, type MineOrderChannelFilter, type MineOrderSubjectFilter } from '@/composables/useMineOrders'
import { formatOrderTime, orderFilterLabel, productTypeLabels, type MyOrderCard, type MyOrderFilter } from '@/domain/myCenter'

type TimeFilter = 'all' | '30d' | '365d'

const props = defineProps<{
  variant: 'mobile' | 'portal'
  subjectFilter: MineOrderSubjectFilter
  /** 由父级注入，内含 /app 或 /portal 路径前缀 */
  goProduct: (order: MyOrderCard) => void
  pay: (order: MyOrderCard) => void
  openBills: () => void
}>()

const emit = defineEmits<{
  'update:subjectFilter': [value: MineOrderSubjectFilter]
  'view-purchased-data': []
}>()

const user = useUserStore()
const { filterBuyDataOrders } = useMineOrders()

const orderFilters: MyOrderFilter[] = ['all', 'pending_payment', 'processing', 'completed', 'closed']
const orderFilter = ref<MyOrderFilter>('all')
const channelFilter = ref<MineOrderChannelFilter>('all')
const operatorFilter = ref('all')
const timeFilter = ref<TimeFilter>('all')
const exportNotice = ref('')

const isAdmin = computed(() => user.currentEnterpriseMember?.role === 'admin')

// 固定基准时间，与既有 PortalMine 行为保持一致（种子订单时间围绕该日期构造）。
const createdAfter = computed(() => {
  if (props.variant !== 'portal') return undefined
  const now = new Date('2026-08-03T23:59:59').getTime()
  if (timeFilter.value === '30d') return now - 30 * 86_400_000
  if (timeFilter.value === '365d') return now - 365 * 86_400_000
  return undefined
})

const filteredOrders = computed(() => filterBuyDataOrders({
  orderFilter: orderFilter.value,
  subjectFilter: props.subjectFilter,
  channelFilter: channelFilter.value,
  operatorFilter: props.variant === 'portal' ? operatorFilter.value : undefined,
  createdAfter: createdAfter.value
}))

function setSubjectFilter(next: MineOrderSubjectFilter) {
  emit('update:subjectFilter', next)
}

function goData() {
  emit('view-purchased-data')
}

function exportEnterpriseOrders() {
  exportNotice.value = `已创建 ${user.enterprise.name} 企业订单导出任务，可在导出记录中查看进度。`
}
</script>

<template>
  <section v-if="variant === 'mobile'" class="mt-3 space-y-3" data-testid="my-orders">
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
      <select v-model="channelFilter" aria-label="成交渠道筛选" class="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600">
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
        <button v-if="order.filter === 'completed'" class="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] text-brand-600" @click="goData">查看我的数据</button>
        <a v-if="order.detailUrl" :href="order.detailUrl" target="_blank" rel="noopener noreferrer" class="rounded-full bg-slate-800 px-3 py-1.5 text-[11px] text-white">前往可信空间</a>
      </div>
    </article>
    <EmptyState v-if="!filteredOrders.length" icon="🧾" title="暂无符合条件的订单" desc="订单会统一展示个人、企业、APP 与可信空间来源" />
  </section>

  <section v-else data-testid="portal-my-orders">
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
        <button class="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-left" @click="openBills">
          <span>📈</span>
          <span><span class="block text-xs font-medium text-slate-800">API 调用与费用账单</span><span class="mt-0.5 block text-[11px] text-slate-500">按订单、API 与凭证追溯费用</span></span>
          <span class="text-brand-500">›</span>
        </button>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <select :value="subjectFilter" aria-label="购买主体筛选" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600" @change="setSubjectFilter(($event.target as HTMLSelectElement).value as MineOrderSubjectFilter)">
        <option value="all">全部购买主体</option><option value="personal">个人</option><option value="enterprise" :disabled="!user.isEnterpriseAuthenticated">当前企业</option>
      </select>
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
            <button class="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600" @click="goProduct(order)">查看商品</button>
            <button v-if="order.canPay && order.paymentPath" class="rounded-lg bg-brand-500 px-3 py-2 text-xs text-white" @click="pay(order)">继续付款</button>
            <button v-if="order.filter === 'completed'" class="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600" @click="goData">查看我的数据</button>
            <a v-if="order.downloadUrl" :href="order.downloadUrl" class="rounded-lg border border-brand-500 px-3 py-2 text-xs text-brand-600">下载数据</a>
            <a v-if="order.detailUrl" :href="order.detailUrl" target="_blank" rel="noopener noreferrer" class="rounded-lg bg-slate-800 px-3 py-2 text-xs text-white">前往可信空间</a>
          </div>
        </div>
      </article>
    </div>
    <div v-if="!filteredOrders.length" class="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">暂无符合条件的订单</div>
  </section>
</template>
