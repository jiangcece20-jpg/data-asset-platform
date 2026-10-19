<script setup lang="ts">
import MembershipOpeningDialog from '@/components/shared/MembershipOpeningDialog.vue'
import { productOrderEntry } from '@/domain/productOrderEntry'
import { canContinueOrderPayment } from '@/domain/productAccess'
import ProductExpiredStamp from '@/components/shared/ProductExpiredStamp.vue'
import ProductDelistedStamp from '@/components/shared/ProductDelistedStamp.vue'
import ProductPricingDetails from '@/components/shared/ProductPricingDetails.vue'
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
import ReportPlaceholder from '@/components/shared/ReportPlaceholder.vue'
import DatasetPcUsageNotice from '@/components/shared/DatasetPcUsageNotice.vue'
import { useMineOrders } from '@/composables/useMineOrders'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'
import ApiSupportingFiles from '@/components/shared/ApiSupportingFiles.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { isPublicDatasetEntry, publicDatasetEntry, publicDatasetUseIssue, isPurchasedDataset, purchasedDatasetEntry, purchasedDatasetRetentionNotice } from '@/domain/datasetEntry'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { currentPurchaseSubject, startDatasetPayment } from '@/domain/purchaseIdentity'
import { membershipActionFields } from '@/domain/membership'
import { useListingRequestStore } from '@/stores/listingRequests'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { resolveProductActions, resolvePurchaseInProgress, type ProductAction, type ProductActionKey } from '@/domain/productAccess'
import { pricingPresentation } from '@/domain/pricingPresentation'
import { commerceOffersOf, offerDescription, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { billingRuleNotes, isSpaceSyncedProduct } from '@/domain/productDetailFields'
import { productListChips, productTopicTags, productTrialChips } from '@/domain/productListChips'
import { USER_INTENT_HINT, SPACE_TRIAL_APPLY_LABEL } from '@/domain/spaceIntent'
import { productDetailPriceSummary } from '@/domain/productPriceDisplay'
import { hasExpiredEnterpriseProductEntitlement, resolveV102Trade, type V102TradeAction } from '@/domain/v102Trade'
import { dashboardEntryPath } from '@/domain/dashboardEntry'
import { shanghaiDate } from '@/utils/businessDate'
import type { Product, ProductType } from '@/types/domain'

const membershipOpen = ref(false)
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const orders = useOrderStore()
const { allOrders: visibleOrders } = useMineOrders()
const pcUsageOpen = ref(false)
const datasetCommerce = useDatasetCommerceStore()
const spaceIntents = useSpaceIntentStore()
const listingRequests = useListingRequestStore()
const trustedSpaceCatalog = useTrustedSpaceCatalogStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const isDelisted = computed(() => !!product.value && [product.value.availability, product.value.status].some(status => status === 'delisted' || status === 'paused'))
const title = computed(() => product.value?.name ?? '')
const topicTags = computed(() => (product.value ? productTopicTags(product.value) : []))
const listChips = computed(() => (product.value ? productListChips(product.value) : null))
const trialChips = computed(() => (product.value ? productTrialChips(product.value) : []))

const originLabels: Record<string, string> = {
  app_content: '自营产品',
  asset_platform: '资产平台',
  trusted_space: '可信空间',
  seller_market: '入驻商家',
  user_created: '个人创建'
}
const statusLabels: Record<string, string> = {
  candidate: '可申请上架',
  preparing: '准备中',
  paused: '已下架',
  delisted: '已下架'
}
const heroStatusLine = computed(() => {
  const p = product.value
  if (!p) return ''
  // 对齐设计稿：模块入口 | 销售状态（若有）| 支付/交付方式
  const parts = [p.type === 'dataset' ? '用数' : '看数']
  const status = isDelisted.value ? undefined : statusLabels[p.availability]
  if (status) parts.push(status)
  parts.push(p.publicDataset || catalog.resourceById(p.resourceId)?.publicDatasetMetadata ? '公开数据集' : p.dealChannel === 'space_purchase' ? '可信空间交付' : 'App支付')
  return parts.join('  |  ')
})

interface HeroMetric { value: string; label: string }
const heroMetrics = computed<HeroMetric[]>(() => {
  const p = product.value
  if (!p || p.type === 'dataset') return []
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
const serviceExpired = computed(() => {
  if (!product.value) return false
  return hasExpiredEnterpriseProductEntitlement(
    entitlements.list,
    product.value.id,
    user.context.currentEnterpriseId
  )
})
const publicDataset = computed(() => !!product.value && isPublicDatasetEntry(product.value, catalog.resourceById(product.value.resourceId)))
const datasetRetentionNotice = computed(() => product.value && datasetCommerce.canUsePurchasedDataset(product.value)
  ? purchasedDatasetRetentionNotice(product.value, serviceExpired.value) : undefined)
const publicUseIssue = computed(() => publicDataset.value ? publicDatasetUseIssue(product.value, catalog.resourceById(product.value!.resourceId), {
  loggedIn: user.context.loggedIn,
  enterpriseAuthenticated: user.isEnterpriseAuthenticated,
  activeEnterpriseMember: !!user.currentEnterpriseMember,
  hasTeamMembership: entitlements.hasTeamMembership && entitlements.currentMemberTier !== null
}) : undefined)
const v102Trade = computed(() => {
  if (!product.value || (product.value.type === 'api' && product.value.dealChannel !== 'space_purchase')) return null
  const trade = resolveV102Trade(product.value, {
      isTeam: user.isEnterpriseAuthenticated,
      hasMembership: entitlements.hasTeamMembership,
      hasAccess: user.isEnterpriseAuthenticated && !serviceExpired.value && (isPurchasedDataset(product.value)
        ? datasetCommerce.canUsePurchasedDataset(product.value) : owned.value),
      hasHistoricalDataAccess: datasetCommerce.canUsePurchasedDataset(product.value),
      purchaseInProgress: purchaseInProgress.value,
      hasOrderHistory: orders.list.some(order => order.productId === id.value && order.ownerType === 'enterprise' && order.ownerId === user.context.currentEnterpriseId)
        || spaceIntents.list.some(intent => intent.productId === id.value && intent.enterpriseId === user.context.currentEnterpriseId),
      serviceExpired: serviceExpired.value
    })
  if (publicDataset.value) return {
    ...trade,
    status: publicUseIssue.value || '会员免费可用',
    note: publicUseIssue.value || trade.note,
    action: publicUseIssue.value
      ? { key: 'unavailable' as const, label: isDelisted.value ? 'PC端使用' : '暂不可用', disabled: true }
      : { key: 'use_dataset' as const, label: 'PC端使用' },
    secondaryAction: undefined
  }
  return {
    ...trade,
    action: trade.action.key === 'use_dataset' ? { ...trade.action, label: 'PC端使用' } : trade.action,
    secondaryAction: trade.secondaryAction?.key === 'use_dataset' ? { ...trade.secondaryAction, label: 'PC端使用' } : trade.secondaryAction
  }
})
const pcDatasetUseAvailable = computed(() => !isDelisted.value && [v102Trade.value?.action, v102Trade.value?.secondaryAction].some(action => action?.key === 'use_dataset' && !action.disabled))
const pcDatasetMessage = computed(() => serviceExpired.value
  ? '请登录PC端，前往「用数」模块查看已交付数据。更新服务已到期，保留快照可按原授权继续使用。'
  : '当前数据集已可使用，请登录PC端，前往「用数」模块查看和使用。')
const detailPrice = computed(() => {
  if (!product.value || owned.value || purchaseInProgress.value) return null
  return productDetailPriceSummary(product.value, purchaseSubject.value)
})
const currentCommerceOffers = computed(() =>
  commerceOffers.value.filter((offer) => offer.subject === purchaseSubject.value)
)
const contentUnlocked = computed(() => {
  if (isDelisted.value && product.value?.type === 'dashboard') return false
  if (!product.value) return false
  if (product.value.type === 'dashboard' && serviceExpired.value
    && product.value.price.model !== 'member_free' && !product.value.acquisitions.includes('free')) return false
  if (product.value.acquisitions.includes('free')) return true
  return owned.value
})

const datasetEntryUrl = computed(() => {
  const current = product.value
  if (!current || current.type !== 'dataset' || current.origin !== 'asset_platform' || !owned.value) return undefined
  const today = shanghaiDate()
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

function mapV102Action(action: V102TradeAction, current: Product): ProductAction {
  const key: ProductActionKey = action.key === 'create_order'
    ? (current.type === 'dataset' && current.origin === 'asset_platform' ? 'dataset_purchase' : 'item_purchase')
    : action.key === 'apply' ? 'submit_space_intent'
      : action.key === 'open_membership' ? 'member_purchase'
        : action.key === 'continue_order' ? 'continue_payment'
          : action.key === 'view_order' ? 'delivery_progress'
            : action.key === 'view_intent' ? 'intent_progress'
              : action.key === 'use_dataset' || action.key === 'use_content' ? 'view' : 'unavailable'
  return { key, label: action.label === '¥0 下单' ? '确认下单' : action.label, disabled: action.disabled }
}

function v102ActionForProductAction(key: ProductActionKey): V102TradeAction | undefined {
  const current = product.value
  const trade = v102Trade.value
  if (!current || !trade) return undefined
  return [trade.action, trade.secondaryAction]
    .filter((action): action is V102TradeAction => Boolean(action))
    .find((action) => mapV102Action(action, current).key === key)
}

const actions = computed<{ primary: ProductAction; secondary?: ProductAction } | null>(() => {
  const current = product.value
  if (!current) return null
  if (v102Trade.value) {
    return {
      primary: mapV102Action(v102Trade.value.action, current),
      secondary: v102Trade.value.secondaryAction
        ? mapV102Action(v102Trade.value.secondaryAction, current)
        : undefined
    }
  }
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
      : { ...resolved, primary: { key: 'delivery_progress', label: '查看订单' } }
  }
  return resolved
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
  if (product.value.type === 'dataset' && isSpaceSyncedProduct(product.value)) {
    return tabsByType.dataset.filter((tab) => tab.key === 'basic' || tab.key === 'fields')
  }
  if (product.value.type === 'api' && isSpaceSyncedProduct(product.value)) {
    return tabsByType.api.filter((tab) => tab.key !== 'sandbox' && tab.key !== 'sla')
  }
  if (product.value.type === 'dashboard' && product.value.origin === 'app_content') {
    return tabsByType.dashboard.filter((tab) => tab.key !== 'updates')
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
  membershipOpen.value = true
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

function goInProgressOrder(orderId: string, continuePayment = false) {
  const order = orders.list.find((item) => item.id === orderId)
  if (continuePayment && order && canContinueOrderPayment(order) && order.productType === 'dataset') {
    void router.push(`/app/payment/dataset/${orderId}`)
    return
  }
  void router.push(`/app/mine/orders/app/${orderId}`)
}

function handleAction(key: ProductActionKey) {
  if (isDelisted.value) return
  const tradeAction = v102ActionForProductAction(key)
  switch (key) {
    case 'view':
    case 'free_view':
      if (tradeAction?.key === 'use_dataset') {
        if (publicDataset.value && publicUseIssue.value) return
        if (product.value && isPurchasedDataset(product.value) && !datasetCommerce.canUsePurchasedDataset(product.value)) return
        pcUsageOpen.value = true
        break
      }
      if (tradeAction?.key === 'use_content') {
        if (product.value) router.push(dashboardEntryPath(product.value, 'app'))
        break
      }
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
      if (tradeAction?.label === '前往订单') {
        const matching = visibleOrders.value.filter(item => item.productId === id.value)
        const order = matching.find(item => item.source !== 'intent' && ['paid', 'entitled', 'delivered'].includes(item.filter)) || matching[0]
        void router.push(order ? `/app/mine/orders/${order.source}/${order.id}` : { path: '/app/mine', query: { menu: 'orders', orderTab: 'buy' } })
        break
      }
      const phase = purchaseInProgress.value
      if (phase && (phase.phase === 'pending_payment' || phase.phase === 'fulfilling')) {
        goInProgressOrder(phase.orderId, tradeAction?.key === 'continue_order' && phase.phase === 'pending_payment' && phase.canPay)
        break
      }
      if (tradeAction?.key === 'view_order') {
        router.push(productOrderEntry(visibleOrders.value, id.value, 'app'))
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
      } else if (tradeAction?.key === 'view_intent') {
        const order = visibleOrders.value.find(item => item.productId === id.value)
        void router.push(order ? `/app/mine/orders/${order.source}/${order.id}` : { path: '/app/mine', query: { menu: 'orders', orderTab: 'buy' } })
      }
      break
    }
  }
}
</script>

<template>
  <ReportPlaceholder v-if="product?.type === 'report'" :name="product.name" />
  <div v-else-if="product" class="min-h-full bg-ink-100 pb-48">
    <!-- 蓝色 Hero（对齐 App 设计稿：状态行 + 标题 + 半透明标签 + 关键指标卡） -->
    <div class="relative overflow-hidden bg-gradient-to-br from-[#2B66F5] via-[#3370F7] to-[#5290FF]">
      <div class="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10"></div>
      <div class="pointer-events-none absolute -right-6 top-12 h-24 w-24 rounded-full border-[10px] border-white/10"></div>

      <MobileHeader title="详情" tone="light" />

      <div class="px-4 pb-3">
        <div class="text-[11px] leading-4 text-white/70">{{ heroStatusLine }}</div>
        <div class="mt-1 flex flex-wrap items-center gap-3"><div class="text-[21px] font-bold leading-7 text-white">{{ title }}</div><ProductDelistedStamp v-if="isDelisted" /><ProductExpiredStamp v-if="v102Trade?.status.includes('已到期')" :dataset="!!product && isPurchasedDataset(product)" /></div>

        <!-- 标签行：半透明白胶囊，单行横滑（对齐设计稿） -->
        <div v-if="listChips" data-testid="product-chips" class="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ listChips.typeLabel }}</span>
          <span v-if="listChips.venue" class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ listChips.venue.name }}</span>
          <span v-if="listChips.ops && !isDelisted" class="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-medium leading-4 text-white">{{ listChips.ops.label }}</span>
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
    <div v-if="datasetRetentionNotice || (product.serviceStatus && product.serviceStatus !== 'normal')" class="px-4 pt-2">
      <p v-if="datasetRetentionNotice" role="status" data-testid="dataset-retention-notice" class="rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">{{ datasetRetentionNotice }}</p>
      <ServiceStatusNotice v-else :availability="product.availability" :service-status="product.serviceStatus" :has-access="owned" />
    </div>

    <DatasetPcUsageNotice v-if="pcDatasetUseAvailable" :open="pcUsageOpen" :message="pcDatasetMessage" @close="pcUsageOpen = false" />

    <!-- 内容优先：蓝头下直接进入样例、接口、阅读或看板预览。 -->
    <ProductDetailTabs v-model="activeTab" :tabs="currentTabs" />

    <!-- Tab 内容（与上方 Tab 白卡连体） -->
    <div class="mx-4 rounded-b-2xl bg-white p-4 shadow-card">
      <ProductPricingDetails v-if="isOverviewTab" :product="product" />
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
          <DashboardDetail :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" :expired="serviceExpired" />
        </div>

        <ProductInfoSections :product="product" variant="mobile" :compact-dataset="product.type === 'dataset'" :compact-dashboard="product.type === 'dashboard' && product.origin === 'app_content'" :api-detail="product.type === 'api'" data-testid="product-basic-info" />

        <div v-if="product.type === 'dataset' || product.type === 'api' || product.type === 'dashboard' && product.origin === 'app_content'" class="divide-y divide-dashed divide-ink-100 text-[13px] leading-relaxed" data-testid="product-manual">
          <div class="text-[13px] font-semibold text-ink-900">商品说明书</div>
          <div v-for="item in [
            { label: '价值主张', value: product.valueProposition },
            { label: '详细描述', value: product.description },
            { label: '质量承诺', value: product.qualityPromise },
            { label: '合规声明', value: product.complianceNote }
          ]" :key="item.label" class="py-2.5">
            <div class="text-ink-400">{{ item.label }}</div>
            <div class="mt-1 whitespace-pre-line text-ink-700">{{ item.value || '—' }}</div>
          </div>
        </div>
        <div v-else class="space-y-2 text-[13px] leading-relaxed" data-testid="product-manual">
          <div class="text-[13px] font-semibold text-ink-900">商品说明书</div>
          <div><span class="text-ink-400">价值主张：</span><span class="text-ink-700">{{ product.valueProposition }}</span></div>
          <div><span class="text-ink-400">详细描述：</span><span class="text-ink-700">{{ product.description }}</span></div>
          <div><span class="text-ink-400">质量/服务承诺：</span><span class="text-ink-700">{{ product.qualityPromise }}</span></div>
          <div><span class="text-ink-400">合规声明：</span><span class="text-ink-700">{{ product.complianceNote }}</span></div>
        </div>
        <ApiSupportingFiles v-if="product.type === 'api'" :product="product" compact />

        <!-- 产品介绍（空间同步富文本） -->
        <div v-if="product.type !== 'dataset' && product.type !== 'api' && product.spaceMeta?.productIntroduction" class="space-y-1.5">
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
      <DashboardDetail v-else-if="product.type === 'dashboard' && activeTab !== 'overview'" :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" :expired="serviceExpired" />
      <div v-else-if="product.type !== 'dataset' && product.type !== 'dashboard'" class="py-8 text-center text-[13px] text-ink-400">资料准备中</div>
    </div>

    <div
      v-if="!v102Trade && product.dealChannel === 'space_purchase' && !owned"
      class="mx-4 mt-3 rounded-2xl bg-brand-50 p-4"
      data-testid="trusted-space-purchase-eligibility"
    >
      <div class="text-[13px] font-semibold text-brand-700">{{ SPACE_TRIAL_APPLY_LABEL }}</div>
      <div class="mt-1 text-[11px] leading-relaxed text-brand-700/80">{{ USER_INTENT_HINT }}</div>
    </div>

    <!-- 已拥有权益 -->
    <div v-if="!v102Trade && owned" class="mx-4 mt-3 rounded-2xl bg-success-50 p-4" data-testid="product-entitlement-summary">
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

    <p v-if="publicUseIssue && !isDelisted" role="alert" data-testid="public-use-unavailable" class="mx-4 mt-4 border-l-2 border-warning-500 bg-warning-50 p-3 text-sm text-ink-700">{{ publicUseIssue }}</p>

    <ProductPrimaryAction
      v-if="actions && !isDelisted"
      :primary="actions.primary"
      :secondary="actions.secondary"
      :favorite="product.favorite"
      @action="handleAction"
      @toggle-favorite="toggleFav"
    />
  </div>
  <div v-else class="p-6 text-center text-sm text-ink-400">商品不存在</div>
  <MembershipOpeningDialog v-model:open="membershipOpen" />
</template>
