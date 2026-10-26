<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconSearch as Search, IconArrowRight as ArrowRight, IconArrowLeft as ArrowLeft, IconStorage as Database } from '@arco-design/web-vue/es/icon'
import PortalDatasetWorkspace from '@/views/portal/components/PortalDatasetWorkspace.vue'
import ProductTypeIcon from '@/components/shared/ProductTypeIcon.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const commerce = useDatasetCommerceStore()
const user = useUserStore()
const client = computed(() => route.path.startsWith('/portal') ? 'portal' : 'app')
const keyword = ref('')
const sort = ref('updated')
const tabs = [
  { key: 'all', label: '全部' }, { key: 'sql', label: 'SQL 查询' },
  { key: 'model', label: '可视化建模' }, { key: 'purchased', label: '已购数据集' }
]
const activeTab = computed(() => tabs.some(tab => tab.key === route.query.tab) ? String(route.query.tab) : client.value === 'portal' ? 'all' : 'purchased')
const datasets = computed(() => {
  if (!['all', 'purchased'].includes(activeTab.value)) return []
  return catalog.products.filter(product => commerce.canUsePurchasedDataset(product)
    && product.name.toLowerCase().includes(keyword.value.trim().toLowerCase()))
    .sort((a, b) => sort.value === 'name' ? a.name.localeCompare(b.name, 'zh-CN')
      : (b.typeDetail.dataset?.dataUpdatedAt || '').localeCompare(a.typeDetail.dataset?.dataUpdatedAt || ''))
})
const targetUnavailable = computed(() => !!route.query.product
  && !catalog.products.some(product => product.id === route.query.product && commerce.canUsePurchasedDataset(product)))
function selectTab(tab: string) {
  void router.replace({ query: { ...route.query, tab } })
}
function openDataset(id: string) {
  const product = catalog.byId(id)
  if (product && commerce.canUsePurchasedDataset(product)) void router.push({
    path: `/${client.value}/use/dataset/${id}`,
    query: route.query.product === id && typeof route.query.order === 'string' ? { order: route.query.order } : {}
  })
}
</script>

<template>
  <PortalDatasetWorkspace v-if="client === 'portal'" :datasets="datasets" :active-tab="activeTab" v-model:keyword="keyword" v-model:sort="sort" :target-unavailable="targetUnavailable"
    :empty-message="!user.context.loggedIn || !user.currentEnterpriseMember ? '请以有效企业成员身份查看数据集。' : ['all', 'purchased'].includes(activeTab) ? '暂无可用的已购数据集' : '暂无数据集'"
    @select-tab="selectTab" @open-dataset="openDataset" />
  <main v-else class="mx-auto max-w-[1200px] bg-white" data-testid="dataset-management">
    <div class="flex items-center gap-3 border-b border-ink-200 px-4 py-4 sm:px-6">
      <button aria-label="返回" title="返回" class="shrink-0 text-ink-500" @click="router.back()"><ArrowLeft class="h-5 w-5" /></button>
      <h1 class="text-lg font-semibold text-ink-900">数据集管理</h1>
    </div>
    <div class="flex">
      <aside v-if="client === 'portal'" class="w-44 shrink-0 border-r border-ink-100 bg-ink-50 p-4 text-sm">
        <div class="flex items-center gap-2 font-medium text-ink-700"><Database class="h-4 w-4" />数据准备</div>
        <div class="mt-3 border-l-2 border-brand-500 bg-brand-50 px-3 py-2 font-medium text-brand-600">数据集管理</div>
      </aside>
      <section class="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <p class="mb-5 text-xs text-ink-500">用数 / 数据准备 / 数据集管理</p>
        <h2 class="text-base font-semibold text-ink-900">我的数据集</h2>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 pb-4">
          <div role="tablist" aria-label="我的数据集分类" class="flex max-w-full gap-1 overflow-x-auto">
            <button v-for="tab in tabs" :key="tab.key" :data-tab="tab.key" role="tab" :aria-selected="activeTab === tab.key"
              class="shrink-0 border px-3 py-2 text-sm" :class="activeTab === tab.key ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-ink-200 text-ink-600'"
              @click="selectTab(tab.key)">{{ tab.label }}</button>
          </div>
          <div class="flex w-full gap-2 sm:w-auto">
            <label class="flex min-w-0 flex-1 items-center gap-2 border border-ink-200 px-3 py-2">
              <Search class="h-4 w-4 shrink-0 text-ink-400" />
              <input v-model="keyword" aria-label="数据集名称" placeholder="数据集名称" class="min-w-0 w-full bg-transparent text-sm outline-none" />
            </label>
            <select v-model="sort" aria-label="排序" class="border border-ink-200 bg-white px-2 text-sm text-ink-600">
              <option value="updated">按更新时间</option><option value="name">按名称</option>
            </select>
          </div>
        </div>
        <p v-if="targetUnavailable" role="status" class="mt-4 text-sm text-ink-500">目标数据集暂不可用或当前企业无使用权益。</p>
        <div v-if="datasets.length" class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <article v-for="product in datasets" :key="product.id" :data-product="product.id" data-testid="purchased-dataset"
            :aria-current="route.query.product === product.id ? 'true' : undefined"
            class="flex min-h-[180px] min-w-0 flex-col rounded-md border p-4"
            :class="route.query.product === product.id ? 'border-brand-400' : 'border-ink-200'">
            <div class="flex min-w-0 items-center gap-3"><ProductTypeIcon type="dataset" /><h3 class="break-words text-sm font-semibold text-ink-900">{{ product.name }}</h3></div>
            <span class="mt-3 self-start bg-orange-50 px-2 py-0.5 text-xs text-orange-600">已购</span>
            <p class="mt-2 break-words text-sm text-ink-500">{{ product.description || product.subtitle }}</p>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
              <span class="text-xs text-ink-400">数据更新时间 {{ product.typeDetail.dataset?.dataUpdatedAt?.replace('T', ' ').slice(0, 16) || '未返回' }}</span>
              <button class="flex items-center gap-1 text-sm text-brand-600" @click="openDataset(product.id)">查看数据<ArrowRight class="h-4 w-4" /></button>
            </div>
          </article>
        </div>
        <p v-else class="py-14 text-center text-sm text-ink-500">{{ !user.context.loggedIn || !user.currentEnterpriseMember ? '请以有效企业成员身份查看数据集。' : ['all', 'purchased'].includes(activeTab) ? '暂无可用的已购数据集' : '暂无数据集' }}</p>
      </section>
    </div>
  </main>
</template>
