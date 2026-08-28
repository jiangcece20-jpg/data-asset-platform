<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { salesStateOf, SALES_STATE_LABELS } from '@/domain/salesListing'
import { useCatalogStore } from '@/stores/catalog'
import type { ResourceType } from '@/types/resource'

const router = useRouter()
const catalog = useCatalogStore()

type ListTab = 'products' | 'resources'
const listTab = ref<ListTab>('products')
const activeType = ref<ResourceType | ''>('')
const searchQuery = ref('')

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

const originLabels: Record<string, string> = {
  asset_platform: '资产平台',
  app_content: 'APP内容',
  trusted_space: '可信空间',
  user_created: '用户创建',
  seller_market: '入驻商家'
}

const statusColors: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-blue-100 text-blue-700',
  paused: 'bg-slate-100 text-slate-600',
  delisted: 'bg-red-100 text-red-700',
  unlisted: 'bg-slate-100 text-slate-500'
}

interface ResourceRow {
  resourceId: string
  resourceName: string
  type: string
  origin: string
  productName: string
  salesLabel: string
  statusColor: string
  assetVersion?: string
  eligibility: string
  changeRisk?: string
}

const rows = computed<ResourceRow[]>(() => {
  let filtered = catalog.resources.filter((r) => {
    const hasProduct = Boolean(catalog.productForResource(r.id))
    return listTab.value === 'products' ? hasProduct : !hasProduct
  })

  if (activeType.value) {
    filtered = filtered.filter((r) => r.type === activeType.value)
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
      resourceId: r.id,
      resourceName: r.resourceName,
      type: r.type,
      origin: r.origin,
      productName: product?.name || '—',
      salesLabel: SALES_STATE_LABELS[salesState],
      statusColor: statusColors[salesState],
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
      <h1 class="text-xl font-semibold text-slate-800">资源管理</h1>
    </div>

    <div class="mb-4 flex gap-1 border-b border-slate-200" role="tablist" aria-label="资源与商品">
      <button
        type="button"
        role="tab"
        data-testid="resource-center-tab-products"
        :aria-selected="listTab === 'products' ? 'true' : 'false'"
        class="px-4 py-2 text-sm"
        :class="listTab === 'products' ? 'border-b-2 border-brand-600 font-medium text-brand-700' : 'text-slate-500 hover:text-slate-700'"
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
        :class="listTab === 'resources' ? 'border-b-2 border-brand-600 font-medium text-brand-700' : 'text-slate-500 hover:text-slate-700'"
        @click="listTab = 'resources'"
      >
        资源
      </button>
    </div>

    <!-- 类型筛选 + 搜索 -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex gap-1.5">
        <button
          v-for="t in types"
          :key="t.value"
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="activeType === t.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'"
          @click="activeType = t.value"
        >
          {{ t.label }}
        </button>
      </div>
      <input
        v-model="searchQuery"
        placeholder="搜索资源名称或商品名称"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
      />
    </div>

    <!-- 资源列表 -->
    <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th class="px-4 py-3 font-medium">资源名称</th>
            <th class="px-4 py-3 font-medium">类型</th>
            <th class="px-4 py-3 font-medium">来源</th>
            <th class="px-4 py-3 font-medium">资产版本</th>
            <th class="px-4 py-3 font-medium">商业化资格</th>
            <th class="px-4 py-3 font-medium">商品名称</th>
            <th class="px-4 py-3 font-medium">前台状态</th>
            <th class="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.resourceId" class="border-b border-slate-50 hover:bg-slate-50/50">
            <td class="px-4 py-3 font-medium text-slate-800">{{ row.resourceName }}</td>
            <td class="px-4 py-3">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{{ typeLabels[row.type] || row.type }}</span>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ originLabels[row.origin] || row.origin }}</td>
            <td class="px-4 py-3 text-slate-500">{{ row.assetVersion || '—' }}</td>
            <td class="px-4 py-3">
              <span :class="row.eligibility === '可商品化' ? 'text-emerald-600' : row.eligibility === '—' ? 'text-slate-400' : 'text-red-500'">{{ row.eligibility }}</span>
              <span v-if="row.changeRisk === 'high'" class="ml-1 rounded bg-red-50 px-1 py-0.5 text-[10px] text-red-600">高风险</span>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ row.productName }}</td>
            <td class="px-4 py-3">
              <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="row.statusColor">{{ row.salesLabel }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button
                  class="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600"
                  @click="goEdit(row.resourceId)"
                >
                  编辑
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="8" class="px-4 py-10 text-center text-sm text-slate-400">
              {{ listTab === 'products' ? '暂无商品' : '暂无未关联资源' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
