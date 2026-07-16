<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductSummaryCard from '@/components/mobile/product-detail/ProductSummaryCard.vue'
import ProductDetailTabs, { type DetailTab } from '@/components/mobile/product-detail/ProductDetailTabs.vue'
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
import { resolveProductActions, type ProductActionKey } from '@/domain/productAccess'
import type { ProductType } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const listingRequests = useListingRequestStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const title = computed(() => (product.value ? catalog.displayTitle(product.value) : ''))

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

const actions = computed(() => product.value ? resolveProductActions({
  type: product.value.type,
  availability: product.value.availability,
  acquisitions: product.value.acquisitions,
  hasAccess: owned.value,
  hasOpenListingRequest: hasOpenListingRequest.value,
  enterpriseAuthenticated: user.isEnterpriseAuthenticated,
  serviceStatus: product.value.serviceStatus,
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
    { key: 'overview', label: '基本信息' },
    { key: 'catalog', label: '目录' },
    { key: 'reader', label: '在线阅读' },
    { key: 'license', label: '授权' }
  ],
  dashboard: [
    { key: 'overview', label: '基本信息' },
    { key: 'preview', label: '看板预览' },
    { key: 'metrics', label: '指标定义' },
    { key: 'updates', label: '更新与导出' }
  ]
}

const currentTabs = computed(() => (product.value ? tabsByType[product.value.type] : []))
const activeTab = ref('basic')

watch(id, () => {
  const p = product.value
  if (p) activeTab.value = tabsByType[p.type][0].key
}, { immediate: true })

function toggleFav() {
  catalog.toggleFavorite(id.value)
}

function goEnterpriseAuth() {
  router.push({ path: '/app/enterprise-auth', query: { redirect: route.fullPath } })
}
function goSpace() {
  if (!user.isEnterpriseAuthenticated) return goEnterpriseAuth()
  router.push(`/app/space-bridge/${id.value}`)
}
function goMember() {
  router.push({ path: '/app/checkout/member', query: { returnProduct: id.value } })
}
function goItem() {
  router.push(`/app/checkout/item/${id.value}`)
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

    <div class="px-4 pt-3">
      <ProductSummaryCard :product="product" :title="title" />
    </div>

    <!-- Service status notice -->
    <div v-if="product.serviceStatus !== 'normal' || product.availability === 'paused' || product.availability === 'delisted'" class="px-4 pt-2">
      <ServiceStatusNotice :availability="product.availability" :service-status="product.serviceStatus" :has-access="owned" />
    </div>

    <!-- 商品说明书 -->
    <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div class="mb-2 text-[13px] font-semibold text-slate-800">商品说明书</div>
      <dl class="space-y-2 text-[13px] leading-relaxed">
        <div><dt class="text-slate-400">价值主张</dt><dd class="text-slate-700">{{ product.valueProposition }}</dd></div>
        <div><dt class="text-slate-400">详细描述</dt><dd class="text-slate-700">{{ product.description }}</dd></div>
        <div><dt class="text-slate-400">质量/服务承诺</dt><dd class="text-slate-700">{{ product.qualityPromise }}</dd></div>
        <div><dt class="text-slate-400">合规声明</dt><dd class="text-slate-700">{{ product.complianceNote }}</dd></div>
      </dl>
    </div>

    <!-- Tab 导航 -->
    <ProductDetailTabs v-model="activeTab" :tabs="currentTabs" />

    <!-- Tab 内容 -->
    <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <DatasetDetail v-if="product.type === 'dataset'" :product="product" :active-tab="activeTab as any" />
      <ApiDetail v-else-if="product.type === 'api'" :product="product" :active-tab="activeTab as any" />
      <ReportDetail v-else-if="product.type === 'report'" :product="product" :active-tab="activeTab as any" :unlocked="contentUnlocked" />
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
