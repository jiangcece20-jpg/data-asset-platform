<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductDetailTabs, { type DetailTab } from '@/components/mobile/product-detail/ProductDetailTabs.vue'
import ProductPrimaryAction from '@/components/mobile/product-detail/ProductPrimaryAction.vue'
import DatasetDetail from '@/components/mobile/product-detail/DatasetDetail.vue'
import ApiDetail from '@/components/mobile/product-detail/ApiDetail.vue'
import ReportDetail from '@/components/mobile/product-detail/ReportDetail.vue'
import DashboardDetail from '@/components/mobile/product-detail/DashboardDetail.vue'
import ServiceStatusNotice from '@/components/mobile/ServiceStatusNotice.vue'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { currentPurchaseSubject, startDatasetPayment } from '@/domain/purchaseIdentity'
import { membershipActionFields } from '@/domain/membership'
import { useListingRequestStore } from '@/stores/listingRequests'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { resolveProductActions, resolvePurchaseInProgress, type ProductActionKey } from '@/domain/productAccess'
import { pricingPresentation } from '@/domain/pricingPresentation'
import { commerceOffersOf, offerDescription, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { billingRuleNotes, isSpaceSyncedProduct } from '@/domain/productDetailFields'
import { productListChips, productTopicTags, productTrialChips } from '@/domain/productListChips'
import { USER_INTENT_HINT, SPACE_TRIAL_APPLY_LABEL } from '@/domain/spaceIntent'
import { productDetailPriceSummary } from '@/domain/productPriceDisplay'
import type { ProductType } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const orders = useOrderStore()
const datasetCommerce = useDatasetCommerceStore()
const spaceIntents = useSpaceIntentStore()
const listingRequests = useListingRequestStore()
const trustedSpaceCatalog = useTrustedSpaceCatalogStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const title = computed(() => product.value?.name ?? '')
const topicTags = computed(() => (product.value ? productTopicTags(product.value) : []))
const listChips = computed(() => (product.value ? productListChips(product.value) : null))
const trialChips = computed(() => (product.value ? productTrialChips(product.value) : []))

const originLabels: Record<string, string> = {
  app_content: 'App自有内容',
  asset_platform: '资产平台',
  trusted_space: '可信空间',
  seller_market: '入驻商家',
  user_created: '个人创建'
}
const statusLabels: Record<string, string> = {
  candidate: '可申请上架',
  preparing: '准备中',
  paused: '暂停销售',
  delisted: '已下架'
}
const heroStatusLine = computed(() => {
  const p = product.value
  if (!p) return ''
  // 对齐设计稿：模块入口 | 销售状态（若有）| 支付/交付方式
  const parts = [p.type === 'dataset' ? '用数' : '看数']
  const status = statusLabels[p.availability]
  if (status) parts.push(status)
  parts.push(p.dealChannel === 'space_purchase' ? '可信空间交付' : 'App支付')
  return parts.join('  |  ')
})

interface HeroMetric { value: string; label: string }
const heroMetrics = computed<HeroMetric[]>(() => {
  const p = product.value
  if (!p) return []
  if (p.type === 'dataset') {
    const d = p.typeDetail.dataset
    const cells: Array<HeroMetric | null> = [
      d.granularity ? { value: d.granularity, label: '数据粒度' } : null,
      d.timeRange ? { value: d.timeRange, label: '时间范围' } : null,
      d.rowCount != null ? { value: d.rowCount.toLocaleString(), label: '数据行数' } : null,
      d.fieldCount != null ? { value: `${d.fieldCount}个`, label: '字段数' } : null
    ]
    const filled = cells.filter((c): c is HeroMetric => c !== null)
    if (filled.length) return filled
  }
  // 对齐设计稿：优先取空间同步的短值，避免长句截断
  const region = p.spaceMeta?.regionCategory || p.coverage
  const delivery = p.spaceMeta?.deliveryMode || p.deliveryMethod
  const industry = p.spaceMeta?.industryCategory
  return [
    region ? { value: region, label: '地域范围' } : null,
    p.updateFrequency ? { value: p.updateFrequency, label: '更新频率' } : null,
    delivery ? { value: delivery, label: '交付方式' } : null,
    industry
      ? { value: industry, label: '行业分类' }
      : { value: originLabels[p.origin] ?? '', label: '来源' }
  ].filter((c): c is HeroMetric => c !== null && Boolean(c.value)).slice(0, 4)
})
const pricingInfo = computed(() => product.value ? pricingPresentation(product.value) : undefined)
const commerceOffers = computed(() => product.value ? commerceOffersOf(product.value) : [])
const billingRules = computed(() => billingRuleNotes(product.value))
const purchaseSubject = computed(() => currentPurchaseSubject(user))

const access = computed(() => (product.value ? entitlements.accessLevel(product.value) : 'none'))
const owned = computed(() => access.value !== 'none')
const purchaseInProgress = computed(() => resolvePurchaseInProgress({
  productId: id.value,
  orders: orders.list,
  intents: spaceIntents.list,
  ownerMemberId: user.context.currentMemberId,
  enterpriseId: user.context.currentEnterpriseId
}))
const detailPrice = computed(() => {
  if (!product.value || owned.value || purchaseInProgress.value) return null
  return productDetailPriceSummary(product.value, purchaseSubject.value)
})
const currentCommerceOffers = computed(() =>
  commerceOffers.value.filter((offer) => offer.subject === purchaseSubject.value)
)
const contentUnlocked = computed(() => {
  if (!product.value) return false
  if (product.value.acquisitions.includes('free')) return true
  return owned.value
})

const datasetEntryUrl = computed(() => {
  const current = product.value
  if (!current || current.type !== 'dataset' || current.origin !== 'asset_platform' || !owned.value) return undefined
  const today = new Date().toISOString().slice(0, 10)
  const activeEntitlementIds = new Set(
    entitlements.visibleDatasetEntitlements
      .filter((item) => item.productId === current.id
        && item.status === 'active'
        && item.validFrom.slice(0, 10) <= today
        && (!item.validTo || item.validTo >= today))
      .map((item) => item.id)
  )
  return datasetCommerce.visibleDeliveries
    .filter((delivery) => delivery.productId === current.id
      && delivery.status === 'delivered'
      && Boolean(delivery.biEntryUrl)
      && activeEntitlementIds.has(delivery.entitlementId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.biEntryUrl
})

const listingRequest = computed(() => product.value
  ? listingRequests.byProduct(product.value.id, user.context.currentMemberId)
  : undefined)
const hasOpenListingRequest = computed(() =>
  listingRequest.value != null && ['submitted', 'evaluating', 'preparing'].includes(listingRequest.value.status)
)

const actions = computed(() => {
  const current = product.value
  if (!current) return null
  const resolved = resolveProductActions({
    type: current.type,
    origin: current.origin,
    availability: current.availability,
    acquisitions: current.acquisitions,
    hasAccess: owned.value,
    hasOpenListingRequest: hasOpenListingRequest.value,
    enterpriseAuthenticated: user.isEnterpriseAuthenticated,
    serviceStatus: current.serviceStatus,
    purchaseInProgress: purchaseInProgress.value,
    ...membershipActionFields(current, {
      identitySubject: currentPurchaseSubject(user),
      hasEffectiveMembership: entitlements.hasEffectiveMembership,
      canPurchaseMembership: entitlements.canPurchaseMembership
    })
  })
  if (current.type === 'dataset' && current.origin === 'asset_platform' && owned.value) {
    return datasetEntryUrl.value
      ? { ...resolved, primary: { key: 'view', label: '在用数中使用', href: datasetEntryUrl.value } }
      : { ...resolved, primary: { key: 'delivery_progress', label: '查看交付进度' } }
  }
  return resolved
})

const actionHeadline = computed(() => {
  if (owned.value) return access.value === 'enterprise' ? '团队已拥有' : '权益已生效'
  if (!detailPrice.value?.listPriceText) return undefined
  return `${purchaseSubject.value === 'enterprise' ? '企业价' : '个人价'} ${detailPrice.value.listPriceText}`
})

const actionSupporting = computed(() => {
  if (owned.value) return '当前账号可用'
  const memberPrice = detailPrice.value?.memberPriceText
  if (!memberPrice) return undefined
  return memberPrice === '会员免费' ? memberPrice : `会员价 ${memberPrice}`
})

const tabsByType: Record<ProductType, DetailTab[]> = {
  dataset: [
    { key: 'basic', label: '基本信息' },
    { key: 'samples', label: '样例数据' },
    { key: 'fields', label: '字段信息' },
    { key: 'profiling', label: '探查报告' }
  ],
  api: [
    { key: 'basic', label: '基本信息' },
    { key: 'docs', label: '接口文档' },
    { key: 'sandbox', label: '在线调试' },
    { key: 'sla', label: '错误码与 SLA' }
  ],
  report: [
    { key: 'preview', label: '报表预览' },
    { key: 'reader', label: '在线阅读' },
    { key: 'catalog', label: '目录' },
    { key: 'overview', label: '报告介绍' }
  ],
  dashboard: [
    { key: 'preview', label: '看板预览' },
    { key: 'metrics', label: '指标定义' },
    { key: 'overview', label: '基本信息' },
    { key: 'updates', label: '更新与导出' }
  ]
}

const currentTabs = computed(() => {
  if (!product.value) return []
  if (product.value.type === 'api' && isSpaceSyncedProduct(product.value)) {
    return tabsByType.api.filter((tab) => tab.key !== 'sandbox' && tab.key !== 'sla')
  }
  return tabsByType[product.value.type]
})
const activeTab = ref('basic')
const defaultTabByType: Record<ProductType, string> = {
  dataset: 'basic',
  api: 'basic',
  report: 'reader',
  dashboard: 'preview'
}
// 概览页并入「商品说明书」；内容优先后概览不再是默认首个页签。
const overviewTabByType: Record<ProductType, string> = {
  dataset: 'basic',
  api: 'basic',
  report: 'overview',
  dashboard: 'overview'
}
const isOverviewTab = computed(() => product.value != null && activeTab.value === overviewTabByType[product.value.type])

watch(id, () => {
  const p = product.value
  if (p) activeTab.value = defaultTabByType[p.type]
}, { immediate: true })

onMounted(() => {
  if (product.value?.dealChannel === 'space_purchase') void trustedSpaceCatalog.syncAll()
})

function toggleFav() {
  catalog.toggleFavorite(id.value)
}

function goEnterpriseAuth() {
  router.push({ path: '/app/enterprise-auth', query: { redirect: route.fullPath } })
}
function goSpaceIntent() {
  router.push(`/app/space-intent/${id.value}`)
}
function goMember() {
  router.push({ path: '/app/checkout/member', query: { returnProduct: id.value } })
}
function goItem(options?: { skipDual?: boolean }) {
  router.push({
    path: `/app/checkout/item/${id.value}`,
    query: options?.skipDual ? { skipDual: '1' } : undefined
  })
}
function goDatasetPayment() {
  try {
    const { path } = startDatasetPayment(id.value, false)
    router.push(path)
  } catch {
    router.push(`/app/checkout/dataset/${id.value}`)
  }
}
/** 报告章节点「阅读」时，走该商品当前可用的解锁路径 */
function handleUnlock() {
  const primary = actions.value?.primary?.key
  if (primary) return handleAction(primary)
  goItem()
}

function goInProgressOrder(orderId: string) {
  const order = orders.list.find((item) => item.id === orderId)
  if (order?.status === 'pending_payment' && !order.spaceIntentId && !order.sellerId && order.productType === 'dataset') {
    void router.push(`/app/payment/dataset/${orderId}`)
    return
  }
  void router.push(`/app/mine/orders/app/${orderId}`)
}

function handleAction(key: ProductActionKey) {
  switch (key) {
    case 'view':
    case 'free_view':
      router.push(product.value?.type === 'dataset' && product.value.origin === 'asset_platform'
        ? { path: '/app/mine', query: { menu: 'orders', orderTab: 'buy' } }
        : '/app/mine')
      break
    case 'enterprise_auth': goEnterpriseAuth(); break
    case 'submit_space_intent':
    case 'space_purchase':
      goSpaceIntent(); break
    case 'member_purchase': goMember(); break
    case 'item_purchase': goItem(); break
    case 'dataset_purchase': goDatasetPayment(); break
    case 'request_listing': router.push(`/app/listing-request/${id.value}`); break
    case 'listing_progress': router.push({ path: '/app/mine', query: { menu: 'favorites' } }); break
    case 'continue_payment':
    case 'delivery_progress': {
      const phase = purchaseInProgress.value
      if (phase && (phase.phase === 'pending_payment' || phase.phase === 'fulfilling')) {
        goInProgressOrder(phase.orderId)
        break
      }
      if (product.value?.type === 'dataset' && product.value.origin === 'asset_platform') {
        router.push({ path: '/app/mine', query: { menu: 'orders', orderTab: 'buy' } })
      }
      break
    }
    case 'intent_progress': {
      const phase = purchaseInProgress.value
      if (phase?.phase === 'space_intent') {
        void router.push(`/app/mine/orders/intent/${phase.intentId}`)
      }
      break
    }
  }
}
</script>

<template>
  <div v-if="product" class="min-h-full bg-ink-100 pb-28">
    <!-- 蓝色 Hero（对齐 App 设计稿：状态行 + 标题 + 半透明标签 + 关键指标卡） -->
    <div class="relative overflow-hidden bg-gradient-to-br from-[#2B66F5] via-[#3370F7] to-[#5290FF]">
      <div class="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10"></div>
      <div class="pointer-events-none absolute -right-6 top-12 h-24 w-24 rounded-full border-[10px] border-white/10"></div>

      <MobileHeader title="详情" tone="light" />

      <div class="px-4 pb-3">
        <div class="text-[11px] leading-4 text-white/70">{{ heroStatusLine }}</div>
        <div class="mt-1 text-[21px] font-bold leading-7 text-white">{{ title }}</div>

        <!-- 标签行：半透明白胶囊，单行横滑（对齐设计稿） -->
        <div v-if="listChips" data-testid="product-chips" class="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ listChips.typeLabel }}</span>
          <span v-if="listChips.venue" class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ listChips.venue.name }}</span>
          <span v-if="listChips.ops" class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ listChips.ops.label }}</span>
          <span v-for="chip in trialChips" :key="chip" class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ chip }}</span>
          <span v-for="tag in topicTags" :key="tag" class="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[11px] leading-4 text-white/80">{{ tag }}</span>
        </div>

        <!-- 关键指标四宫格 -->
        <div v-if="heroMetrics.length" class="mt-3 grid overflow-hidden rounded-2xl bg-white py-3 shadow-card" :style="{ gridTemplateColumns: `repeat(${Math.min(heroMetrics.length, 4)}, minmax(0, 1fr))` }">
          <div
            v-for="(metric, idx) in heroMetrics.slice(0, 4)"
            :key="metric.label"
            class="min-w-0 px-2 text-center"
            :class="idx > 0 ? 'border-l border-ink-100' : ''"
          >
            <div class="truncate text-[17px] font-bold leading-6 text-ink-900">{{ metric.value }}</div>
            <div class="mt-0.5 truncate text-[11px] leading-4 text-ink-400">{{ metric.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service status notice -->
    <div v-if="product.serviceStatus !== 'normal' || product.availability === 'paused' || product.availability === 'delisted'" class="px-4 pt-2">
      <ServiceStatusNotice :availability="product.availability" :service-status="product.serviceStatus" :has-access="owned" />
    </div>

    <!-- 内容优先：蓝头下直接进入样例、接口、阅读或看板预览。 -->
    <ProductDetailTabs v-model="activeTab" :tabs="currentTabs" />

    <!-- Tab 内容（与上方 Tab 白卡连体） -->
    <div class="mx-4 rounded-b-2xl bg-white p-4 shadow-card">
      <!-- dataset 类型：表格+分类分级放在最前面 -->
      <DatasetDetail v-if="product.type === 'dataset'" :product="product" :active-tab="activeTab as any" />

      <!-- 概览页：基础信息 + 商品说明书（从 hero 下沉至此） -->
      <div
        v-if="isOverviewTab"
        class="space-y-4"
        :class="product.type === 'dataset'
          ? 'mt-4 border-t border-ink-100 pt-4'
          : product.type === 'api'
            ? ''
            : 'mb-4 border-b border-ink-100 pb-4'"
      >
        <!-- 看板关键指标（其余类型的关键指标在各自 tab 内） -->
        <div v-if="product.type === 'dashboard'" data-testid="dashboard-overview-info">
          <div class="mb-2 text-[13px] font-semibold text-ink-900">看板信息</div>
          <DashboardDetail :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" />
        </div>

        <!-- 资源信息 + 合规与授权 + 提供方 -->
        <ProductInfoSections :product="product" variant="mobile" data-testid="product-basic-info" />

        <div class="space-y-2 text-[13px] leading-relaxed" data-testid="product-manual">
          <div class="text-[13px] font-semibold text-ink-900">商品说明书</div>
          <div><span class="text-ink-400">价值主张：</span><span class="text-ink-700">{{ product.valueProposition }}</span></div>
          <div><span class="text-ink-400">详细描述：</span><span class="text-ink-700">{{ product.description }}</span></div>
          <div><span class="text-ink-400">质量/服务承诺：</span><span class="text-ink-700">{{ product.qualityPromise }}</span></div>
          <div><span class="text-ink-400">合规声明：</span><span class="text-ink-700">{{ product.complianceNote }}</span></div>
        </div>

        <!-- 产品介绍（空间同步富文本） -->
        <div v-if="product.spaceMeta?.productIntroduction" class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-semibold text-ink-900">产品介绍</span>
            <span class="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">来自可信空间</span>
          </div>
          <p class="whitespace-pre-line text-[13px] leading-relaxed text-ink-500">{{ product.spaceMeta.productIntroduction }}</p>
        </div>
      </div>

      <ApiDetail v-if="product.type === 'api'" :product="product" :active-tab="activeTab as any" />
      <ReportDetail
        v-else-if="product.type === 'report'"
        :product="product"
        :active-tab="activeTab as any"
        :unlocked="contentUnlocked"
        @unlock="handleUnlock"
      />
      <DashboardDetail v-else-if="product.type === 'dashboard' && activeTab !== 'overview'" :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" />
      <div v-else-if="product.type !== 'dataset' && product.type !== 'dashboard'" class="py-8 text-center text-[13px] text-ink-400">资料准备中</div>
    </div>

   <!-- 交易承接：用户看过内容后再了解报价、方案与购买资格。 -->
    <div
      v-if="detailPrice && !owned"
      class="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-card"
      data-testid="product-price-summary"
    >
      <div class="flex flex-wrap items-end gap-6">
        <div v-if="detailPrice.listPriceText">
          <div class="text-[11px] text-ink-400">价格</div>
          <div class="text-[22px] font-bold text-danger-500">{{ detailPrice.listPriceText }}</div>
        </div>
        <div v-if="detailPrice.memberPriceText">
          <div class="text-[11px] text-ink-400">会员价</div>
          <div class="text-[22px] font-bold text-danger-500">{{ detailPrice.memberPriceText }}</div>
        </div>
      </div>
      <div v-if="detailPrice.purchaseNote" class="mt-2 text-[11px] leading-relaxed text-ink-400">{{ detailPrice.purchaseNote }}</div>
    </div>

    <div v-if="pricingInfo && !owned" class="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-card" data-testid="pricing-method">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-[11px] text-ink-400">报价方式</div>
          <div class="mt-0.5 text-[14px] font-semibold text-ink-900">{{ pricingInfo.label }}</div>
        </div>
        <span class="rounded-full bg-brand-50 px-2 py-1 text-[10px] text-brand-600">{{ product.dealChannel === 'space_purchase' ? '空间定价' : 'APP 定价' }}</span>
      </div>
      <div class="mt-2 text-[11px] leading-relaxed text-ink-500">{{ pricingInfo.note }}</div>
      <div v-if="billingRules.length" class="mt-2 space-y-1 border-t border-ink-100 pt-2" data-testid="space-billing-rules">
        <div class="text-[10px] text-ink-400">计费规则 · 来自可信空间</div>
        <div v-for="rule in billingRules" :key="rule" class="flex gap-1 text-[11px] leading-relaxed text-ink-500">
          <svg class="mt-0.5 h-3 w-3 shrink-0 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z"/></svg>
          {{ rule }}
        </div>
      </div>
    </div>

    <div v-if="(product.dealChannel === 'space_purchase' ? commerceOffers.length : currentCommerceOffers.length) && !owned && !detailPrice" class="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-card" data-testid="commerce-offers">
      <div class="mb-2 flex items-center justify-between"><span class="text-[13px] font-semibold text-ink-900">{{ product.dealChannel === 'space_purchase' ? '价格方案' : '购买价格' }}</span><span class="text-[10px] text-ink-400">{{ product.dealChannel === 'space_purchase' ? '来自可信空间同步' : `固定购买周期 ${salePeriodMonthsOf(product)} 个月` }}</span></div>
      <div v-for="offer in (product.dealChannel === 'space_purchase' ? commerceOffers : currentCommerceOffers)" :key="offer.id" class="flex items-center justify-between gap-3 border-t border-ink-100 py-2.5 first:border-t-0">
        <div><div class="text-[13px] font-medium text-ink-800">{{ offer.name }}</div><div class="mt-0.5 text-[10px] leading-relaxed text-ink-400">{{ offer.subject === 'enterprise' ? '企业' : '个人' }} · {{ product.dealChannel === 'space_purchase' ? offerDescription(offer) : `订单锁定 ${salePeriodMonthsOf(product)} 个月购买周期` }}</div></div>
        <div class="shrink-0 text-[15px] font-bold text-danger-500">¥{{ offer.price.toLocaleString() }}</div>
      </div>
    </div>

    <div
      v-if="product.dealChannel === 'space_purchase' && !owned"
      class="mx-4 mt-3 rounded-2xl bg-brand-50 p-4"
      data-testid="trusted-space-purchase-eligibility"
    >
      <div class="text-[13px] font-semibold text-brand-700">{{ SPACE_TRIAL_APPLY_LABEL }}</div>
      <div class="mt-1 text-[11px] leading-relaxed text-brand-700/80">{{ USER_INTENT_HINT }}</div>
    </div>

    <!-- 已拥有权益 -->
    <div v-if="owned" class="mx-4 mt-3 rounded-2xl bg-success-50 p-4" data-testid="product-entitlement-summary">
      <div class="flex items-center gap-1.5 text-[13px] font-semibold text-success-600">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        {{ product.type === 'dataset' && product.origin === 'asset_platform' ? '数据权益已生效' : access === 'member' ? '会员权益已生效' : access === 'item' ? '已单独购买' : '团队已拥有' }}
      </div>
      <div class="mt-1 text-[12px] text-success-600/90">{{ product.type === 'dataset' && product.origin === 'asset_platform' ? (datasetEntryUrl ? '当前账号可直接进入用数模块使用' : '交付处理中，可查看交付进度') : '当前账号可使用该商品权益' }}</div>
    </div>

    <!-- API 用量明细 -->
    <div v-if="product.type === 'api' && owned" class="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-card">
      <div class="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
        <svg class="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>
        用量明细
      </div>
      <div class="mt-2 flex items-center justify-between text-[12px]">
        <div>
          <span class="text-ink-400">本月调用：</span>
          <span class="text-ink-700">-- 次</span>
        </div>
        <button
          class="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] text-brand-600"
          @click="router.push('/app/mine/enterprise/bills')"
        >查看账单详情 →</button>
      </div>
    </div>

    <ProductPrimaryAction
      v-if="actions"
      :primary="actions.primary"
      :secondary="actions.secondary"
      :headline="actionHeadline"
      :supporting="actionSupporting"
      :favorite="product.favorite"
      @action="handleAction"
      @toggle-favorite="toggleFav"
    />
  </div>
  <div v-else class="p-6 text-center text-sm text-ink-400">商品不存在</div>
</template>
