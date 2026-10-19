<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconArrowLeft } from '@arco-design/web-vue/es/icon'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import { publicDatasetUseIssue } from '@/domain/datasetEntry'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()
const entitlements = useEntitlementStore()
const productId = computed(() => typeof route.query.product === 'string' ? route.query.product : '')
const resourceId = computed(() => typeof route.query.resource === 'string' ? route.query.resource : '')
const product = computed(() => catalog.byId(productId.value))
const resource = computed(() => catalog.resourceById(resourceId.value))
const issue = computed(() => {
  if (route.query.category !== 'public' || !productId.value || !resourceId.value) {
    return '公开数据集不可用：缺少有效的公开数据集定位信息。'
  }
  return publicDatasetUseIssue(product.value, resource.value, {
    loggedIn: user.context.loggedIn,
    enterpriseAuthenticated: user.isEnterpriseAuthenticated,
    activeEnterpriseMember: !!user.currentEnterpriseMember,
    hasTeamMembership: entitlements.hasTeamMembership && entitlements.currentMemberTier !== null
  })
})
const selected = computed(() => issue.value ? undefined : resource.value)
const detail = computed(() => selected.value?.typeDetail.dataset)
const columns = computed(() => detail.value?.sampleColumns ?? [])
const rows = computed(() => detail.value?.sampleRows ?? [])
const fields = computed(() => detail.value?.fields ?? [])
const activeTab = ref<'preview' | 'fields'>('preview')
watch(() => route.fullPath, () => { activeTab.value = 'preview' })

function navigateTab(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  activeTab.value = activeTab.value === 'preview' ? 'fields' : 'preview'
  const tabs = (event.currentTarget as HTMLElement).parentElement
  tabs?.querySelector<HTMLButtonElement>(`[data-tab="${activeTab.value}"]`)?.focus()
}
</script>

<template>
  <main class="mx-auto min-h-full max-w-6xl bg-white px-4 py-5 sm:px-6">
    <header class="border-b border-ink-200 pb-4">
      <button type="button" aria-label="返回" title="返回" class="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-ink-100" @click="router.back()"><IconArrowLeft /></button>
      <p data-testid="dataset-management-path" class="mt-3 text-sm text-ink-500">用数 · 数据准备 · 数据集管理</p>
      <h1 class="mt-2 text-xl font-semibold text-ink-900">数据集管理</h1>
    </header>
    <div class="grid gap-5 py-5 md:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="数据集分类" class="border-b border-ink-200 pb-4 md:border-b-0 md:border-r md:pr-4">
        <span aria-current="page" class="block border-l-2 border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">公开数据集</span>
      </nav>
      <div v-if="issue" role="alert" class="border-l-2 border-warning-500 bg-warning-50 px-4 py-3 text-sm text-ink-700">{{ issue }}</div>
      <section v-else-if="selected" data-testid="selected-public-dataset" :data-resource-id="selected.id" class="min-w-0">
        <h2 class="break-words text-lg font-semibold text-ink-900">{{ selected.resourceName }}</h2>
        <p v-if="selected.description" class="mt-2 break-words text-sm text-ink-500">{{ selected.description }}</p>
        <p class="mt-2 text-xs text-ink-500">数据更新时间 {{ detail?.dataUpdatedAt || '未返回' }}</p>
        <div role="tablist" aria-label="数据集详情" class="mt-5 flex border-b border-ink-200">
          <button id="public-preview-tab" type="button" role="tab" data-tab="preview" :aria-selected="activeTab === 'preview'" aria-controls="public-preview-panel" :tabindex="activeTab === 'preview' ? 0 : -1" class="border-b-2 px-4 py-3 text-sm" :class="activeTab === 'preview' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500'" @click="activeTab = 'preview'" @keydown="navigateTab">
            数据预览
          </button>
          <button id="public-fields-tab" type="button" role="tab" data-tab="fields" :aria-selected="activeTab === 'fields'" aria-controls="public-fields-panel" :tabindex="activeTab === 'fields' ? 0 : -1" class="border-b-2 px-4 py-3 text-sm" :class="activeTab === 'fields' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500'" @click="activeTab = 'fields'" @keydown="navigateTab">
            字段信息
          </button>
        </div>
        <div v-if="activeTab === 'preview'" id="public-preview-panel" role="tabpanel" aria-labelledby="public-preview-tab" data-testid="public-data-preview" class="mt-4 overflow-x-auto">
          <table v-if="columns.length && rows.length" class="w-full min-w-[480px] text-left text-sm">
            <thead class="bg-ink-100"><tr><th v-for="column in columns" :key="column" class="px-3 py-3 font-medium text-ink-700">{{ column }}</th></tr></thead>
            <tbody><tr v-for="(row, index) in rows" :key="index" class="border-b border-ink-100"><td v-for="column in columns" :key="column" class="px-3 py-3 text-ink-600">{{ row[column] ?? '-' }}</td></tr></tbody>
          </table>
          <p v-else class="py-6 text-sm text-ink-500">暂无预览数据</p>
        </div>
        <div v-else id="public-fields-panel" role="tabpanel" aria-labelledby="public-fields-tab" data-testid="public-dataset-fields" class="mt-4 overflow-x-auto">
          <table v-if="fields.length" class="w-full min-w-[640px] text-left text-sm">
            <thead class="bg-ink-100"><tr><th class="px-3 py-3 font-medium">字段名称</th><th class="px-3 py-3 font-medium">数据类型</th><th class="px-3 py-3 font-medium">含义</th><th class="px-3 py-3 font-medium">说明</th><th class="px-3 py-3 font-medium">主键</th><th class="px-3 py-3 font-medium">允许为空</th></tr></thead>
            <tbody><tr v-for="field in fields" :key="field.name" class="border-b border-ink-100 text-ink-600"><td class="px-3 py-3">{{ field.name }}</td><td class="px-3 py-3">{{ field.dataType }}</td><td class="px-3 py-3">{{ field.meaning || '-' }}</td><td class="px-3 py-3">{{ field.description || '-' }}</td><td class="px-3 py-3">{{ field.primaryKey ? '是' : '否' }}</td><td class="px-3 py-3">{{ field.nullable ? '是' : '否' }}</td></tr></tbody>
          </table>
          <p v-else class="py-6 text-sm text-ink-500">暂无字段信息</p>
        </div>
      </section>
    </div>
  </main>
</template>
