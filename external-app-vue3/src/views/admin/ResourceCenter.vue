<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import type { AcquisitionOption, PriceModel } from '@/types/domain'
import type { ResourceType } from '@/types/resource'

const router = useRouter()
const catalog = useCatalogStore()

const activeType = ref<ResourceType | ''>('')
const searchQuery = ref('')
const showListModal = ref(false)
const listingResourceId = ref('')
const listForm = ref({
  name: '',
  subtitle: '',
  price: { model: 'item_only' as PriceModel, itemPrice: 100, unit: '元/次' },
  acquisitions: ['item_purchase'] as AcquisitionOption[],
  scenarios: [] as string[],
  tags: [] as string[]
})

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
  user_created: '用户创建'
}

const statusLabels: Record<string, { label: string; color: string }> = {
  published: { label: '已上架', color: 'bg-emerald-100 text-emerald-700' },
  candidate: { label: '候选', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: '准备中', color: 'bg-amber-100 text-amber-700' },
  paused: { label: '已暂停', color: 'bg-slate-100 text-slate-600' },
  delisted: { label: '已下架', color: 'bg-red-100 text-red-700' }
}

interface ResourceRow {
  resourceId: string
  resourceName: string
  type: string
  origin: string
  productName: string
  status: string
  statusColor: string
  isListed: boolean
  productId?: string
}

const rows = computed<ResourceRow[]>(() => {
  let filtered = catalog.resources

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
    return {
      resourceId: r.id,
      resourceName: r.resourceName,
      type: r.type,
      origin: r.origin,
      productName: product?.name || '—',
      status: product?.availability || 'not_listed',
      statusColor: product
        ? statusLabels[product.availability]?.color || 'bg-slate-100 text-slate-600'
        : 'bg-slate-100 text-slate-500',
      isListed: !!product,
      productId: product?.id
    }
  })
})

function openListModal(resourceId: string) {
  const resource = catalog.resourceById(resourceId)
  if (!resource) return
  listingResourceId.value = resourceId
  listForm.value = {
    name: resource.resourceName,
    subtitle: '',
    price: { model: 'item_only' as PriceModel, itemPrice: 100, unit: '元/次' },
    acquisitions: ['item_purchase'] as AcquisitionOption[],
    scenarios: [],
    tags: []
  }
  showListModal.value = true
}

function confirmList() {
  try {
    catalog.listResource(listingResourceId.value, {
      name: listForm.value.name,
      subtitle: listForm.value.subtitle,
      price: { model: listForm.value.price.model, itemPrice: listForm.value.price.itemPrice, unit: listForm.value.price.unit },
      acquisitions: listForm.value.acquisitions,
      scenarios: listForm.value.scenarios,
      tags: listForm.value.tags
    })
    showListModal.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

function handleDelist(productId: string) {
  catalog.delistProduct(productId)
}

function goEdit(resourceId: string) {
  router.push(`/admin/resources/${resourceId}`)
}

function statusLabel(status: string): string {
  if (status === 'not_listed') return '未上架'
  return statusLabels[status]?.label || status
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-slate-800">资源管理</h1>
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
            <td class="px-4 py-3 text-slate-600">{{ row.productName }}</td>
            <td class="px-4 py-3">
              <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="row.statusColor">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button
                  v-if="!row.isListed && row.type !== 'user_view'"
                  class="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700"
                  @click="openListModal(row.resourceId)"
                >
                  上架
                </button>
                <button
                  v-else-if="row.isListed"
                  class="rounded bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100"
                  @click="handleDelist(row.productId!)"
                >
                  下架
                </button>
                <button
                  class="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600"
                  @click="goEdit(row.resourceId)"
                >
                  编辑
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 上架弹窗 -->
    <div v-if="showListModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showListModal = false">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">上架资源</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">商品名称</label>
            <input v-model="listForm.name" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">副标题</label>
            <input v-model="listForm.subtitle" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">价格（元）</label>
            <input v-model.number="listForm.price.itemPrice" type="number" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="showListModal = false">取消</button>
          <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700" @click="confirmList">确认上架</button>
        </div>
      </div>
    </div>
  </div>
</template>
