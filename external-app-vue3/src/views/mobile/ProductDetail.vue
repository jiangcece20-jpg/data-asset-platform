<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { typeMeta, dealChannelMeta, originMeta, listedAtOf } from '@/utils/productMeta'
import ProductDetailTabs, { type DetailTab } from '@/components/mobile/product-detail/ProductDetailTabs.vue'
import InfoGrid, { type InfoItem } from '@/components/mobile/product-detail/InfoGrid.vue'
import ProductPrimaryAction from '@/components/mobile/product-detail/ProductPrimaryAction.vue'
import DatasetDetail from '@/components/mobile/product-detail/DatasetDetail.vue'
import ApiDetail from '@/components/mobile/product-detail/ApiDetail.vue'
import ReportDetail from '@/components/mobile/product-detail/ReportDetail.vue'
import DashboardDetail from '@/components/mobile/product-detail/DashboardDetail.vue'
import ServiceStatusNotice from '@/components/mobile/ServiceStatusNotice.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useListingRequestStore } from '@/stores/listingRequests'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { resolveProductActions, type ProductActionKey } from '@/domain/productAccess'
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

const actions = computed(() => product.value ? resolveProductActions({
  type: product.value.type,
  availability: product.value.availability,
  acquisitions: product.value.acquisitions,
  hasAccess: owned.value,
  hasOpenListingRequest: hasOpenListingRequest.value,
  enterpriseAuthenticated: user.isEnterpriseAuthenticated,
  serviceStatus: product.value.serviceStatus,
  trustedPurchaseCheck: trustedPurchaseCheck.value,
}) : null)

const tabsByType: Record<ProductType, DetailTab[]> = {
  dataset: [
    { key: 'basic', label: '基本信息' },
    { key: 'fields', label: '字段信息' },
    { key: 'samples', label: '样例数据' },
    { key: 'profiling', label: '探查报告' }
  ],
  api: [
    { key: 'basic', label: '基本信息' },
    { key: 'docs', label: '接口文档' },
    { key: 'sandbox', label: '在线调试' },
    { key: 'sla', label: '错误码与 SLA' }
  ],
  report: [
    { key: 'overview', label: '报告介绍' },
    { key: 'catalog', label: '目录' },
    { key: 'reader', label: '在线阅读' }
  ],
  dashboard: [
    { key: 'overview', label: '基本信息' },
    { key: 'preview', label: '看板预览' },
    { key: 'metrics', label: '指标定义' },
    { key: 'updates', label: '更新与导出' }
  ]
}

/** 概览页公共基础信息，按两列信息表展示 */
const baseInfoItems = computed<InfoItem[]>(() => {
  const p = product.value
  if (!p) return []
  return [
    { label: '供应方', value: p.provider },
    { label: '更新频率', value: p.updateFrequency },
    { label: '覆盖范围', value: p.coverage },
    { label: '交付方式', value: p.deliveryMethod },
    { label: '来源', value: originMeta[p.origin] },
    { label: '上架时间', value: listedAtOf(p) }
  ]
})

const currentTabs = computed(() => (product.value ? tabsByType[product.value.type] : []))
const activeTab = ref('basic')

/** 是否存在声明信息链接 */
const hasDeclarations = computed(() => {
  const m = product.value?.spaceMeta
  if (!m) return false
  return !!(m.complianceDeclarationUrl || m.dataSourceDeclarationUrl || m.dataSampleUrl || m.securityClassificationUrl || m.qualityAssessmentUrl)
})
// 第一个 tab（基本信息/概览）：在此并入「商品说明书」，避免单独一张卡把 tab 挤到下面
const isOverviewTab = computed(() => currentTabs.value.length > 0 && activeTab.value === currentTabs.value[0].key)

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
    case 'view': router.push('/app/mine'); break
    case 'free_view': router.push('/app/mine'); break
    case 'enterprise_auth': goEnterpriseAuth(); break
    case 'space_purchase': goSpace(); break
    case 'member_purchase': goMember(); break
    case 'item_purchase': goItem(); break
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
        <div class="mt-1 text-[13px] text-slate-500">{{ product.subtitle }}</div>
      </div>
    </div>

    <!-- Service status notice -->
    <div v-if="product.serviceStatus !== 'normal' || product.availability === 'paused' || product.availability === 'delisted'" class="px-4 pt-2">
      <ServiceStatusNotice :availability="product.availability" :service-status="product.serviceStatus" :has-access="owned" />
    </div>

    <!-- Tab 导航（紧跟摘要卡，吸附在头部下方） -->
    <ProductDetailTabs v-model="activeTab" :tabs="currentTabs" class="mt-3" />

    <!-- Tab 内容 -->
    <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <!-- 概览页：基础信息 + 商品说明书（从 hero 下沉至此） -->
      <div v-if="isOverviewTab" class="mb-4 space-y-4 border-b border-slate-100 pb-4">
        <!-- dataset 类型的基础信息已合并到 DatasetDetail 中，此处跳过 -->
        <div v-if="product.type !== 'dataset'">
          <div class="mb-2 text-[13px] font-semibold text-slate-800">基础信息</div>
          <InfoGrid :items="baseInfoItems" />
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-for="s in product.scenarios" :key="s" class="tag-chip">{{ s }}</span>
          </div>
          <div v-if="product.spaceProductNo" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
            空间商品编号 {{ product.spaceProductNo }}（只读，来自可信空间，同步于 {{ product.spaceSyncedAt }}）
          </div>
        </div>

        <div class="space-y-2 text-[13px] leading-relaxed">
          <div class="text-[13px] font-semibold text-slate-800">商品说明书</div>
          <div><span class="text-slate-400">价值主张：</span><span class="text-slate-700">{{ product.valueProposition }}</span></div>
          <div><span class="text-slate-400">详细描述：</span><span class="text-slate-700">{{ product.description }}</span></div>
          <div><span class="text-slate-400">质量/服务承诺：</span><span class="text-slate-700">{{ product.qualityPromise }}</span></div>
          <div><span class="text-slate-400">合规声明：</span><span class="text-slate-700">{{ product.complianceNote }}</span></div>
        </div>

        <!-- 声明信息（仅空间商品且有数据时展示） -->
        <div v-if="product.spaceMeta && hasDeclarations" class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-[12px] font-semibold text-slate-800">声明信息</span>
            <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[12px]">
            <a v-if="product.spaceMeta.complianceDeclarationUrl" :href="product.spaceMeta.complianceDeclarationUrl" target="_blank" class="text-blue-600">合法合规声明 →</a>
            <a v-if="product.spaceMeta.dataSourceDeclarationUrl" :href="product.spaceMeta.dataSourceDeclarationUrl" target="_blank" class="text-blue-600">数据来源声明 →</a>
            <a v-if="product.spaceMeta.dataSampleUrl" :href="product.spaceMeta.dataSampleUrl" target="_blank" class="text-blue-600">数据样例 →</a>
            <a v-if="product.spaceMeta.securityClassificationUrl" :href="product.spaceMeta.securityClassificationUrl" target="_blank" class="text-blue-600">安全分类分级 →</a>
            <a v-if="product.spaceMeta.qualityAssessmentUrl" :href="product.spaceMeta.qualityAssessmentUrl" target="_blank" class="col-span-2 text-blue-600">数据质量评估报告 →</a>
          </div>
        </div>

        <!-- 提供方信息（仅空间商品且有提供方名称时展示） -->
        <div v-if="product.spaceMeta?.providerName" class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-[12px] font-semibold text-slate-800">提供方信息</span>
            <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
          </div>
          <div class="space-y-1 text-[12px] text-slate-700">
            <div><span class="text-slate-400">提供方：</span>{{ product.spaceMeta.providerName }}</div>
            <div v-if="product.spaceMeta.providerEntityType"><span class="text-slate-400">主体类型：</span>{{ product.spaceMeta.providerEntityType }}</div>
            <div v-if="product.spaceMeta.providerEntityInfo"><span class="text-slate-400">主体信息：</span>{{ product.spaceMeta.providerEntityInfo }}</div>
            <div v-if="product.spaceMeta.providerBrief"><span class="text-slate-400">简介：</span>{{ product.spaceMeta.providerBrief }}</div>
            <a v-if="product.spaceMeta.authorizationLetterUrl" :href="product.spaceMeta.authorizationLetterUrl" target="_blank" class="text-blue-600">授权委托书 →</a>
          </div>
        </div>
      </div>

      <DatasetDetail v-if="product.type === 'dataset'" :product="product" :active-tab="activeTab as any" :base-info-items="baseInfoItems" />
      <ApiDetail v-else-if="product.type === 'api'" :product="product" :active-tab="activeTab as any" />
      <ReportDetail
        v-else-if="product.type === 'report'"
        :product="product"
        :active-tab="activeTab as any"
        :unlocked="contentUnlocked"
        @unlock="handleUnlock"
      />
      <DashboardDetail v-else-if="product.type === 'dashboard'" :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" />
      <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
    </div>

    <!-- 已拥有权益 -->
    <div v-if="owned" class="mx-4 mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div class="text-[13px] font-semibold text-emerald-700">
        ✅ {{ access === 'member' ? '会员权益已覆盖' : access === 'item' ? '已单独购买' : '企业席位已授权' }}
      </div>
      <div class="mt-1 text-[12px] text-emerald-600">可直接查看完整内容 / 在线看板 / 调用测试</div>
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
