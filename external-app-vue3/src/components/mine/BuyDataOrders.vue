<script setup lang="ts">
import ProductExpiredStamp from '@/components/shared/ProductExpiredStamp.vue'
import ProductDelistedStamp from '@/components/shared/ProductDelistedStamp.vue'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/mobile/EmptyState.vue'
import MineEntityCard from './MineEntityCard.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { purchasedDatasetEntry } from '@/domain/datasetEntry'
import { useMineOrders, type MineOrderOriginFilter, type MineOrderSubjectFilter, type MineOrderTypeFilter } from '@/composables/useMineOrders'
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
const route = useRoute()
const catalog = useCatalogStore()
const productIdFilter = computed(() => String(route.query.productId || ''))
function clearProductFilter() {
  void router.replace({ query: { ...route.query, productId: undefined } })
}
const user = useUserStore()
const { filterBuyDataOrders } = useMineOrders()

const orderFilter = ref<MyOrderFilter>('all')
const typeFilter = ref<MineOrderTypeFilter>('all')
const originFilter = ref<MineOrderOriginFilter>('all')
const productName = ref('')
const startDate = ref('')
const endDate = ref('')
const invalidDates = computed(() => Boolean(startDate.value && endDate.value && startDate.value > endDate.value))
const exportNotice = ref('')
const pcUseNoticeOrderId = ref('')

const isAdmin = computed(() => user.currentEnterpriseMember?.role === 'admin')

const filteredOrders = computed(() => invalidDates.value ? [] : filterBuyDataOrders({
  orderFilter: orderFilter.value,
  subjectFilter: props.subjectFilter,
  typeFilter: typeFilter.value,
  originFilter: originFilter.value,
  productName: productName.value,
  createdAfter: startDate.value ? new Date(`${startDate.value}T00:00:00+08:00`).getTime() : undefined,
  createdBefore: endDate.value ? new Date(`${endDate.value}T23:59:59.999+08:00`).getTime() : undefined
}).filter(order => !productIdFilter.value || order.productId === productIdFilter.value))

function setSubjectFilter(next: MineOrderSubjectFilter) {
  emit('update:subjectFilter', next)
}

function openDashboard(order: MyOrderCard) {
  if (!order.canOpenDashboard || !order.dashboardPath) return
  const path = props.variant === 'portal' ? order.dashboardPath.replace(/^\/app\//, '/portal/') : order.dashboardPath
  void router.push({ path, query: { orderId: order.id } })
}

function openOrder(order: MyOrderCard) {
  const base = props.variant === 'portal' ? '/portal' : '/app'
  void router.push(`${base}/mine/orders/${order.source}/${order.id}`)
}

function openProduct(order: MyOrderCard) {
  const base = props.variant === 'portal' ? '/portal' : '/app'
  void router.push(`${base}/product/${order.productId}`)
}

function openDataset(order: MyOrderCard) {
  if (!order.canUseDataset) return
  if (props.variant === 'mobile') {
    pcUseNoticeOrderId.value = order.id
    return
  }
  void router.push(purchasedDatasetEntry(order.productId, 'portal', order.id))
}

function exportEnterpriseOrders() {
  exportNotice.value = `已创建 ${user.enterprise.name} 企业订单导出任务，可在导出记录中查看进度。`
}

const actionPrimary = 'rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white'
const actionBtn = 'rounded-full border border-ink-200 px-3 py-1.5 text-[11px] text-ink-600'
</script>

<template>
  <div v-if="productIdFilter" data-testid="order-product-filter" class="mb-3 flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
    <span>当前商品：{{ catalog.byId(productIdFilter)?.name || productIdFilter }}</span>
    <button class="underline" @click="clearProductFilter">清除筛选</button>
  </div>
  <section v-if="variant === 'mobile'" class="mt-3 space-y-3" data-testid="my-orders">
    <p data-testid="dataset-pc-use-explanation" class="rounded-xl bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-700">App端不提供「用数」模块，请登录PC端查看和使用数据集。</p>
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
      <input v-model="productName" aria-label="搜索订单商品名称" placeholder="搜索商品名称" class="col-span-2 min-w-0 rounded-lg border border-ink-200 bg-white px-2 py-2 text-ink-600" />
      <select v-model="originFilter" aria-label="资源来源筛选" class="rounded-lg border border-ink-200 bg-white px-2 py-2 text-ink-600">
        <option value="all">全部来源</option><option value="app_content">自营产品</option><option value="trusted_space">可信空间</option><option value="seller_market">入驻商家</option>
      </select>
      <select v-model="typeFilter" aria-label="商品类型筛选" class="rounded-lg border border-ink-200 bg-white px-2 py-2 text-ink-600">
        <option v-for="option in buyDataTypeFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <label class="min-w-0 text-ink-500">下单开始日期<input v-model="startDate" type="date" aria-label="下单开始日期" class="mt-1 w-full min-w-0 rounded border border-ink-200 p-2 text-ink-700" /></label>
      <label class="min-w-0 text-ink-500">下单结束日期<input v-model="endDate" type="date" aria-label="下单结束日期" class="mt-1 w-full min-w-0 rounded border border-ink-200 p-2 text-ink-700" /></label>
      <p v-if="invalidDates" role="alert" class="col-span-2 text-red-600">开始日期不能晚于结束日期</p>
      <button v-if="startDate || endDate" class="col-span-2 text-right text-brand-600" @click="startDate = ''; endDate = ''">清空日期</button>
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
      <template #title><RouterLink data-testid="order-product-name" :to="`/app/product/${order.productId}`" class="hover:text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" @click.stop @keydown.enter.stop>{{ order.productName }}</RouterLink><ProductDelistedStamp v-if="order.productDelisted" class="ml-2" /><ProductExpiredStamp v-if="order.serviceStatus?.includes('已到期')" :dataset="order.productType === 'dataset' && order.source === 'app'" class="ml-2" /></template>
      <template #status>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" :class="orderListStatusClass(order)">{{ orderListStatusLabel(order) }}</span>
      </template>
      <template #notice>
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0 text-[11px] text-ink-500">
            <div class="break-all">订单号 {{ order.id }}</div>
            <div class="mt-1">{{ formatOrderTime(order.createdAt) }}</div>
            <div v-if="order.serviceStatus" class="mt-1">本单权益：{{ order.serviceStatus }}<span v-if="order.deliveryStatus"> · {{ order.deliveryStatus }}</span></div>
          </div>
          <div class="shrink-0 text-right">
            <div v-if="orderAmountCaption(order)" class="text-[10px] text-ink-500">{{ orderAmountCaption(order) }}</div>
            <div class="text-[13px] font-semibold text-brand-600">{{ order.amountText }}</div>
          </div>
        </div>
        <p v-if="order.canUseDataset && order.serviceStatus === '服务已到期'" class="mt-2 text-xs leading-relaxed text-ink-500">更新服务已到期，历史已交付数据仍可在PC端按原授权使用，不再更新。</p>
        <div v-if="pcUseNoticeOrderId === order.id" role="status" class="mt-2 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-brand-700" @click.stop @keydown.enter.stop>
          <p v-if="order.source === 'space'">请登录PC端，前往原订单查看和使用已交付数据。</p>
          <p v-else-if="order.serviceStatus === '服务已到期'">请登录PC端，前往「用数」模块查看已交付数据。</p>
          <p v-else>请登录PC端，前往「用数」模块查看和使用。</p>
          <button type="button" aria-label="关闭PC端使用提示" class="mt-2 font-medium underline" @click.stop="pcUseNoticeOrderId = ''">知道了</button>
        </div>
      </template>
      <template #actions>
        <button v-if="order.canPay && order.paymentPath" :class="actionPrimary" @click.stop="pay(order)">继续支付</button>
        <button v-if="order.canOpenDashboard" :class="actionPrimary" @click.stop="openDashboard(order)">前往看数</button>
        <button v-if="order.canUseDataset" :class="actionPrimary" @click.stop="openDataset(order)" @keydown.enter.stop>PC端使用</button>
        <button :class="actionBtn" @click.stop="openOrder(order)">查看订单</button>
        <button :class="actionBtn" @click.stop="openProduct(order)">查看商品</button>
      </template>
    </MineEntityCard>
    <EmptyState v-if="!invalidDates && !filteredOrders.length" title="暂无符合条件的订单" />
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

    <div class="grid grid-cols-2 items-end gap-3 rounded-xl border border-ink-200 bg-white p-4 text-xs lg:grid-cols-5">
      <input v-model="productName" aria-label="搜索订单商品名称" placeholder="搜索商品名称" class="min-w-0 rounded-lg border border-ink-200 px-3 py-2 text-ink-600" />
      <select v-model="originFilter" aria-label="资源来源筛选" class="rounded-lg border border-ink-200 px-3 py-2 text-ink-600"><option value="all">全部来源</option><option value="app_content">自营产品</option><option value="trusted_space">可信空间</option><option value="seller_market">入驻商家</option></select>
      <select v-model="typeFilter" aria-label="商品类型筛选" class="rounded-lg border border-ink-200 px-3 py-2 text-ink-600">
        <option v-for="option in buyDataTypeFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <label class="min-w-0 text-ink-500">下单开始日期<input v-model="startDate" type="date" aria-label="下单开始日期" class="mt-1 w-full min-w-0 rounded border border-ink-200 p-2 text-ink-700" /></label>
      <label class="min-w-0 text-ink-500">下单结束日期<input v-model="endDate" type="date" aria-label="下单结束日期" class="mt-1 w-full min-w-0 rounded border border-ink-200 p-2 text-ink-700" /></label>
      <p v-if="invalidDates" role="alert" class="col-span-2 text-red-600">开始日期不能晚于结束日期</p>
      <button v-if="startDate || endDate" class="text-right text-brand-600 lg:col-span-5" @click="startDate = ''; endDate = ''">清空日期</button>
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
      <template #title><RouterLink data-testid="order-product-name" :to="`/portal/product/${order.productId}`" class="hover:text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" @click.stop @keydown.enter.stop>{{ order.productName }}</RouterLink><ProductDelistedStamp v-if="order.productDelisted" class="ml-2" /><ProductExpiredStamp v-if="order.serviceStatus?.includes('已到期')" :dataset="order.productType === 'dataset' && order.source === 'app'" class="ml-2" /></template>
      <template #status>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="orderListStatusClass(order)">{{ orderListStatusLabel(order) }}</span>
      </template>
      <template #notice>
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0 text-xs text-ink-500">
            <div class="break-all">订单号 {{ order.id }}</div>
            <div class="mt-1">{{ formatOrderTime(order.createdAt) }}</div>
            <div v-if="order.serviceStatus" class="mt-1">本单权益：{{ order.serviceStatus }}<span v-if="order.deliveryStatus"> · {{ order.deliveryStatus }}</span></div>
          </div>
          <div class="shrink-0 text-right">
            <div v-if="orderAmountCaption(order)" class="text-[11px] text-ink-500">{{ orderAmountCaption(order) }}</div>
            <div class="text-sm font-semibold text-brand-600">{{ order.amountText }}</div>
          </div>
        </div>
      </template>
      <template #actions>
        <button v-if="order.canPay && order.paymentPath" :class="actionPrimary" @click.stop="pay(order)">继续支付</button>
        <button v-if="order.canOpenDashboard" :class="actionPrimary" @click.stop="openDashboard(order)">前往看数</button>
        <a v-if="order.canUseDataset && order.source === 'space'" :href="order.downloadUrl" target="_blank" rel="noopener" :class="actionPrimary" @click.stop>查看已交付数据</a>
        <button v-else-if="order.canUseDataset" :class="actionPrimary" @click.stop="openDataset(order)">查看已交付数据</button>
        <button :class="actionBtn" @click.stop="openOrder(order)">查看订单</button>
        <button :class="actionBtn" @click.stop="openProduct(order)">查看商品</button>
      </template>
    </MineEntityCard>
    <div v-if="!invalidDates && !filteredOrders.length" class="rounded-2xl border border-ink-100 bg-white p-12 text-center text-sm text-ink-500 shadow-card">暂无符合条件的订单</div>
  </section>
</template>
