<script setup lang="ts">
import { useMineOrders } from '@/composables/useMineOrders'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { findDashboardByAssetId } from '@/domain/dashboardEntry'
import { hasExpiredEnterpriseProductEntitlement } from '@/domain/v102Trade'
import ReportPlaceholder from '@/components/shared/ReportPlaceholder.vue'
import PortalDashboardDetail from '@/views/portal/components/PortalDashboardDetail.vue'
import PortalReportDetail from '@/views/portal/components/PortalReportDetail.vue'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const { allOrders } = useMineOrders()
const product = computed(() => route.path.includes('/bi/dashboard/')
  ? findDashboardByAssetId(catalog.products, String(route.params.id))
  : catalog.byId(String(route.params.id)))
const allowed = computed(() => {
  if (!product.value || !user.isEnterpriseAuthenticated) return false
  if (product.value.type === 'report') return false
  if ([product.value.availability, product.value.status].some(status => ['delisted', 'paused'].includes(status))) return false
  if (route.query.orderId) return allOrders.value.some(order => order.id === route.query.orderId
    && order.productId === product.value?.id && order.canUseDashboard)
  if (product.value.type === 'dashboard' && product.value.price.model !== 'member_free'
    && !product.value.acquisitions.includes('free') && hasExpiredEnterpriseProductEntitlement(
      entitlements.list, product.value.id, user.context.currentEnterpriseId
    )) return false
  if (entitlements.accessLevel(product.value) === 'enterprise') return true
  return product.value.acquisitions.includes('free') || product.value.price.model === 'member_free'
    ? entitlements.hasTeamMembership
    : false
})
const expiredOrderEntry = computed(() => !!route.query.orderId && allOrders.value.some(order =>
  order.id === route.query.orderId && order.productId === product.value?.id
  && order.canOpenDashboard && !order.canUseDashboard && order.serviceStatus === '权益已到期'))
const activeTab = ref<'preview' | 'metrics' | 'reader' | 'catalog'>(product.value?.type === 'report' ? 'reader' : 'preview')
const tabs = computed(() => product.value?.type === 'dashboard'
  ? [{ key: 'preview', label: '看板' }, { key: 'metrics', label: '指标定义' }]
  : [{ key: 'reader', label: '在线阅读' }, { key: 'catalog', label: '目录' }])

function selectTab(key: string) {
  if (key === 'preview' || key === 'metrics' || key === 'reader' || key === 'catalog') activeTab.value = key
}
</script>

<template>
  <ReportPlaceholder v-if="product?.type === 'report'" :name="product.name" />
  <main v-else class="mx-auto min-h-full max-w-5xl bg-white px-4 py-5 sm:px-6">
    <button class="text-sm text-brand-600" @click="router.back()">← 返回商品</button>
    <h1 class="mt-4 text-xl font-semibold text-ink-900">{{ product?.name ?? '内容' }}</h1>
    <p class="mt-1 text-sm text-ink-500">看数 · 当前企业权益</p>
    <section v-if="expiredOrderEntry" data-testid="dashboard-no-entitlement-mask" class="relative mt-6 min-h-80 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
      <div aria-hidden="true" class="grid grid-cols-2 gap-5 p-6 opacity-40 blur-sm">
        <div v-for="n in 4" :key="n" class="h-28 rounded-md bg-ink-200" />
      </div>
      <div class="absolute inset-0 flex flex-col items-center justify-center bg-white/75">
        <span class="rounded-md border-2 border-amber-800 bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">已到期</span>
        <h2 class="mt-4 text-lg font-semibold text-ink-900">权益已到期</h2>
        <p class="mt-2 text-sm text-ink-600">当前无查看权益</p>
      </div>
    </section>
    <div v-else-if="!allowed" class="mt-6 rounded-md border border-ink-200 p-5 text-sm text-ink-600">当前身份暂无查看权限。</div>
    <template v-else-if="product">
      <div class="mt-6 flex gap-5 border-b border-ink-200">
        <button v-for="tab in tabs" :key="tab.key" class="border-b-2 px-1 py-2 text-sm" :class="activeTab === tab.key ? 'border-brand-500 font-medium text-brand-600' : 'border-transparent text-ink-500'" @click="selectTab(tab.key)">{{ tab.label }}</button>
      </div>
      <div class="py-5">
        <PortalDashboardDetail v-if="product.type === 'dashboard'" :product="product" :active-tab="activeTab" :unlocked="true" />
        <PortalReportDetail v-else-if="product.type === 'report'" :product="product" :active-tab="activeTab" :unlocked="true" />
      </div>
    </template>
  </main>
</template>
