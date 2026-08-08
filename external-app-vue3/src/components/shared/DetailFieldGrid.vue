<script setup lang="ts">
import type { DetailFieldItem } from '@/domain/productDetailFields'

withDefaults(defineProps<{
  items: DetailFieldItem[]
  /** 网格列数；移动端固定 2 列 */
  columns?: 2 | 3
  dense?: boolean
}>(), {
  columns: 3,
  dense: false
})
</script>

<template>
  <div class="grid gap-2" :class="columns === 2 ? 'grid-cols-2' : 'grid-cols-3'">
    <div
      v-for="(item, idx) in items"
      :key="`${item.label}-${idx}`"
      class="rounded-md border border-slate-100 bg-slate-50/70"
      :class="[dense ? 'px-3 py-2' : 'px-4 py-2.5', item.full ? (columns === 2 ? 'col-span-2' : 'col-span-3') : '']"
    >
      <div class="text-xs text-slate-400">
        {{ item.label }}<span v-if="item.synced" class="ml-1 text-blue-500">· 同步</span>
      </div>
      <a
        v-if="item.href"
        :href="item.href"
        target="_blank"
        class="mt-1 block text-sm font-medium text-blue-600 hover:underline"
      >{{ item.value }}</a>
      <div v-else class="mt-1 text-sm font-medium leading-relaxed text-slate-800">{{ item.value }}</div>
    </div>
  </div>
</template>
