<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import { apiSupportingFiles } from '@/domain/productDetailFields'

const props = defineProps<{ product: Product; compact?: boolean }>()
const files = computed(() => apiSupportingFiles(props.product))
</script>

<template>
  <section v-if="files.length" data-testid="api-supporting-files" :class="compact ? 'space-y-2' : 'space-y-3 rounded-lg border border-ink-200 bg-white p-5'">
    <h3 :class="compact ? 'text-[13px]' : 'text-sm'" class="font-semibold text-ink-900">配套文件</h3>
    <div class="space-y-2">
      <div v-for="file in files" :key="file.label" class="flex items-center justify-between gap-3 rounded-md bg-ink-100 px-3 py-2 text-sm">
        <span class="min-w-0 text-ink-700">{{ file.label }}</span>
        <a :href="file.href" target="_blank" rel="noopener noreferrer" class="shrink-0 font-medium text-brand-600 hover:underline">下载</a>
      </div>
    </div>
  </section>
</template>
