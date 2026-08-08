<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { typeMeta, dealChannelMeta } from '@/utils/productMeta'
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
import { useListingRequestStore } from '@/stores/listingRequests'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { resolveProductActions, type ProductActionKey } from '@/domain/productAccess'
import { pricingPresentation } from '@/domain/pricingPresentation'
import { commerceOffersOf, offerDescription } from '@/domain/commerceOffers'
import { billingRuleNotes } from '@/domain/productDetailFields'
import type { ProductType } from '@/types/domain'
import type { SpaceBindingStatus } from '@/types/trustedSpace'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const listingRequests = useListingRequestStore()
const trustedSpaceCatalog = useTrustedSpaceCatalogStore()
const trustedPurchase = useTrustedSpacePurchaseStore()
const bindingStatus = ref<SpaceBindingStatus>('unbound')

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const title = computed(() => product.value?.name ?? '')
const pricingInfo = computed(() => product.value ? pricingPresentation(product.value) : undefined)
const commerceOffers = computed(() => product.value ? commerceOffersOf(product.value) : [])
const billingRules = computed(() => billingRuleNotes(product.value))

const access = computed(() => (product.value ? entitlements.accessLevel(product.value) : 'none'))
const owned = computed(() => access.value !== 'none')
const contentUnlocked = computed(() => {
  if (!product.value) return false
  if (product.value.acquisitions.includes('free')) return true
  return owned.value
})

const listingRequest = computed(() => product.value
  ? listingRequests.byProduct(product.value.id, user.context.currentMemberId)
  : undefined)
const hasOpenListingRequest = computed(() =>
  listingRequest.value != null && ['submitted', 'evaluating', 'preparing'].includes(listingRequest.value.status)
)
const trustedPurchaseCheck = computed(() => {
  if (!product.value || product.value.dealChannel !== 'space_purchase') return undefined
  return trustedSpaceCatalog.purchaseCheck(
    product.value.id,
    user.context.enterpriseAuthStatus,
    bindingStatus.value
  )
})

const actions = computed(() => {
  const current = product.value
  if (!current) return null
  let resolved = resolveProductActions({
    type: current.type,
    availability: current.availability,
    acquisitions: current.acquisitions,
    hasAccess: owned.value,
    hasOpenListingRequest: hasOpenListingRequest.value,
    enterpriseAuthenticated: user.isEnterpriseAuthenticated,
    serviceStatus: current.serviceStatus,
    trustedPurchaseCheck: trustedPurchaseCheck.value,
  })
  if (current.dealChannel === 'space_purchase' && !owned.value) {
    if (user.context.enterpriseAuthStatus === 'none') {
      resolved = { primary: { key: 'enterprise_auth', label: '去企业认证' } }
    } else if (user.context.enterpriseAuthStatus === 'pending') {
      resolved = { primary: { key: 'unavailable', label: '企业认证审核中', disabled: true } }
    }
  }
  if (current.type === 'dataset' && current.origin === 'asset_platform' && owned.value) {
    return { ...resolved, primary: { ...resolved.primary, label: '查看我的数据' } }
  }
  return resolved
})

const trustedPurchaseEligibility = computed(() => {
  const current = product.value
  if (!current || current.dealChannel !== 'space_purchase') return null
  if (!user.context.loggedIn) {
    return {
      badge: '未登录',
      tone: 'border-slate-200 bg-slate-50',
      badgeTone: 'bg-slate-200 text-slate-600',
      title: '登录后查看购买资格',
      description: '登录后可继续查看商品信息；正式购买仍需使用已认证企业身份。'
    }
  }
  if (user.context.enterpriseAuthStatus === 'none') {
    return {
      badge: '个人浏览',
      tone: 'border-amber-200 bg-amber-50',
      badgeTone: 'bg-amber-100 text-amber-700',
      title: '当前为个人身份',
      description: '你可以查看商品、价格和公开资料，但可信空间商品仅支持认证企业购买，个人身份不能下单。'
    }
  }
  if (user.context.enterpriseAuthStatus === 'pending') {
    return {
      badge: '认证中',
      tone: 'border-blue-200 bg-blue-50',
      badgeTone: 'bg-blue-100 text-blue-700',
      title: '企业认证审核中',
      description: '审核期间可以继续浏览和收藏；认证通过后返回当前商品继续购买。'
    }
  }
  if (bindingStatus.value !== 'active') {
    return {
      badge: '连接中',
      tone: 'border-blue-200 bg-blue-50',
      badgeTone: 'bg-blue-100 text-blue-700',
      title: '企业信息同步中',
      description: `已认证企业：${user.enterprise.name}。正在建立可信空间企业连接，完成前暂不能下单。`
    }
  }
  return {
    badge: '可购买',
    tone: 'border-emerald-200 bg-emerald-50',
    badgeTone: 'bg-emerald-100 text-emerald-700',
    title: '认证企业购买',
    description: `当前购买企业：${user.enterprise.name}。订单、付款、正式交付和售后由可信空间承接。`
  }
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

const currentTabs = computed(() => (product.value ? tabsByType[product.value.type] : []))
const activeTab = ref('basic')
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
  if (p) activeTab.value = tabsByType[p.type][0].key
}, { immediate: true })

onMounted(() => {
  if (product.value?.dealChannel === 'space_purchase') void trustedSpaceCatalog.syncAll()
  void refreshEnterpriseBinding()
})

function toggleFav() {
  catalog.toggleFavorite(id.value)
}

function goEnterpriseAuth() {
  router.push({ path: '/app/enterprise-auth', query: { redirect: route.fullPath } })
}
async function refreshEnterpriseBinding() {
  if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId) {
    bindingStatus.value = 'unbound'
    return
  }
  const enterpriseId = user.context.currentEnterpriseId
  const operatorMemberId = user.context.currentMemberId
  const enterpriseContextGeneration = user.enterpriseContextGeneration
  try {
    const binding = await trustedSpaceAdapter.ensureEnterpriseBinding(enterpriseId)
    if (
      user.enterpriseContextGeneration !== enterpriseContextGeneration
      || user.context.enterpriseAuthStatus !== 'authenticated'
      || user.context.currentEnterpriseId !== enterpriseId
      || user.context.currentMemberId !== operatorMemberId
      || !user.enterpriseMemberFor(enterpriseId, operatorMemberId)
      || binding.appEnterpriseId !== enterpriseId
    ) {
      bindingStatus.value = 'failed'
      return
    }
    trustedPurchase.upsertBinding(binding)
    bindingStatus.value = binding.status
  } catch {
    bindingStatus.value = 'failed'
  }
}

async function goSpace() {
  if (!user.isEnterpriseAuthenticated) return goEnterpriseAuth()
  if (!product.value || !user.context.currentEnterpriseId) return
  if (bindingStatus.value !== 'active') await refreshEnterpriseBinding()
  if (bindingStatus.value !== 'active') return
  try {
    const intent = await trustedPurchase.preparePurchase({
      appEnterpriseId: user.context.currentEnterpriseId,
      operatorMemberId: user.context.currentMemberId,
      appProductId: product.value.id,
      enterpriseAuthStatus: user.context.enterpriseAuthStatus,
      returnUrl: route.fullPath
    })
    await router.push({ name: 'space-bridge', params: { id: product.value.id }, query: { intent: intent.id } })
  } catch {
    await refreshEnterpriseBinding()
  }
}
function goMember() {
  router.push({ path: '/app/checkout/member', query: { returnProduct: id.value } })
}
function goItem() {
  router.push(`/app/checkout/item/${id.value}`)
}
/** 报告章节点「阅读」时，走该商品当前可用的解锁路径 */
function handleUnlock() {
  const primary = actions.value?.primary?.key
  if (primary) return handleAction(primary)
  goItem()
}

function handleAction(key: ProductActionKey) {
  switch (key) {
    case 'view':
    case 'free_view':
      router.push(product.value?.type === 'dataset' && product.value.origin === 'asset_platform'
        ? { path: '/app/mine', query: { tab: '我的数据' } }
        : '/app/mine')
      break
    case 'enterprise_auth': goEnterpriseAuth(); break
    case 'space_purchase': goSpace(); break
    case 'member_purchase': goMember(); break
    case 'item_purchase': goItem(); break
    case 'dataset_purchase': router.push(`/app/checkout/dataset/${id.value}`); break
    case 'request_listing': router.push(`/app/listing-request/${id.value}`); break
    case 'listing_progress': router.push({ path: '/app/mine', query: { tab: '求上架' } }); break
  }
}
</script>

<template>
  <div v-if="product" class="min-h-full bg-slate-50 pb-28">
    <MobileHeader :title="title">
      <button class="text-lg" :class="product.favorite ? 'text-amber-400' : 'text-slate-200'" @click="toggleFav">★</button>
    </MobileHeader>

    <!-- 精简 Hero：徽标 + 名称 + 一句话 -->
    <div class="px-4 pt-3">
      <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="mb-2 flex flex-wrap items-center gap-1.5">
          <span class="tag-chip">{{ typeMeta[product.type].icon }} {{ typeMeta[product.type].label }}</span>
          <span class="rounded-full px-2 py-0.5 text-xs" :class="dealChannelMeta[product.dealChannel].tone">{{ dealChannelMeta[product.dealChannel].label }}</span>
          <StatusBadge dict="availability" :value="product.availability" />
        </div>
        <div class="text-[17px] font-semibold text-slate-900">{{ title }}</div>
        <div class="mt-1 text-[13px] text-slate-500">{{ product.recommendText || product.subtitle }}</div>
        <div v-if="product.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
          <span v-for="tag in product.tags" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- Service status notice -->
    <div v-if="product.serviceStatus !== 'normal' || product.availability === 'paused' || product.availability === 'delisted'" class="px-4 pt-2">
      <ServiceStatusNotice :availability="product.availability" :service-status="product.serviceStatus" :has-access="owned" />
    </div>

    <!-- 内容优先：标题后直接进入样例、接口、阅读或看板预览。 -->
    <ProductDetailTabs v-model="activeTab" :tabs="currentTabs" class="mt-3" />

    <!-- Tab 内容 -->
    <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <!-- dataset 类型：表格+分类分级放在最前面 -->
      <DatasetDetail v-if="product.type === 'dataset'" :product="product" :active-tab="activeTab as any" />

      <!-- 概览页：基础信息 + 商品说明书（从 hero 下沉至此） -->
      <div
        v-if="isOverviewTab"
        class="space-y-4"
        :class="product.type === 'dataset'
          ? 'mt-4 border-t border-slate-100 pt-4'
          : product.type === 'api'
            ? ''
            : 'mb-4 border-b border-slate-100 pb-4'"
      >
        <!-- 看板关键指标（其余类型的关键指标在各自 tab 内） -->
        <div v-if="product.type === 'dashboard'" data-testid="dashboard-overview-info">
          <div class="mb-2 text-[13px] font-semibold text-slate-800">看板信息</div>
          <DashboardDetail :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" />
        </div>

        <!-- 资源信息 + 合规与授权 + 提供方 -->
        <ProductInfoSections :product="product" variant="mobile" data-testid="product-basic-info" />

        <div class="space-y-2 text-[13px] leading-relaxed" data-testid="product-manual">
          <div class="text-[13px] font-semibold text-slate-800">商品说明书</div>
          <div><span class="text-slate-400">价值主张：</span><span class="text-slate-700">{{ product.valueProposition }}</span></div>
          <div><span class="text-slate-400">详细描述：</span><span class="text-slate-700">{{ product.description }}</span></div>
          <div><span class="text-slate-400">质量/服务承诺：</span><span class="text-slate-700">{{ product.qualityPromise }}</span></div>
          <div><span class="text-slate-400">合规声明：</span><span class="text-slate-700">{{ product.complianceNote }}</span></div>
        </div>

        <!-- 产品介绍（空间同步富文本） -->
        <div v-if="product.spaceMeta?.productIntroduction" class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-semibold text-slate-800">产品介绍</span>
            <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
          </div>
          <p class="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{{ product.spaceMeta.productIntroduction }}</p>
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
      <div v-else-if="product.type !== 'dataset' && product.type !== 'dashboard'" class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
    </div>

   <!-- 交易承接：用户看过内容后再了解报价、方案与购买资格。 -->
    <div v-if="pricingInfo && !owned" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="pricing-method">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-[11px] text-slate-400">报价方式</div>
          <div class="mt-0.5 text-[14px] font-semibold text-slate-800">{{ pricingInfo.label }}</div>
        </div>
        <span class="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-600">{{ product.dealChannel === 'space_purchase' ? '空间定价' : 'APP 定价' }}</span>
      </div>
      <div class="mt-2 text-[11px] leading-relaxed text-slate-500">{{ pricingInfo.note }}</div>
      <div v-if="billingRules.length" class="mt-2 space-y-1 border-t border-slate-50 pt-2" data-testid="space-billing-rules">
        <div class="text-[10px] text-slate-400">计费规则 · 来自可信空间</div>
        <div v-for="rule in billingRules" :key="rule" class="text-[11px] leading-relaxed text-slate-500">💡 {{ rule }}</div>
      </div>
    </div>

    <div v-if="commerceOffers.length && !owned" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="commerce-offers">
      <div class="mb-2 flex items-center justify-between"><span class="text-[13px] font-semibold text-slate-800">价格方案</span><span class="text-[10px] text-slate-400">{{ product.dealChannel === 'space_purchase' ? '来自可信空间同步' : '购买时可切换主体' }}</span></div>
      <div v-for="offer in commerceOffers" :key="offer.id" class="flex items-center justify-between gap-3 border-t border-slate-50 py-2 first:border-t-0">
        <div><div class="text-[12px] font-medium text-slate-700">{{ offer.name }}</div><div class="mt-0.5 text-[10px] leading-relaxed text-slate-400">{{ offer.subject === 'enterprise' ? '企业' : '个人' }} · {{ offerDescription(offer) }}</div></div>
        <div class="text-[13px] font-semibold text-brand-600">¥{{ offer.price.toLocaleString() }}</div>
      </div>
    </div>

    <div
      v-if="trustedPurchaseEligibility"
      class="mx-4 mt-3 rounded-2xl border p-4"
      :class="trustedPurchaseEligibility.tone"
      data-testid="trusted-space-purchase-eligibility"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="text-[11px] text-slate-500">购买资格</div>
        <span class="rounded-full px-2 py-0.5 text-[10px]" :class="trustedPurchaseEligibility.badgeTone">
          {{ trustedPurchaseEligibility.badge }}
        </span>
      </div>
      <div class="mt-2 text-[13px] font-semibold text-slate-800">{{ trustedPurchaseEligibility.title }}</div>
      <div class="mt-1 text-[11px] leading-relaxed text-slate-600">{{ trustedPurchaseEligibility.description }}</div>
    </div>

    <!-- 已拥有权益 -->
    <div v-if="owned" class="mx-4 mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div class="text-[13px] font-semibold text-emerald-700">
        ✅ {{ product.type === 'dataset' && product.origin === 'asset_platform' ? '已获得数据权益' : access === 'member' ? '会员权益已覆盖' : access === 'item' ? '已单独购买' : '企业席位已授权' }}
      </div>
      <div class="mt-1 text-[12px] text-emerald-600">{{ product.type === 'dataset' && product.origin === 'asset_platform' ? '可在“我的数据”查看交付状态并进入用数模块' : '可直接查看完整内容 / 在线看板 / 调用测试' }}</div>
    </div>

    <!-- API 用量明细 -->
    <div v-if="product.type === 'api' && owned" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4">
      <div class="text-[13px] font-semibold text-slate-800">📊 用量明细</div>
      <div class="mt-2 flex items-center justify-between text-[12px]">
        <div>
          <span class="text-slate-400">本月调用：</span>
          <span class="text-slate-700">-- 次</span>
        </div>
        <button
          class="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] text-brand-600"
          @click="router.push('/app/mine/enterprise/bills')"
        >查看账单详情 →</button>
      </div>
    </div>

    <!-- 底部固定操作区 -->
    <ProductPrimaryAction
      v-if="actions"
      :primary="actions.primary"
      :secondary="actions.secondary"
      @action="handleAction"
    />
  </div>
  <div v-else class="p-6 text-center text-sm text-slate-400">商品不存在</div>
</template>
