<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import ContentGate from './ContentGate.vue'

const props = defineProps<{
  product: Product
  activeTab: 'overview' | 'preview' | 'metrics' | 'updates'
  unlocked: boolean
}>()

const detail = computed(() => props.product.typeDetail.dashboard)
</script>

<template>
  <div v-if="detail">
    <!-- 基本信息 -->
    <div v-if="activeTab === 'overview'" class="space-y-3 text-[13px] text-slate-700">
      <div><span class="text-slate-400">时间范围：</span>{{ detail.timeRange }}</div>
      <div><span class="text-slate-400">更新周期：</span>{{ detail.updateCycle }}</div>
      <div><span class="text-slate-400">导出规则：</span>{{ detail.exportRule }}</div>
    </div>

    <!-- 看板预览 -->
    <div v-else-if="activeTab === 'preview'" class="space-y-3">
      <div v-for="panel in detail.panels" :key="panel.id" class="rounded-xl border border-slate-100 p-3">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[13px] font-semibold text-slate-800">{{ panel.title }}</span>
          <span class="text-[11px] text-slate-400">{{ panel.chartType === 'line' ? '📈' : panel.chartType === 'bar' ? '📊' : '🔢' }}</span>
        </div>
        <ContentGate :mode="panel.preview" :unlocked="unlocked" :label="panel.title">
          <div class="text-[12px] text-slate-500">{{ panel.summary }}</div>
        </ContentGate>
      </div>
    </div>

    <!-- 指标定义 -->
    <div v-else-if="activeTab === 'metrics'" class="space-y-3">
      <div v-for="metric in detail.metrics" :key="metric.name" class="border-b border-slate-100 pb-3 last:border-0">
        <div class="mb-1 text-[13px] font-semibold text-slate-800">{{ metric.name }}</div>
        <ContentGate :mode="metric.preview" :unlocked="unlocked" :label="metric.name">
          <div class="space-y-1 text-[12px] text-slate-500">
            <div><span class="text-slate-400">定义：</span>{{ metric.definition }}</div>
            <div><span class="text-slate-400">公式：</span>{{ metric.formula }}</div>
            <div><span class="text-slate-400">维度：</span>{{ metric.dimensions.join('、') }}</div>
          </div>
        </ContentGate>
      </div>
    </div>

    <!-- 更新与导出 -->
    <div v-else-if="activeTab === 'updates'" class="space-y-3 text-[13px] text-slate-700">
      <div><span class="text-slate-400">更新周期：</span>{{ detail.updateCycle }}</div>
      <div><span class="text-slate-400">导出规则：</span>{{ detail.exportRule }}</div>
      <div v-if="product.entitlementPolicy?.kind === 'term'" class="rounded-lg bg-amber-50 p-3 text-[12px] text-amber-700">
        单品购买后有效 {{ product.entitlementPolicy.months }} 个月，期间持续获得更新。
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
</template>
