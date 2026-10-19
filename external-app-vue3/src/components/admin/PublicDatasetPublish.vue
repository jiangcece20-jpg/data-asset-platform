<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { publicDatasetDisplay, publicDatasetIssues } from '@/domain/publicDataset'

const props = defineProps<{ resourceId: string; disabled?: boolean }>()
const catalog = useCatalogStore()
const router = useRouter()
const opened = ref(false)
const error = ref('')
const resource = computed(() => catalog.resourceById(props.resourceId))
const product = computed(() => catalog.productForResource(props.resourceId))
const issues = computed(() => resource.value ? publicDatasetIssues(resource.value) : ['资源不存在'])
function open() {
  if (product.value) return router.push(`/admin/resources/${props.resourceId}`)
  error.value = ''
  opened.value = true
}
function publish() {
  try {
    catalog.generatePublicDatasetProduct(props.resourceId)
    opened.value = false
    router.push(`/admin/resources/${props.resourceId}`)
  } catch (e) { error.value = e instanceof Error ? e.message : '生成失败，请重试' }
}
</script>

<template>
  <button type="button" data-testid="public-publish-entry" :disabled="disabled" class="rounded-md bg-brand-600 px-3 py-1.5 text-xs text-white disabled:opacity-40" @click="open">{{ product ? '查看商品' : '生成并上架' }}</button>
  <Teleport to="body">
    <div v-if="opened" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" @click.self="opened = false" @keydown.esc="opened = false">
      <section role="dialog" aria-modal="true" aria-label="生成并上架公开数据集" class="w-full max-w-md rounded-lg bg-white p-5 shadow-float">
        <h2 class="text-base font-semibold">生成并上架公开数据集</h2>
        <p class="mt-4 break-words text-sm">{{ resource ? publicDatasetDisplay(resource).productName : '' }}</p>
        <p class="mt-2 text-sm text-ink-500">会员免费 · 企业会员直接用数，无需下单</p>
        <div v-if="issues.length" role="alert" class="mt-4 text-sm text-danger-600">
          <p>暂不能上架，请在资源详情补齐资料；源端状态、字段或更新时间异常请重新同步：</p>
          <ul class="mt-2 list-inside list-disc"><li v-for="issue in issues" :key="issue">{{ issue }}</li></ul>
        </div>
        <p v-if="error" role="alert" class="mt-3 text-sm text-danger-600">{{ error }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-ink-200 px-3 py-2 text-sm" @click="opened = false">取消</button>
          <button data-testid="confirm-public-publish" :disabled="issues.length > 0" class="rounded-md bg-brand-600 px-3 py-2 text-sm text-white disabled:opacity-40" @click="publish">确认上架</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
