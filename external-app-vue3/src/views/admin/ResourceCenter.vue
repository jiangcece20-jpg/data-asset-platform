<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { salesStateOf, SALES_STATE_LABELS, listingChangeLabel, type SalesState } from '@/domain/salesListing'
import { useCatalogStore } from '@/stores/catalog'
import type { ResourceType } from '@/types/resource'
import { resourceManagementOrigin, resourceManagementOrigins as originLabels } from '@/domain/resourceManagement'

const router = useRouter()
const catalog = useCatalogStore()

type ListTab = 'products' | 'resources'
const listTab = ref<ListTab>('products')
const activeType = ref<ResourceType | ''>('')
const searchQuery = ref('')
const activeOrigin = ref('')
const onlyPublic = ref(false)
const activeSalesState = ref<Exclude<SalesState, 'unlisted'> | ''>('')
const activeListingMode = ref('')

const productStates: Exclude<SalesState, 'unlisted'>[] = ['draft', 'published', 'delisted']

const types: { value: ResourceType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'dataset', label: '数据集' },
  { value: 'api', label: 'API' },
  { value: 'report', label: '报告' },
  { value: 'dashboard', label: '看板' },
  { value: 'user_view', label: '用数视图' }
]

const typeLabels: Record<string, string> = {
  dataset: '数据集',
  api: 'API',
  report: '报告',
  dashboard: '看板',
  user_view: '用数视图'
}

const statusColors: Record<string, string> = {
  published: 'bg-success-100 text-success-600',
  draft: 'bg-brand-100 text-brand-700',
  delisted: 'bg-danger-100 text-danger-600',
  unlisted: 'bg-ink-100 text-ink-500'
}

interface ResourceRow {
  publicUseDataset: boolean
  resourceId: string
  resourceName: string
  type: string
  origin: keyof typeof originLabels
  productName: string
  salesLabel: string
  statusColor: string
  assetVersion?: string
  eligibility: string
  changeRisk?: string
  listingChange: string
  manualHold: boolean
}

const rows = computed<ResourceRow[]>(() => {
  let filtered = catalog.resources.filter((r) => {
    if (!resourceManagementOrigin(r.origin)) return false
    const hasProduct = Boolean(catalog.productForResource(r.id))
    return listTab.value === 'products' ? hasProduct : !hasProduct
  })

  if (activeType.value) {
    filtered = filtered.filter((r) => r.type === activeType.value)
  }
  if (activeOrigin.value) filtered = filtered.filter((r) => resourceManagementOrigin(r.origin) === activeOrigin.value)
  if (onlyPublic.value) filtered = filtered.filter((r) => r.type === 'dataset' && r.sourcePublicDataset === true)
  if (listTab.value === 'products' && activeSalesState.value) {
    filtered = filtered.filter((r) => salesStateOf(catalog.productForResource(r.id)) === activeSalesState.value)
  }
  if (listTab.value === 'products' && activeListingMode.value) {
    filtered = filtered.filter((r) => catalog.productForResource(r.id)?.lastListingChange?.mode === activeListingMode.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    filtered = filtered.filter(
      (r) =>
        r.resourceName.toLowerCase().includes(q) ||
        catalog.productForResource(r.id)?.name.toLowerCase().includes(q)
    )
  }

  return filtered.map((r) => {
    const product = catalog.productForResource(r.id)
    const salesState = salesStateOf(product)
    return {
      publicUseDataset: Boolean(r.publicDatasetMetadata || r.sourcePublicDataset),
      resourceId: r.id,
      resourceName: r.resourceName,
      type: r.type,
      origin: resourceManagementOrigin(r.origin)!,
      productName: product?.name || '',
      salesLabel: SALES_STATE_LABELS[salesState],
      statusColor: statusColors[salesState],
      listingChange: listingChangeLabel(product),
      manualHold: Boolean(product?.manualDelistedBy || r.publicDelistReason === 'manual'),
      assetVersion: r.assetVersion,
      eligibility: r.origin !== 'asset_platform' ? '—' : r.commercializable && r.assetStatus === 'published' ? '可商品化' : '不可商品化',
      changeRisk: r.changeRisk
    }
  })
})

function goEdit(resourceId: string) {
  router.push(`/admin/resources/${resourceId}`)
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-ink-900">资源管理</h1>
    </div>

    <div class="mb-4 flex gap-1 border-b border-ink-200" role="tablist" aria-label="资源与商品">
      <button
        type="button"
        role="tab"
        data-testid="resource-center-tab-products"
        :aria-selected="listTab === 'products' ? 'true' : 'false'"
        class="px-4 py-2 text-sm"
        :class="listTab === 'products' ? 'border-b-2 border-brand-600 font-medium text-brand-700' : 'text-ink-500 hover:text-ink-700'"
        @click="listTab = 'products'"
      >
        商品
      </button>
      <button
        type="button"
        role="tab"
        data-testid="resource-center-tab-resources"
        :aria-selected="listTab === 'resources' ? 'true' : 'false'"
        class="px-4 py-2 text-sm"
        :class="listTab === 'resources' ? 'border-b-2 border-brand-600 font-medium text-brand-700' : 'text-ink-500 hover:text-ink-700'"
        @click="listTab = 'resources'"
      >
        资源
      </button>
    </div>

    <!-- 类型筛选 + 搜索 -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="t in types"
          :key="t.value"
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="activeType === t.value ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-brand-300'"
          @click="activeType = t.value"
        >
          {{ t.label }}
        </button>
      </div>
      <label class="flex items-center gap-2 text-sm text-ink-600">来源
        <select v-model="activeOrigin" aria-label="来源" class="rounded-md border border-ink-200 bg-white px-3 py-1.5">
          <option value="">全部来源</option>
          <option v-for="(label, value) in originLabels" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <label v-if="listTab === 'products'" class="flex items-center gap-2 text-sm text-ink-600">前台状态
        <select v-model="activeSalesState" aria-label="前台状态" class="rounded-md border border-ink-200 bg-white px-3 py-1.5">
          <option value="">全部状态</option>
          <option v-for="state in productStates" :key="state" :value="state">{{ SALES_STATE_LABELS[state] }}</option>
        </select>
      </label>
      <label v-if="listTab === 'products'" class="flex items-center gap-2 text-sm text-ink-600">上下架方式
        <select v-model="activeListingMode" aria-label="上下架方式" class="rounded-md border border-ink-200 bg-white px-3 py-1.5">
          <option value="">全部方式</option><option value="manual">人工</option><option value="system">系统</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-ink-600"><input v-model="onlyPublic" type="checkbox" aria-label="仅看公开数据集" />仅看公开数据集</label>
      <input
        v-model="searchQuery"
        placeholder="搜索资源名称或商品名称"
        class="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
      />
    </div>

    <!-- 资源列表 -->
    <div class="overflow-x-auto rounded-lg border border-ink-200 bg-white">
      <table class="w-full min-w-[1100px] text-sm">
        <thead>
          <tr class="whitespace-nowrap border-b border-ink-100 bg-ink-100 text-left text-xs text-ink-500">
            <th class="px-4 py-3 font-medium">商品名称</th>
            <th class="px-4 py-3 font-medium">资源名称</th>
            <th class="px-4 py-3 font-medium">类型</th>
            <th class="px-4 py-3 font-medium">来源</th>
            <th class="px-4 py-3 font-medium">资产版本</th>
            <th class="px-4 py-3 font-medium">商业化资格</th>
            <th class="px-4 py-3 font-medium">前台状态</th>
            <th v-if="listTab === 'products'" class="px-4 py-3 font-medium">最近上下架</th>
            <th class="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.resourceId" class="border-b border-ink-100 hover:bg-ink-100/50">
            <td class="px-4 py-3 font-medium text-ink-900">{{ row.productName }}</td>
            <td class="px-4 py-3 font-medium text-ink-900">{{ row.resourceName }}</td>
            <td class="px-4 py-3">
              <span class="whitespace-nowrap rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600">{{ typeLabels[row.type] || row.type }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ originLabels[row.origin] || row.origin }}</td>
            <td class="px-4 py-3 text-ink-500">{{ row.assetVersion || '—' }}</td>
            <td class="px-4 py-3">
              <span :class="row.eligibility === '可商品化' ? 'text-success-600' : row.eligibility === '—' ? 'text-ink-500' : 'text-danger-500'">{{ row.eligibility }}</span>
              <span v-if="row.changeRisk === 'high'" class="ml-1 rounded bg-danger-50 px-1 py-0.5 text-[10px] text-danger-600">高风险</span>
            </td>
            <td class="px-4 py-3">
              <span class="whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium" :class="row.statusColor">{{ row.salesLabel }}</span>
              <span v-if="row.manualHold" class="mt-1 block whitespace-nowrap text-xs text-ink-500">仅可人工恢复</span>
            </td>
            <td v-if="listTab === 'products'" class="whitespace-nowrap px-4 py-3 text-xs text-ink-600">{{ row.listingChange }}</td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button
                  class="whitespace-nowrap rounded border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:border-brand-300 hover:text-brand-600"
                  @click="goEdit(row.resourceId)"
                >
                  编辑
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="listTab === 'products' ? 9 : 8" class="px-4 py-10 text-center text-sm text-ink-500">
              {{ activeOrigin || onlyPublic || activeType || searchQuery || (listTab === 'products' && (activeSalesState || activeListingMode)) ? '暂无符合条件的记录' : listTab === 'products' ? '暂无商品' : '暂无未关联资源' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
