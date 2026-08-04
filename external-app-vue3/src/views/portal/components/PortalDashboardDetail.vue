<script setup lang="ts">
import { computed } from 'vue'
import type { Product, PreviewMode } from '@/types/domain'
import SpaceDeclarationProvider from './SpaceDeclarationProvider.vue'

export interface InfoItem {
  label: string
  value?: string | number | null
  full?: boolean
}

const props = defineProps<{
  product: Product
  activeTab: string
  unlocked: boolean
  baseInfoItems: InfoItem[]
}>()

const detail = computed(() => props.product.typeDetail.dashboard)

const dashboardItems = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: '时间范围', value: d.timeRange },
    { label: '更新周期', value: d.updateCycle },
    { label: '指标数量', value: d.metrics.length ? `${d.metrics.length} 个` : '—' },
    { label: '图表面板', value: d.panels.length ? `${d.panels.length} 个` : '—' },
    { label: '导出规则', value: d.exportRule, full: true }
  ]
})

function gateMode(mode: PreviewMode, unlocked: boolean): 'visible' | 'masked' | 'locked' {
  if (mode === 'visible' || unlocked) return 'visible'
  return mode
}

function chartIcon(chartType: 'line' | 'bar' | 'number'): string {
  if (chartType === 'line') return '📈'
  if (chartType === 'bar') return '📊'
  return '🔢'
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString()
  return value
}
</script>

<template>
  <div v-if="detail">
    <!-- Tab: overview 基本信息 -->
    <div v-if="activeTab === 'overview'" class="space-y-5">
      <!-- 基本信息（3 列） -->
      <div>
        <h3 class="mb-3 text-sm font-semibold text-slate-800">基本信息</h3>
        <div class="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
          <div
            v-for="(item, i) in baseInfoItems"
            :key="`base-${item.label}-${i}`"
            class="bg-white p-3"
            :class="item.full ? 'col-span-3' : ''"
          >
            <div class="text-xs text-slate-400">{{ item.label }}</div>
            <div class="mt-1 text-sm font-semibold text-slate-900">{{ displayValue(item.value) }}</div>
          </div>
        </div>
      </div>

      <!-- 看板信息（3 列） -->
      <div>
        <h3 class="mb-3 text-sm font-semibold text-slate-800">看板信息</h3>
        <div class="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
          <div
            v-for="(item, i) in dashboardItems"
            :key="`dash-${item.label}-${i}`"
            class="bg-white p-3"
            :class="item.full ? 'col-span-3' : ''"
          >
            <div class="text-xs text-slate-400">{{ item.label }}</div>
            <div class="mt-1 text-sm font-semibold text-slate-900">{{ displayValue(item.value) }}</div>
          </div>
        </div>
      </div>

      <!-- 商品说明书 -->
      <div class="rounded-lg border border-slate-200 p-4">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">商品说明书</h3>
        <div class="space-y-2 text-sm leading-relaxed text-slate-600">
          <div><span class="text-slate-400">价值主张：</span>{{ product.valueProposition }}</div>
          <div><span class="text-slate-400">详细描述：</span>{{ product.description }}</div>
          <div><span class="text-slate-400">质量承诺：</span>{{ product.qualityPromise }}</div>
          <div><span class="text-slate-400">合规声明：</span>{{ product.complianceNote }}</div>
        </div>
      </div>

      <!-- 应用场景 -->
      <div v-if="product.scenarios?.length">
        <h3 class="mb-2 text-sm font-semibold text-slate-800">应用场景</h3>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="s in product.scenarios"
            :key="s"
            class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
          >{{ s }}</span>
        </div>
      </div>

      <!-- 声明信息 + 提供方信息（仅空间商品） -->
      <SpaceDeclarationProvider :space-meta="product.spaceMeta" />
    </div>

    <!-- Tab: preview 看板预览（2 列） -->
    <div v-else-if="activeTab === 'preview'" class="grid grid-cols-2 gap-4">
      <div
        v-for="panel in detail.panels"
        :key="panel.id"
        class="rounded-lg border border-slate-200 p-4"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-800">{{ panel.title }}</span>
          <span class="text-xs text-slate-400">{{ chartIcon(panel.chartType) }}</span>
        </div>
        <!-- inline content gate -->
        <div v-if="gateMode(panel.preview, unlocked) === 'visible'" class="text-sm text-slate-500">
          {{ panel.summary }}
        </div>
        <div v-else-if="gateMode(panel.preview, unlocked) === 'masked'" class="space-y-1.5">
          <div class="h-3 rounded bg-slate-100"></div>
          <div class="h-3 rounded bg-slate-100"></div>
          <div class="h-3 rounded bg-slate-100"></div>
          <div class="pt-1 text-xs text-slate-400">🔒 解锁后查看关键内容</div>
        </div>
        <div v-else class="flex flex-col items-center py-4">
          <span class="text-2xl">🔒</span>
          <div class="mt-1.5 text-sm font-medium text-slate-600">{{ panel.title }}</div>
          <div class="mt-0.5 text-xs text-slate-400">解锁后可阅读完整内容</div>
        </div>
      </div>
    </div>

    <!-- Tab: metrics 指标定义（购买前公开，不受内容解锁状态限制） -->
    <div v-else-if="activeTab === 'metrics'" class="grid grid-cols-2 gap-4">
      <div
        v-for="metric in detail.metrics"
        :key="metric.name"
        class="rounded-lg border border-slate-200 p-4"
      >
        <div class="mb-2 text-sm font-semibold text-slate-800">{{ metric.name }}</div>
        <div class="space-y-1.5 text-sm text-slate-500">
          <div><span class="text-slate-400">指标描述：</span>{{ metric.definition }}</div>
          <div><span class="text-slate-400">计算公式：</span>{{ metric.formula }}</div>
          <div><span class="text-slate-400">支持维度：</span>{{ metric.dimensions.join('、') }}</div>
        </div>
      </div>
    </div>

    <!-- Tab: updates 更新与导出 -->
    <div v-else-if="activeTab === 'updates'" class="space-y-3">
      <div class="space-y-2 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
        <div><span class="text-slate-400">更新周期：</span>{{ detail.updateCycle }}</div>
        <div><span class="text-slate-400">导出规则：</span>{{ detail.exportRule }}</div>
      </div>
      <div
        v-if="product.entitlementPolicy?.kind === 'term'"
        class="rounded-lg bg-amber-50 p-3 text-sm text-amber-700"
      >
        单品购买后有效 {{ product.entitlementPolicy.months }} 个月，期间持续获得更新。
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-sm text-slate-400">资料准备中</div>
</template>
