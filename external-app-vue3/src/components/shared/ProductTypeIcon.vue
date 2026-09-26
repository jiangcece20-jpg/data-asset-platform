<script setup lang="ts">
import { computed } from 'vue'
import type { ProductType } from '@/types/domain'

const props = withDefaults(defineProps<{
  type: ProductType
  size?: number
}>(), { size: 40 })

// 与设计稿一致：数据集红、API 紫、看板蓝、报告橙
const palette: Record<ProductType, { bg: string; fg: string }> = {
  dataset: { bg: '#FFECE8', fg: '#F53F3F' },
  api: { bg: '#F5E8FF', fg: '#722ED1' },
  report: { bg: '#FFF7E8', fg: '#FF7D00' },
  dashboard: { bg: '#E8F3FF', fg: '#165DFF' }
}

const tone = computed(() => palette[props.type] ?? palette.dataset)
const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  background: tone.value.bg,
  color: tone.value.fg
}))
const iconSize = computed(() => Math.round(props.size * 0.55))
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-lg"
    :style="boxStyle"
    aria-hidden="true"
  >
    <!-- 数据集：分层数据库 -->
    <svg v-if="type === 'dataset'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="12" cy="5" rx="7" ry="2.6" />
      <path d="M5 5v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5" />
      <path d="M5 11v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" />
    </svg>
    <!-- API：节点连接 -->
    <svg v-else-if="type === 'api'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M8 7.4 10.4 16M16 7.4 13.6 16M8.2 6h7.6" />
    </svg>
    <!-- 行业报告：文档 -->
    <svg v-else-if="type === 'report'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" />
    </svg>
    <!-- 看板：柱状图 -->
    <svg v-else :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <rect x="7.5" y="12" width="2.8" height="6" rx="0.6" />
      <rect x="11.8" y="8.5" width="2.8" height="9.5" rx="0.6" />
      <rect x="16.1" y="14" width="2.8" height="4" rx="0.6" />
    </svg>
  </span>
</template>
