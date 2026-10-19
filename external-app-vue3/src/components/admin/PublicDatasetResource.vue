<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Resource } from '@/types/resource'
import { useCatalogStore } from '@/stores/catalog'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'
import { PUBLIC_DATASET_PROVIDER, PUBLIC_DATASET_UPDATE_FREQUENCY, publicDatasetDisplay } from '@/domain/publicDataset'
import { PRODUCT_NAME_MAX, truncateProductName } from '@/domain/resourceManagement'

const props = defineProps<{ resource: Resource }>()
const catalog = useCatalogStore()
const product = computed(() => catalog.productForResource(props.resource.id))
const sourceState = ref('public')
const tags = ref('')
const sort = ref(50)
const recommended = ref(false)
const saved = ref(false)
function displayForm() {
  const values = publicDatasetDisplay(props.resource)
  return { ...values, rowCount: values.rowCount ?? '', fieldCount: values.fieldCount ?? '' }
}
const form = ref(displayForm())
watch(() => form.value.productName, value => { form.value.productName = truncateProductName(value) })
const baseline = ref(JSON.stringify(form.value))
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value)
const detailsError = ref('')
watch(() => [props.resource.id, JSON.stringify(publicDatasetDisplay(props.resource))], () => {
  if (dirty.value) return
  const next = displayForm()
  if (JSON.stringify(next) === baseline.value) return
  form.value = next
  baseline.value = JSON.stringify(form.value)
})
function publishDetails() {
  detailsError.value = ''
  try {
    catalog.updatePublicDatasetDetails(props.resource.id, {
      ...form.value,
      productName: truncateProductName(form.value.productName.trim()),
      resourceName: form.value.resourceName.trim(), description: form.value.description.trim(),
      updateFrequency: PUBLIC_DATASET_UPDATE_FREQUENCY,
      rowCount: form.value.rowCount === '' ? undefined : Number(form.value.rowCount),
      fieldCount: form.value.fieldCount === '' ? null : Number(form.value.fieldCount)
    })
    catalog.generatePublicDatasetProduct(props.resource.id)
  } catch (error) {
    detailsError.value = error instanceof Error ? error.message : '上架失败，请重试'
  }
}
watch(() => product.value?.id, () => {
  tags.value = product.value?.tags.join('，') || ''
  sort.value = product.value?.sortWeight ?? 50
  recommended.value = product.value?.recommendSlot ?? false
}, { immediate: true })
function save() {
  if (!product.value) return
  catalog.updateEnhancement(product.value.id, { tags: tags.value.split(/[,，]/).map(t => t.trim()).filter(Boolean), sortWeight: sort.value, recommendSlot: recommended.value })
  saved.value = true
}
function sync() {
  if (sourceState.value === 'error') {
    catalog.recordPublicDatasetSyncFailure(props.resource.id, '源端连接超时；已保留上次成功状态。')
    return
  }
  const r = props.resource
  catalog.syncUsePublicDatasets([{
    resourceId: r.id, name: r.resourceName, description: r.description, metadata: r.publicDatasetMetadata,
    isPublic: sourceState.value !== 'private', available: sourceState.value !== 'unavailable',
    updatedAt: r.typeDetail.dataset?.qualityUpdatedAt || '', fields: r.typeDetail.dataset?.fields || [], detail: r.typeDetail.dataset
  }])
}
</script>

<template>
  <div data-testid="public-resource-detail" class="space-y-6 bg-white p-5">
    <section class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
      <div><h2 class="text-base font-semibold">公开数据集</h2><p class="mt-1 text-sm text-ink-500">{{ product ? (product.availability === 'published' ? '已上架 · 会员免费' : '已下架') : '未生成商品' }}</p></div>
      <div v-if="product" class="flex gap-4 text-sm text-brand-600"><RouterLink :to="`/portal/product/${product.id}`">PC 详情</RouterLink><RouterLink :to="`/app/product/${product.id}`">移动端详情</RouterLink></div>
    </section>
    <section>
      <h3 class="mb-3 text-sm font-semibold">源端同步</h3>
      <p class="text-sm">{{ resource.sourcePublicDataset ? '公开' : '非公开' }} · {{ resource.sourceDatasetAvailable ? '数据可用' : '数据不可用' }}</p>
      <p class="mt-2 text-xs text-ink-500">最近成功同步：{{ resource.lastSyncedAt || '—' }}</p>
      <div v-if="resource.publicSyncError" role="alert" class="mt-3 text-sm text-danger-600">{{ resource.publicSyncError }}<button class="ml-3 text-brand-600" @click="sourceState = resource.sourcePublicDataset ? (resource.sourceDatasetAvailable ? 'public' : 'unavailable') : 'private'; sync()">重试同步</button></div>
      <details class="mt-3 text-xs text-ink-500"><summary class="cursor-pointer">源端状态模拟（未接真实接口）</summary><div class="mt-3 flex flex-wrap gap-2">
        <select v-model="sourceState" aria-label="模拟源端状态" class="rounded-md border border-ink-200 px-2 py-1"><option value="public">公开且可用</option><option value="private">取消公开</option><option value="unavailable">数据不可用</option><option value="error">同步失败</option></select>
        <button :disabled="dirty" class="rounded-md border border-ink-200 px-3 py-1 disabled:opacity-40" @click="sync">同步状态</button>
      </div></details>
    </section>
    <form v-if="!product" class="public-metadata border-t border-ink-100 pt-4 text-sm" @submit.prevent="publishDetails">
      <h3 class="mb-4 font-semibold">资源基本信息</h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="md:col-span-2">商品名称<input v-model="form.productName" aria-label="商品名称" /><span class="mt-1 block text-right text-xs">{{ Array.from(form.productName).length }}/{{ PRODUCT_NAME_MAX }}</span></label>
        <label>资源名称<input v-model="form.resourceName" aria-label="资源名称" /></label>
        <label>提供方<input :value="PUBLIC_DATASET_PROVIDER" aria-label="提供方" readonly /></label>
        <label class="md:col-span-2">简介<textarea v-model="form.description" aria-label="简介" rows="2" /></label>
        <label>地域范围<input v-model="form.coverage" aria-label="地域范围" /></label>
        <label>更新频率<input :value="PUBLIC_DATASET_UPDATE_FREQUENCY" aria-label="更新频率" readonly /></label>
        <label>数据粒度<input v-model="form.granularity" aria-label="数据粒度" /></label>
        <label>时间范围<input v-model="form.timeRange" aria-label="时间范围" /></label>
        <label>数据行数<input v-model="form.rowCount" aria-label="数据行数" type="number" min="0" step="1" /></label>
        <label>字段数<input v-model="form.fieldCount" aria-label="字段数" type="number" min="0" step="1" /></label>
        <label>数据更新时间<input :value="resource.typeDetail.dataset?.qualityUpdatedAt || ''" aria-label="数据更新时间" readonly /></label>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <button type="submit" data-testid="public-publish-entry" class="rounded-md bg-brand-600 px-4 py-2 text-white">上架</button>
        <span v-if="detailsError" role="alert" class="text-danger-600">{{ detailsError }}</span>
      </div>
    </form>
    <ProductInfoSections v-if="product" :product="product" compact-dataset origin-label="自营产品" />
    <section>
      <h3 class="mb-3 text-sm font-semibold">字段信息 · 同步自用数</h3>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-ink-100 text-ink-500"><tr><th class="p-2">字段名称</th><th class="p-2">类型</th><th class="p-2">说明</th></tr></thead><tbody><tr v-for="field in resource.typeDetail.dataset?.fields" :key="field.name" class="border-b border-ink-100"><td class="p-2">{{ field.name }}</td><td class="p-2">{{ field.dataType }}</td><td class="p-2">{{ field.description || field.meaning || '—' }}</td></tr></tbody></table></div>
    </section>
    <section v-if="product" class="border-t border-ink-100 pt-4">
      <h3 class="mb-3 text-sm font-semibold">运营配置</h3>
      <div class="flex flex-wrap items-end gap-4 text-sm">
        <label>标签<input v-model="tags" class="mt-1 block rounded-md border border-ink-200 px-3 py-2" @input="saved = false" /></label>
        <label>排序权重<input v-model.number="sort" type="number" min="0" class="mt-1 block w-24 rounded-md border border-ink-200 px-3 py-2" @input="saved = false" /></label>
        <label class="py-2"><input v-model="recommended" type="checkbox" @change="saved = false" /> 推荐展示</label>
        <button class="rounded-md bg-brand-600 px-3 py-2 text-white" @click="save">保存</button><span v-if="saved" class="py-2 text-success-600">已保存</span>
      </div>
    </section>
    <section v-if="resource.publicStateHistory?.length" class="border-t border-ink-100 pt-4 text-sm"><h3 class="mb-3 font-semibold">上下架记录</h3><p v-for="(item, index) in resource.publicStateHistory" :key="index" class="mt-2 text-ink-500">{{ item.at }} · {{ item.reason }}</p></section>
  </div>
</template>

<style scoped>
.public-metadata label { display: block; color: #64748b; }
.public-metadata input, .public-metadata textarea { display: block; width: 100%; min-width: 0; margin-top: 6px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b; }
.public-metadata input[readonly] { background: #f8fafc; }
</style>
