<script setup lang="ts">
import type { DetailFieldItem } from '@/domain/productDetailFields'

withDefaults(defineProps<{
  items: DetailFieldItem[]
  /** 网格列数；移动端固定 2 列 */
  columns?: 2 | 3
  dense?: boolean
  /** mobile 设计稿：label 左 / value 右的单列行表 */
  layout?: 'grid' | 'rows'
}>(), {
  columns: 3,
  dense: false,
  layout: 'grid'
})
</script>

<template>
  <!-- 单列行表（App 详情设计稿） -->
  <div v-if="layout === 'rows'" class="py-1">
    <div
      v-for="(item, idx) in items"
      :key="`${item.label}-${idx}`"
      class="flex items-start justify-between gap-4 py-2.5"
    >
      <div class="shrink-0 pt-0.5 text-[13px] leading-5 text-ink-500">
        {{ item.label }}<span v-if="item.synced" class="ml-1 text-brand-500">· 同步</span>
      </div>
      <a
        v-if="item.href"
        :href="item.href"
        target="_blank"
        class="min-w-0 text-right text-[13px] font-medium leading-5 text-brand-600 hover:underline"
      >{{ item.value }}</a>
      <div v-else class="min-w-0 text-right text-[13px] font-medium leading-5 text-ink-900">{{ item.value }}</div>
    </div>
  </div>

  <!-- 网格卡片（PC / 运营后台） -->
  <div v-else class="grid gap-2" :class="columns === 2 ? 'grid-cols-2' : 'grid-cols-3'">
    <div
      v-for="(item, idx) in items"
      :key="`${item.label}-${idx}`"
      class="rounded-md border border-ink-100 bg-ink-100/70"
      :class="[dense ? 'px-3 py-2' : 'px-4 py-2.5', item.full ? (columns === 2 ? 'col-span-2' : 'col-span-3') : '']"
    >
      <div class="text-xs text-ink-500">
        {{ item.label }}<span v-if="item.synced" class="ml-1 text-brand-500">· 同步</span>
      </div>
      <a
        v-if="item.href"
        :href="item.href"
        target="_blank"
        class="mt-1 block text-sm font-medium text-brand-600 hover:underline"
      >{{ item.value }}</a>
      <div v-else class="mt-1 text-sm font-medium leading-relaxed text-ink-900">{{ item.value }}</div>
    </div>
  </div>
</template>
