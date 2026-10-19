<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'
import { isPurchasedDataset, purchasedDatasetRetentionNotice } from '@/domain/datasetEntry'
import { hasExpiredEnterpriseProductEntitlement } from '@/domain/v102Trade'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const commerce = useDatasetCommerceStore()
const user = useUserStore()
const portal = computed(() => route.path.startsWith('/portal'))
const product = computed(() => catalog.byId(String(route.params.id)))
const enterpriseDeliveries = computed(() => commerce.deliveries.filter((item) =>
  item.productId === product.value?.id && item.ownerType === 'enterprise'
  && item.ownerId === user.context.currentEnterpriseId && item.status === 'delivered'
).sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? '')))
function dataVersionTime(value?: string): string {
  return value?.replace('T', ' ').slice(0, 16) || '未返回'
}
const allowed = computed(() => {
  if (!product.value || product.value.type !== 'dataset') return false
  const resource = catalog.resourceById(product.value.resourceId)
  if (product.value.publicDataset || resource?.publicDatasetMetadata) {
    return resource?.sourcePublicDataset === true && resource.sourceDatasetAvailable === true
      && product.value.availability === 'published' && user.isEnterpriseAuthenticated && entitlements.hasTeamMembership
  }
  if (isPurchasedDataset(product.value)) return commerce.canUsePurchasedDataset(product.value)
  return user.isEnterpriseAuthenticated && (entitlements.accessLevel(product.value) === 'enterprise' || enterpriseDeliveries.value.length > 0)
})
const columns = computed(() => product.value?.typeDetail.dataset?.sampleColumns ?? [])
const rows = computed(() => product.value?.typeDetail.dataset?.sampleRows ?? [])
const retentionNotice = computed(() => allowed.value && product.value
  ? purchasedDatasetRetentionNotice(product.value, hasExpiredEnterpriseProductEntitlement(
    entitlements.list, product.value.id, user.context.currentEnterpriseId
  )) : undefined)
const latestDelivery = computed(() => enterpriseDeliveries.value
  .filter((item) => !route.query.order || item.orderId === String(route.query.order))
  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0])

function downloadSample(version?: string) {
  if (!allowed.value || !columns.value.length) return
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [columns.value.join(','), ...rows.value.map((row) => columns.value.map((column) => escape(row[column])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${product.value?.name ?? '数据集'}-${version ?? '当前'}-原型样本.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <main class="mx-auto min-h-full max-w-5xl bg-white px-4 py-5 sm:px-6">
    <button class="text-sm text-brand-600" @click="router.back()">← 返回</button>
    <h1 class="mt-4 text-xl font-semibold text-ink-900">{{ product?.name ?? '数据集' }}</h1>
    <p class="mt-1 text-sm text-ink-500">用数 · {{ product?.publicDataset ? '公开数据集' : '当前企业的数据集' }}</p>
    <div v-if="!allowed" class="mt-6 rounded-md border border-ink-200 p-5 text-sm text-ink-600">当前身份暂无该数据集使用权限。</div>
    <template v-else>
      <p v-if="retentionNotice" role="status" data-testid="dataset-retention-notice" class="mt-5 rounded-lg bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600">{{ retentionNotice }}</p>
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4">
        <div class="text-sm text-ink-600">
          <span v-if="latestDelivery">最近交付 {{ latestDelivery.deliveredAt?.slice(0, 16) }}</span>
          <span v-else-if="product?.publicDataset">当前公开数据 · {{ product?.updateFrequency }}</span>
          <span v-else>已交付数据 · 数据版本时间未返回</span>
        </div>
        <div class="flex items-center gap-3">
          <button v-if="!product?.publicDataset" class="text-sm text-brand-600" @click="router.push(portal ? '/portal/mine?menu=orders' : '/app/mine?menu=orders')">查看我的订单</button>
          <button v-if="product?.publicDataset" class="rounded-md bg-brand-500 px-3 py-2 text-sm text-white" @click="downloadSample()">下载样本 CSV</button>
        </div>
      </div>
      <section v-if="!product?.publicDataset && enterpriseDeliveries.length" class="mt-5">
        <h2 class="text-sm font-semibold text-ink-900">已交付版本</h2>
        <div v-for="delivery in enterpriseDeliveries" :key="delivery.id" class="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 py-2 text-sm" :class="route.query.order === delivery.orderId ? 'bg-brand-50 px-2' : ''">
          <div><div class="text-ink-700">交付于 {{ delivery.deliveredAt?.replace('T', ' ').slice(0, 16) }}</div><div class="mt-0.5 text-xs text-ink-400">数据更新时间 {{ dataVersionTime(delivery.dataVersionUpdatedAt) }} · 订单 {{ delivery.orderId }}</div></div>
          <button class="text-brand-600" @click="downloadSample(delivery.deliveredAt?.slice(0, 10))">下载此版本</button>
        </div>
      </section>
      <h2 class="mt-5 text-sm font-semibold text-ink-900">样本数据</h2>
      <div class="mt-3 overflow-x-auto border border-ink-200">
        <table class="w-full min-w-[520px] text-left text-sm">
          <thead class="bg-ink-100"><tr><th v-for="column in columns" :key="column" class="px-3 py-2 font-medium text-ink-700">{{ column }}</th></tr></thead>
          <tbody><tr v-for="(row, index) in rows" :key="index" class="border-t border-ink-100"><td v-for="column in columns" :key="column" class="px-3 py-2 text-ink-600">{{ row[column] }}</td></tr></tbody>
        </table>
      </div>
      <p class="mt-3 text-xs text-ink-400">原型下载仅含样本数据；正式交付与历史版本以用数模块为准。</p>
    </template>
  </main>
</template>
