<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/mobile/EmptyState.vue'
import MineEntityCard from './MineEntityCard.vue'
import { useUserStore } from '@/stores/user'
import { useMineOrders, type MineOrderChannelFilter, type MineOrderSubjectFilter, type MineOrderTypeFilter } from '@/composables/useMineOrders'
import {
  buyDataProductTypeLabel,
  buyDataStatusFilters,
  buyDataTypeFilterOptions,
  formatOrderTime,
  orderAmountCaption,
  orderFilterLabel,
  orderListStatusClass,
  orderListStatusLabel,
  type MyOrderCard,
  type MyOrderFilter
} from '@/domain/myCenter'

type TimeFilter = 'all' | '30d' | '365d'

const props = defineProps<{
  variant: 'mobile' | 'portal'
  subjectFilter: MineOrderSubjectFilter
  pay: (order: MyOrderCard) => void
  openBills: () => void
}>()

const emit = defineEmits<{
  'update:subjectFilter': [value: MineOrderSubjectFilter]
}>()

const router = useRouter()
const user = useUserStore()
const { filterBuyDataOrders } = useMineOrders()

const orderFilter = ref<MyOrderFilter>('all')
const typeFilter = ref<MineOrderTypeFilter>('all')
const channelFilter = ref<MineOrderChannelFilter>('all')
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
  typeFilter: typeFilter.value,
  createdAfter: createdAfter.value
}))

function setSubjectFilter(next: MineOrderSubjectFilter) {
  emit('update:subjectFilter', next)
}

function openOrder(order: MyOrderCard) {
  const base = props.variant === 'portal' ? '/portal' : '/app'
  void router.push(`${base}/mine/orders/${order.source}/${order.id}`)
}

function openProduct(order: MyOrderCard) {
  const base = props.variant === 'portal' ? '/portal' : '/app'
  void router.push(`${base}/product/${order.productId}`)
}

function exportEnterpriseOrders() {
  exportNotice.value = `已创建 ${user.enterprise.name} 企业订单导出任务，可在导出记录中查看进度。`
}

const actionPrimary = 'rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white'
const actionBrand = 'rounded-full border border-brand-500 px-3 py-1.5 text-[11px] text-brand-600'
const actionBtn = 'rounded-full border border-ink-200 px-3 py-1.5 text-[11px] text-ink-600'
</script>

<template>
  <section v-if="variant === 'mobile'" class="mt-3 space-y-3" data-testid="my-orders">
    <div v-if="subjectFilter === 'enterprise'" class="flex items-center justify-between rounded-xl bg-[#F5E8FF] px-3 py-2 text-[11px] text-[#722ED1]" data-testid="enterprise-order-filter-context">
      <span>当前仅显示 {{ user.enterprise.name }} 的可见订单</span>
      <button class="font-medium" @click="setSubjectFilter('all')">查看全部</button>
    </div>
    <div class="flex gap-2 overflow-x-auto pb-0.5">
      <button
        v-for="filter in buyDataStatusFilters"
        :key="filter"
        class="shrink-0 rounded-full border px-3 py-1.5 text-[11px]"
        :class="orderFilter === filter ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 bg-white text-ink-500'"
        @click="orderFilter = filter"
      >{{ orderFilterLabel(filter) }}</button>
    </div>

    <div class="grid grid-cols-2 gap-2 rounded-xl border border-ink-100 bg-white p-2.5 text-[11px]">
      <select v-model="typeFilter" aria-label="商品类型筛选" class="rounded-lg border border-ink-200 bg-white px-2 py-2 text-ink-600">
        <option v-for="option in buyDataTypeFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <select v-model="channelFilter" aria-label="成交渠道筛选" class="rounded-lg border border-ink-200 bg-white px-2 py-2 text-ink-600">
        <option value="all">全部成交渠道</option><option value="app">APP 内购买</option><option value="space">可信空间购买</option>
      </select>
    </div>

    <MineEntityCard
      v-for="order in filteredOrders"
      :key="`${order.source}-${order.id}`"
      :data-testid="`order-card-${order.source}-${order.id}`"
      variant="mobile"
      clickable
      @click="openOrder(order)"
    >
      <template #badges>
        <span class="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">{{ buyDataProductTypeLabel(order.productType) }}</span>
      </template>
      <template #title>{{ order.productName }}</template>
      <template #status>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" :class="orderListStatusClass(order)">{{ orderListStatusLabel(order) }}</span>
      </template>
      <template #notice>
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0 text-[11px] text-ink-500">
            {{ formatOrderTime(order.createdAt) }}
          </div>
          <div class="shrink-0 text-right">
            <div v-if="orderAmountCaption(order)" class="text-[10px] text-ink-500">{{ orderAmountCaption(order) }}</div>
            <div class="text-[13px] font-semibold text-brand-600">{{ order.amountText }}</div>
          </div>
        </div>
      </template>
      <template #actions>
        <button v-if="order.canPay && order.paymentPath" :class="actionPrimary" @click.stop="pay(order)">继续支付</button>
        <a v-if="order.productType === 'dataset' && order.biEntryUrl" :href="order.biEntryUrl" :class="actionPrimary" @click.stop>进入用数模块</a>
        <a v-if="order.productType === 'dataset' && order.downloadUrl" :href="order.downloadUrl" :class="actionBrand" @click.stop>下载数据</a>
        <button :class="actionBtn" @click.stop="openProduct(order)">查看商品</button>
      </template>
    </MineEntityCard>
    <EmptyState v-if="!filteredOrders.length" icon="🧾" title="暂无符合条件的订单" desc="含买数订单与空间试用意向（状态为意向单）" />
  </section>

  <section v-else class="space-y-3" data-testid="portal-my-orders">
    <div v-if="subjectFilter === 'enterprise'" class="flex items-center justify-between rounded-xl border border-[#F5E8FF] bg-[#F5E8FF] px-4 py-3 text-xs text-[#722ED1]" data-testid="portal-enterprise-order-filter-context">
      <span>当前仅显示 {{ user.enterprise.name }} 的可见订单</span>
      <button class="font-medium" @click="setSubjectFilter('all')">查看全部</button>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button v-for="filter in buyDataStatusFilters" :key="filter" class="rounded-lg border px-4 py-2 text-xs" :class="orderFilter === filter ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 bg-white text-ink-500'" @click="orderFilter = filter">{{ orderFilterLabel(filter) }}</button>
      </div>
      <button v-if="isAdmin" data-testid="export-enterprise-orders" class="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs text-ink-600" @click="exportEnterpriseOrders">导出企业订单</button>
    </div>

    <div class="grid grid-cols-3 gap-3 rounded-xl border border-ink-200 bg-white p-4 text-xs">
      <select v-model="typeFilter" aria-label="商品类型筛选" class="rounded-lg border border-ink-200 px-3 py-2 text-ink-600">
        <option v-for="option in buyDataTypeFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <select v-model="channelFilter" aria-label="成交渠道筛选" class="rounded-lg border border-ink-200 px-3 py-2 text-ink-600"><option value="all">全部成交渠道</option><option value="app">APP 内购买</option><option value="space">可信空间购买</option></select>
      <select v-model="timeFilter" aria-label="下单时间筛选" class="rounded-lg border border-ink-200 px-3 py-2 text-ink-600"><option value="all">全部下单时间</option><option value="30d">近 30 天</option><option value="365d">近 1 年</option></select>
    </div>
    <div v-if="exportNotice" class="flex items-center justify-between rounded-lg bg-success-50 px-4 py-2.5 text-xs text-success-600"><span>{{ exportNotice }}</span><button @click="exportNotice = ''">关闭</button></div>

    <MineEntityCard
      v-for="order in filteredOrders"
      :key="`${order.source}-${order.id}`"
      :data-testid="`order-card-${order.source}-${order.id}`"
      variant="portal"
      clickable
      @click="openOrder(order)"
    >
      <template #badges>
        <span class="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">{{ buyDataProductTypeLabel(order.productType) }}</span>
      </template>
      <template #title>{{ order.productName }}</template>
      <template #status>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="orderListStatusClass(order)">{{ orderListStatusLabel(order) }}</span>
      </template>
      <template #notice>
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0 text-xs text-ink-500">
            {{ formatOrderTime(order.createdAt) }}
          </div>
          <div class="shrink-0 text-right">
            <div v-if="orderAmountCaption(order)" class="text-[11px] text-ink-500">{{ orderAmountCaption(order) }}</div>
            <div class="text-sm font-semibold text-brand-600">{{ order.amountText }}</div>
          </div>
        </div>
      </template>
      <template #actions>
        <button v-if="order.canPay && order.paymentPath" :class="actionPrimary" @click.stop="pay(order)">继续支付</button>
        <a v-if="order.productType === 'dataset' && order.biEntryUrl" :href="order.biEntryUrl" :class="actionPrimary" @click.stop>进入用数模块</a>
        <a v-if="order.productType === 'dataset' && order.downloadUrl" :href="order.downloadUrl" :class="actionBrand" @click.stop>下载数据</a>
        <button :class="actionBtn" @click.stop="openProduct(order)">查看商品</button>
      </template>
    </MineEntityCard>
    <div v-if="!filteredOrders.length" class="rounded-2xl border border-ink-100 bg-white p-12 text-center text-sm text-ink-500 shadow-card">暂无符合条件的订单</div>
  </section>
</template>
