<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import { typeMeta, dealChannelMeta, originMeta, listedAtOf } from '@/utils/productMeta'
import PortalDetailTabs, { type DetailTab } from './components/PortalDetailTabs.vue'
import PortalPurchasePanel from './components/PortalPurchasePanel.vue'
import PortalDatasetDetail from './components/PortalDatasetDetail.vue'
import PortalApiDetail from './components/PortalApiDetail.vue'
import PortalReportDetail from './components/PortalReportDetail.vue'
import PortalDashboardDetail from './components/PortalDashboardDetail.vue'
import PortalSpaceGateDialog from './components/PortalSpaceGateDialog.vue'
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

/** 与 4 个类型详情组件的 InfoItem 结构兼容 */
interface InfoItem {
  label: string
  value?: string | number | null
  full?: boolean
}

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

/**
 * PC 端按钮层适配（PRD §7.5）：可信空间在售商品对游客/个人用户统一展示
 * 「前往可信空间」，由跳转门禁弹窗分流；企业用户保持 domain 层原逻辑。
 */
const pcActions = computed(() => {
  const p = product.value
  if (!p) return null
  if (
    p.dealChannel === 'space_purchase'
    && !owned.value
    && p.availability === 'published'
    && (p.serviceStatus ?? 'normal') === 'normal'
    && (!user.context.loggedIn || !user.isEnterpriseAuthenticated)
  ) {
    return { primary: { key: 'space_purchase' as const, label: '前往可信空间' } }
  }
  return actions.value
})

/** 可信空间跳转门禁弹窗状态 */
const spaceGate = ref<'login' | 'auth-notice' | 'browse-mock' | null>(null)

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

/** 概览页公共基础信息，传给各类型详情组件的信息网格 */
const baseInfoItems = computed<InfoItem[]>(() => {
  const p = product.value
  if (!p) return []
  const items: InfoItem[] = [
    { label: '供应方', value: p.provider },
    { label: '更新频率', value: p.updateFrequency },
    { label: '覆盖范围', value: p.coverage },
    { label: '交付方式', value: p.deliveryMethod },
    { label: '来源', value: originMeta[p.origin] },
    { label: '上架时间', value: listedAtOf(p) }
  ]
  // 可信空间同步元数据（PRD §11）：合规三要素 + 行业/地域 + 数据规模 + 结构化使用限制
  const m = p.spaceMeta
  if (m) {
    items.push(
      { label: '行业分类', value: m.industryCategory },
      { label: '地域分类', value: m.regionCategory },
      { label: '数据主体', value: m.dataSubject },
      { label: '是否涉及个人信息', value: m.personalInfo == null ? null : (m.personalInfo ? '是' : '否') },
      { label: '授权使用', value: m.authorizedUse == null ? null : (m.authorizedUse ? '是' : '否') },
      { label: '数据规模', value: m.dataVolume }
    )
    if (m.usageRestrictions?.length) {
      items.push({
        label: '使用限制',
        value: m.usageRestrictions.join('、') + (m.restrictionNote ? `；其他说明：${m.restrictionNote}` : ''),
        full: true
      })
    }
  }
  return items
})

const currentTabs = computed(() => (product.value ? tabsByType[product.value.type] : []))
const activeTab = ref('basic')

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
  // 硬门禁：游客先登录（可信空间对游客仅开放 10 条且详情不可达）
  if (!user.context.loggedIn) {
    spaceGate.value = 'login'
    return
  }
  // 软提示：个人用户可浏览，正式采购需企业认证
  if (!user.isEnterpriseAuthenticated) {
    spaceGate.value = 'auth-notice'
    return
  }
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

/** 门禁弹窗：原型模拟登录，登录后自动继续原跳转动作 */
function gateLogin() {
  user.context.loggedIn = true
  spaceGate.value = null
  void goSpace()
}

/** 门禁弹窗：个人用户继续前往浏览（不携带购买意图，原型展示模拟跳转态） */
function gateContinueBrowse() {
  spaceGate.value = 'browse-mock'
}

/** 门禁弹窗：去企业认证 */
function gateGoAuth() {
  spaceGate.value = null
  goEnterpriseAuth()
}

function goMember() {
  router.push({ path: '/app/checkout/member', query: { returnProduct: id.value } })
}
function goItem() {
  router.push(`/portal/checkout/${id.value}`)
}
/** 报告章节点「阅读」时，走该商品当前可用的解锁路径 */
function handleUnlock() {
  const primary = pcActions.value?.primary?.key
  if (primary) return handleAction(primary)
  goItem()
}

function handleAction(key: ProductActionKey) {
  switch (key) {
    case 'view': router.push('/portal/mine'); break
    case 'free_view': router.push('/portal/mine'); break
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
  <div v-if="product" class="mx-auto max-w-7xl">
    <div class="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
      <!-- 左栏：标题卡 + Tab 导航 + Tab 内容 -->
      <div class="min-w-0 space-y-4">
        <!-- 商品标题卡 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">{{ typeMeta[product.type].icon }} {{ typeMeta[product.type].label }}</span>
                <span class="rounded-full px-2 py-0.5 text-xs" :class="dealChannelMeta[product.dealChannel].tone">{{ dealChannelMeta[product.dealChannel].label }}</span>
                <StatusBadge dict="availability" :value="product.availability" />
              </div>
              <h1 class="mt-3 text-xl font-bold text-slate-900">{{ title }}</h1>
              <p class="mt-1 text-sm text-slate-500">{{ product.recommendText || product.subtitle }}</p>
              <div v-if="product.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in product.tags"
                  :key="tag"
                  class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                >{{ tag }}</span>
              </div>
            </div>
            <button
              class="shrink-0 text-xl transition-colors"
              :class="product.favorite ? 'text-amber-400' : 'text-slate-200 hover:text-slate-300'"
              :title="product.favorite ? '取消收藏' : '收藏'"
              @click="toggleFav"
            >★</button>
          </div>
        </div>

        <!-- Tab 导航 + 内容 -->
        <div class="rounded-xl border border-slate-200 bg-white">
          <PortalDetailTabs v-model="activeTab" :tabs="currentTabs" class="px-5" />
          <div class="p-5">
            <PortalDatasetDetail
              v-if="product.type === 'dataset'"
              :product="product"
              :active-tab="activeTab"
              :base-info-items="baseInfoItems"
            />
            <PortalApiDetail
              v-else-if="product.type === 'api'"
              :product="product"
              :active-tab="activeTab"
              :base-info-items="baseInfoItems"
            />
            <PortalReportDetail
              v-else-if="product.type === 'report'"
              :product="product"
              :active-tab="activeTab"
              :unlocked="contentUnlocked"
              :base-info-items="baseInfoItems"
              @unlock="handleUnlock"
            />
            <PortalDashboardDetail
              v-else-if="product.type === 'dashboard'"
              :product="product"
              :active-tab="activeTab"
              :unlocked="contentUnlocked"
              :base-info-items="baseInfoItems"
            />
            <div v-else class="py-8 text-center text-sm text-slate-400">资料准备中</div>
          </div>
        </div>
      </div>

      <!-- 右栏：sticky 购买面板 -->
      <div>
        <PortalPurchasePanel
          :product="product"
          :owned="owned"
          :access="access"
          :actions="pcActions"
          @action="handleAction"
        />
      </div>
    </div>

    <!-- 可信空间跳转门禁弹窗 -->
    <PortalSpaceGateDialog
      v-if="spaceGate"
      :mode="spaceGate"
      @login="gateLogin"
      @continue-browse="gateContinueBrowse"
      @go-auth="gateGoAuth"
      @close="spaceGate = null"
    />
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">商品不存在</div>
</template>
