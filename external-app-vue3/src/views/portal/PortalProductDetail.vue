<script setup lang="ts">
import MembershipOpeningDialog from '@/components/shared/MembershipOpeningDialog.vue'
import { productOrderEntry } from '@/domain/productOrderEntry'
import { canContinueOrderPayment } from '@/domain/productAccess'
import ProductExpiredStamp from '@/components/shared/ProductExpiredStamp.vue'
import ProductDelistedStamp from '@/components/shared/ProductDelistedStamp.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductPricingDetails from '@/components/shared/ProductPricingDetails.vue'
import ProductTypeIcon from '@/components/shared/ProductTypeIcon.vue'
import PortalDetailTabs, { type DetailTab } from './components/PortalDetailTabs.vue'
import PortalPurchasePanel from './components/PortalPurchasePanel.vue'
import PortalDatasetDetail from './components/PortalDatasetDetail.vue'
import PortalApiDetail from './components/PortalApiDetail.vue'
import PortalReportDetail from './components/PortalReportDetail.vue'
import PortalDashboardDetail from './components/PortalDashboardDetail.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { usePortalPurchaseStore } from '@/stores/portalPurchase'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { isPublicDatasetEntry, publicDatasetEntry, publicDatasetUseIssue, isPurchasedDataset, purchasedDatasetEntry, purchasedDatasetRetentionNotice } from '@/domain/datasetEntry'
import { resolvePurchaseInProgress } from '@/domain/productAccess'
import { hasExpiredEnterpriseProductEntitlement, resolveV102Trade, type V102TradeActionKey } from '@/domain/v102Trade'
import { dashboardEntryPath } from '@/domain/dashboardEntry'
import { startDatasetPayment } from '@/domain/purchaseIdentity'
import { productListChips, productTopicTags } from '@/domain/productListChips'
import { isSpaceSyncedProduct } from '@/domain/productDetailFields'
import { productPriceSummary } from '@/domain/productPriceSummary'
import type { PortalPurchaseAction } from '@/domain/portalPurchase'
import type { ProductType } from '@/types/domain'
import ReportPlaceholder from '@/components/shared/ReportPlaceholder.vue'
import { useMineOrders } from '@/composables/useMineOrders'

const membershipOpen = ref(false)
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()
const purchase = usePortalPurchaseStore()
const entitlements = useEntitlementStore()
const orders = useOrderStore()
const { allOrders: visibleOrders } = useMineOrders()
const spaceIntents = useSpaceIntentStore()
const datasetCommerce = useDatasetCommerceStore()
const trustedSpaceCatalog = useTrustedSpaceCatalogStore()
const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const isDelisted = computed(() => !!product.value && [product.value.availability, product.value.status].some(status => status === 'delisted' || status === 'paused'))
const title = computed(() => product.value?.name ?? '')
const topicTags = computed(() => product.value ? productTopicTags(product.value) : [])
// Hero 标签收敛：类型 + 来源（可信空间等信任信息）+ 至多 1 个运营标签
const heroTags = computed<string[]>(() => {
  const p = product.value
  if (!p) return []
  const chips = productListChips(p)
  const tags = [chips.typeLabel]
  if (chips.venue) tags.push(chips.venue.name)
  if (chips.ops && !isDelisted.value) tags.push(chips.ops.label)
  return tags.slice(0, 3)
})
// 头部起步价锚点（右栏购买卡同步展示）
const priceSummary = computed(() => product.value ? productPriceSummary(product.value) : null)
const access = computed(() => {
  if (!product.value || !user.context.loggedIn) return 'none'
  if (purchase.hasItem(product.value)) return purchase.subject === 'enterprise' ? 'enterprise' : 'item'
  return purchase.memberFree(product.value) ? 'member' : 'none'
})
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
        ? datasetCommerce.canUsePurchasedDataset(product.value)
        : entitlements.accessLevel(product.value) !== 'none' || owned.value),
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
      ? { key: 'unavailable' as const, label: isDelisted.value ? '前往用数' : '暂不可用', disabled: true }
      : { key: 'use_dataset' as const, label: '前往用数' },
    secondaryAction: undefined
  }
  return trade
})
const contentUnlocked = computed(() => {
  if (isDelisted.value && product.value?.type === 'dashboard') return false
  if (product.value?.type === 'dashboard' && serviceExpired.value
    && product.value.price.model !== 'member_free' && !product.value.acquisitions.includes('free')) return false
  return user.context.loggedIn && (owned.value || !!product.value?.acquisitions.includes('free'))
})
const pcActions = computed(() => product.value && !v102Trade.value ? purchase.actions(product.value) : [])
const busy = ref(false)
const loginOpen = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 4000)
}
onUnmounted(() => clearTimeout(toastTimer))

const tabsByType: Record<ProductType, DetailTab[]> = {
  dataset: [
    { key: 'basic', label: '基本信息' }, { key: 'samples', label: '样例数据' },
    { key: 'fields', label: '字段信息' }, { key: 'profiling', label: '探查报告' }
  ],
  api: [
    { key: 'basic', label: '基本信息' }, { key: 'docs', label: '接口文档' },
    { key: 'sandbox', label: '在线调试' }, { key: 'sla', label: '错误码与 SLA' }
  ],
  report: [
    { key: 'preview', label: '报表预览' }, { key: 'reader', label: '在线阅读' },
    { key: 'catalog', label: '目录' }, { key: 'overview', label: '报告介绍' }
  ],
  dashboard: [
    { key: 'preview', label: '看板预览' }, { key: 'metrics', label: '指标定义' },
    { key: 'overview', label: '基本信息' }, { key: 'updates', label: '更新与导出' }
  ]
}
const defaultTabByType: Record<ProductType, string> = { dataset: 'basic', api: 'basic', report: 'reader', dashboard: 'preview' }
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
watch(id, () => {
  if (product.value) activeTab.value = defaultTabByType[product.value.type]
  toast.value = ''
}, { immediate: true })
onMounted(() => {
  if (product.value?.dealChannel === 'space_purchase') void trustedSpaceCatalog.syncAll()
})
function toggleFav() { catalog.toggleFavorite(id.value) }
function handleUnlock() {
  if (v102Trade.value) { void handleV102Action(v102Trade.value.action.key); return }
  const primary = pcActions.value[0]
  if (primary) void handleAction(primary)
}
async function handleV102Action(key: V102TradeActionKey) {
  const p = product.value
  const trade = v102Trade.value
  const selectedAction = trade?.action.key === key
    ? trade.action
    : trade?.secondaryAction?.key === key ? trade.secondaryAction : undefined
  if (!p || !trade || isDelisted.value || !selectedAction || selectedAction.disabled || busy.value) return
  if (!user.context.loggedIn) { loginOpen.value = true; return }
  try {
    if (key === 'create_order') {
      if (p.type === 'dataset' && p.origin === 'asset_platform') {
        const { path } = startDatasetPayment(p.id, true)
        await router.push(path)
      } else {
        await router.push({ path: `/portal/checkout/${p.id}`, query: { pricePath: p.origin === 'seller_market' ? 'item' : 'member' } })
      }
    } else if (key === 'apply') {
      await router.push(`/portal/space-intent/${p.id}`)
    } else if (key === 'open_membership') {
      membershipOpen.value = true
    } else if (key === 'use_dataset') {
      if (publicDataset.value) {
        if (publicUseIssue.value) { notify(publicUseIssue.value); return }
        await router.push(publicDatasetEntry(p, 'portal'))
      } else if (isPurchasedDataset(p)) {
        if (!datasetCommerce.canUsePurchasedDataset(p)) return
        await router.push(purchasedDatasetEntry(p.id, 'portal'))
      } else await router.push(`/portal/use/dataset/${p.id}`)
    } else if (key === 'use_content') {
      await router.push(dashboardEntryPath(p, 'portal'))
    } else if (key === 'view_intent') {
      if (purchaseInProgress.value?.phase === 'space_intent') {
        await router.push(`/portal/mine/orders/intent/${purchaseInProgress.value.intentId}`)
      } else {
        const order = visibleOrders.value.find(item => item.productId === id.value)
        await router.push(order ? `/portal/mine/orders/${order.source}/${order.id}` : { path: '/portal/mine', query: { menu: 'orders', orderTab: 'buy' } })
      }
    } else if (key === 'view_order' && selectedAction.label === '前往订单') {
      const matching = visibleOrders.value.filter(item => item.productId === id.value)
      const order = matching.find(item => item.source !== 'intent' && ['paid', 'entitled', 'delivered'].includes(item.filter)) || matching[0]
      await router.push(order ? `/portal/mine/orders/${order.source}/${order.id}` : { path: '/portal/mine', query: { menu: 'orders', orderTab: 'buy' } })
    } else if (['continue_order', 'view_order'].includes(key) && purchaseInProgress.value && purchaseInProgress.value.phase !== 'space_intent') {
      const orderId = purchaseInProgress.value.orderId
      const order = orders.list.find((item) => item.id === orderId)
      const canPayDataset = key === 'continue_order' && order && canContinueOrderPayment(order) && order.productType === 'dataset'
      await router.push(canPayDataset ? `/portal/payment/dataset/${orderId}` : `/portal/mine/orders/app/${orderId}`)
    } else if (key === 'view_order') {
      await router.push(productOrderEntry(visibleOrders.value, id.value, 'portal'))
    }
  } catch {
    notify('操作失败，请稍后重试')
  }
}
async function handleAction(action: PortalPurchaseAction) {
  const p = product.value
  if (!p || busy.value) return
  if (p.availability === 'delisted' || p.status === 'delisted') {
    notify('商品已下架，暂不可操作')
    return
  }
  if (!user.context.loggedIn) { loginOpen.value = true; return }
  // Price-only changes use the latest price; a changed action requires another click.
  const current = purchase.actions(p).find((item) => item.key === action.key)
  if (!current || current.disabled) { notify('购买方式已更新，请重新选择'); return }
  const reason = purchase.blockingReason(p, action.key)
  if (reason) { notify(reason); return }
  busy.value = true
  try {
    if (action.key === 'subscribe') {
      membershipOpen.value = true
    } else if (action.key === 'trial') {
      await router.push(`/portal/space-intent/${p.id}`)
    } else if (action.key === 'free') {
      purchase.claimFree(p)
      notify('获取成功')
    } else if (action.key === 'item' || action.key === 'member') {
      if (p.type === 'dataset' && p.origin === 'asset_platform') {
        const { path } = startDatasetPayment(p.id, true, action.key)
        await router.push(path)
      } else {
        await router.push({ path: `/portal/checkout/${p.id}`, query: { pricePath: action.key, skipDual: '1' } })
      }
    } else if (action.key === 'listing') {
      await router.push(p.availability === 'candidate' ? `/app/listing-request/${p.id}` : '/portal/mine?menu=favorites')
    }
  } catch {
    notify('操作失败，请稍后重试')
  } finally {
    busy.value = false
  }
}
function confirmLogin() {
  user.context.loggedIn = true
  loginOpen.value = false
}
</script>

<template>
  <ReportPlaceholder v-if="product?.type === 'report'" :name="product.name" />
  <div v-else-if="product" class="mx-auto max-w-7xl">
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- 左栏：商品头部 + Tab 导航 + Tab 内容 -->
      <div class="min-w-0 space-y-4">
        <!-- 商品头部：紫系通体渐变，与搜索页同源 -->
        <section
          class="relative overflow-hidden rounded-lg border border-violet-100 bg-gradient-to-br from-[#F3F1FF] via-white to-[#FAF3FF] px-7 py-6"
        >
          <div class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl"></div>
          <button
            type="button"
            class="relative inline-flex items-center gap-1 text-xs text-violet-600 transition hover:text-violet-700"
            @click="router.push('/portal/search')"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            返回找数
          </button>
          <div class="relative mt-3 flex items-start gap-4">
            <ProductTypeIcon :type="product.type" :size="52" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-for="(tag, index) in heroTags"
                  :key="tag"
                  class="inline-flex items-center rounded-md px-2 py-0.5 text-xs"
                  :class="index === 0
                    ? 'border border-violet-200 bg-white font-medium text-violet-600'
                    : 'border border-ink-200 bg-white text-ink-600'"
                >{{ tag }}</span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-3"><h1 class="pr-2 text-[22px] font-bold leading-8 text-ink-900">{{ title }}</h1><ProductDelistedStamp v-if="isDelisted" /><ProductExpiredStamp v-if="v102Trade?.status.includes('已到期')" :dataset="!!product && isPurchasedDataset(product)" /></div>
              <p v-if="product.recommendText || product.subtitle" class="mt-1 max-w-3xl truncate text-sm text-ink-600">{{ product.recommendText || product.subtitle }}</p>
              <div v-if="v102Trade" class="mt-2 text-sm font-semibold text-violet-600" data-testid="product-header-price">{{ v102Trade.price }}<span v-if="v102Trade.priceUnit" class="ml-1 text-xs font-normal text-ink-500">{{ v102Trade.priceUnit }}</span></div>
              <div v-else-if="priceSummary && priceSummary.kind !== 'none'" class="mt-2 flex items-baseline gap-1.5" data-testid="product-header-price">
                <template v-if="priceSummary.kind === 'money'">
                  <span class="text-xl font-bold leading-none text-violet-600">{{ priceSummary.text }}</span>
                  <span class="text-xs text-ink-500">{{ priceSummary.suffix }}</span>
                </template>
                <span v-else-if="priceSummary.kind === 'free'" class="text-base font-bold text-violet-600">免费</span>
                <span v-else class="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-600">待报价</span>
                <span v-if="priceSummary.hint" class="text-xs text-ink-500">{{ priceSummary.hint }}</span>
              </div>
              <div v-if="topicTags.length" class="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in topicTags.slice(0, 6)"
                  :key="tag"
                  class="rounded-md bg-white/80 px-2 py-0.5 text-xs text-ink-500 ring-1 ring-ink-100"
                >{{ tag }}</span>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-ink-200 transition hover:border-violet-300 hover:text-violet-600"
              :title="product.favorite ? '取消收藏' : '收藏'"
              @click="toggleFav"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" :fill="product.favorite ? '#FFB400' : 'none'" :stroke="product.favorite ? '#FFB400' : '#86909C'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 17.3-6.2 3.6 1.6-6.9L2 9.2l7-.6L12 2.2l3 6.4 7 .6-5.4 4.8 1.6 6.9z" />
              </svg>
            </button>
          </div>
        </section>

        <p v-if="datasetRetentionNotice" role="status" data-testid="dataset-retention-notice" class="rounded-lg bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600">{{ datasetRetentionNotice }}</p>

        <!-- Tab 导航 + 内容 -->
        <div class="ui-card overflow-hidden">
          <PortalDetailTabs v-model="activeTab" :tabs="currentTabs" class="px-5" />
          <div class="p-5">
            <ProductPricingDetails v-if="activeTab === (['dashboard', 'report'].includes(product.type) ? 'overview' : 'basic')" :product="product" />
            <PortalDatasetDetail
              v-if="product.type === 'dataset'"
              :product="product"
              :active-tab="activeTab"
            />
            <PortalApiDetail
              v-else-if="product.type === 'api'"
              :product="product"
              :active-tab="activeTab"
            />
            <PortalReportDetail
              v-else-if="product.type === 'report'"
              :product="product"
              :active-tab="activeTab"
              :unlocked="contentUnlocked"
              @unlock="handleUnlock"
            />
            <PortalDashboardDetail
              :expired="serviceExpired"
              v-else-if="product.type === 'dashboard'"
              :product="product"
              :active-tab="activeTab"
              :unlocked="contentUnlocked"
            />
            <div v-else class="py-8 text-center text-sm text-ink-500">资料准备中</div>
          </div>
        </div>
      </div>

      <!-- 右栏：sticky 购买面板 -->
      <div>
        <p v-if="publicUseIssue && !isDelisted" role="alert" data-testid="public-use-unavailable" class="mb-3 border-l-2 border-warning-500 bg-warning-50 p-3 text-sm text-ink-700">{{ publicUseIssue }}</p>
        <PortalPurchasePanel
          v-if="!isDelisted"
          :product="product"
          :owned="owned"
          :access="access"
          :actions="pcActions"
          :busy="busy"
          :v102-trade="v102Trade"
          @action="handleAction"
          @v102-action="handleV102Action"
        />
      </div>
    </div>

    <div v-if="toast" role="status" aria-live="polite" class="fixed left-1/2 top-20 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg bg-ink-900/90 px-5 py-3 text-sm text-white shadow-float">{{ toast }}</div>
    <div v-if="loginOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" @click.self="loginOpen = false">
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-login-title" class="w-full max-w-sm rounded-xl bg-white p-6 shadow-float" @keydown.esc="loginOpen = false">
        <h2 id="purchase-login-title" class="text-base font-semibold text-ink-900">登录</h2>
        <p class="mt-3 text-sm text-ink-600">{{ user.context.name }} · {{ user.context.phone }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-sm text-ink-600 transition hover:bg-ink-100" @click="loginOpen = false">取消</button>
          <button data-testid="purchase-login-confirm" class="rounded-md bg-violet-600 px-4 py-2 text-sm text-white transition hover:bg-violet-700" @click="confirmLogin">登录</button>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-ink-500">商品不存在</div>
  <MembershipOpeningDialog v-model:open="membershipOpen" />
</template>
