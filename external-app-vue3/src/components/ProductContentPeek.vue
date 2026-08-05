<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import { productCardSummary } from '@/domain/productCardSummary'

const props = defineProps<{ product: Product }>()

const report = computed(() => props.product.typeDetail.report)
const reportSample = computed(() => report.value?.blocks.find((block) => block.preview === 'visible'))
const dashboard = computed(() => props.product.typeDetail.dashboard)
const dashboardMetrics = computed(() => dashboard.value?.metrics.filter((metric) => metric.preview === 'visible').slice(0, 2) ?? [])
const dashboardPanel = computed(() => dashboard.value?.panels.find((panel) => panel.preview === 'visible'))
const businessSummary = computed(() => productCardSummary(props.product))

const chartPoints = computed(() => {
  const values = dashboardPanel.value?.previewSeries?.length
    ? dashboardPanel.value.previewSeries
    : [42, 48, 45, 56, 54, 63, 60, 68]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
    const y = 35 - ((value - min) / range) * 27
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-100 bg-slate-50" data-testid="content-first-preview">
    <!-- 报告：先让用户看到报告封面与公开正文，而不是只看到商品标签。 -->
    <div v-if="product.type === 'report' && report" class="flex gap-3 p-3">
      <div class="flex h-[86px] w-[64px] shrink-0 flex-col justify-between rounded-md bg-gradient-to-br from-slate-800 to-brand-600 p-2 text-white shadow-sm">
        <span class="text-[9px] tracking-widest text-blue-100">行业报告</span>
        <span class="line-clamp-3 text-[10px] font-semibold leading-tight">{{ product.name }}</span>
        <span class="text-[8px] text-blue-100">{{ report.version }}</span>
      </div>
      <div class="min-w-0 flex-1 py-0.5">
        <div class="flex flex-wrap gap-x-2 text-[10px] text-slate-400">
          <span>{{ report.publishedAt }}</span><span>{{ report.pageCount ?? '—' }} 页</span><span>{{ report.author }}</span>
        </div>
        <div class="mt-1.5 text-[11px] font-semibold text-slate-700">{{ reportSample?.title || '公开摘要' }}</div>
        <p class="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-500">{{ reportSample?.content || product.description }}</p>
      </div>
    </div>

    <!-- 看板：直接给出公开指标值与趋势图。 -->
    <div v-else-if="product.type === 'dashboard' && dashboard" class="p-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium text-slate-500">看板数据预览</span>
        <span class="text-[9px] text-slate-400">更新至 {{ product.updatedAt }}</span>
      </div>
      <div class="mt-2 grid grid-cols-[minmax(0,1fr)_112px] gap-3">
        <div class="grid grid-cols-2 gap-1.5">
          <div v-for="metric in dashboardMetrics" :key="metric.name" class="rounded-lg bg-white px-2 py-1.5">
            <div class="truncate text-[9px] text-slate-400">{{ metric.name }}</div>
            <div class="mt-0.5 text-[13px] font-semibold text-slate-800">{{ metric.previewValue || '示例值' }}</div>
            <div v-if="metric.previewChange" class="text-[9px] text-emerald-600">{{ metric.previewChange }}</div>
          </div>
          <div v-if="!dashboardMetrics.length" class="col-span-2 rounded-lg bg-white px-2 py-2 text-[10px] text-slate-400">公开指标准备中</div>
        </div>
        <div class="rounded-lg bg-white px-2 py-1.5">
          <div class="truncate text-[9px] text-slate-400">{{ dashboardPanel?.title || '趋势预览' }}</div>
          <svg viewBox="0 0 100 40" class="mt-1 h-10 w-full" role="img" aria-label="看板趋势预览">
            <line x1="0" y1="36" x2="100" y2="36" stroke="#e2e8f0" stroke-width="1" />
            <polyline :points="chartPoints" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 数据集/API：列表只讲内容和能力，不前置字段或接口文档。 -->
    <div v-else-if="product.type === 'dataset' || product.type === 'api'" class="p-3" data-testid="product-content-summary">
      <div class="text-[10px] font-medium text-slate-500">{{ product.type === 'dataset' ? '数据内容总结' : '能力内容总结' }}</div>
      <p class="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-600">{{ businessSummary.lead }}</p>
      <div v-if="businessSummary.facts.length" class="mt-2 flex flex-wrap gap-1.5">
        <span v-for="fact in businessSummary.facts" :key="fact" class="rounded bg-white px-2 py-1 text-[9px] text-slate-500">{{ fact }}</span>
      </div>
    </div>
  </div>
</template>
