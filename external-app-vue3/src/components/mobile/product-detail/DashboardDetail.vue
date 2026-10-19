<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import ContentGate from './ContentGate.vue'
import InfoGrid from './InfoGrid.vue'
import { dashboardOverviewFields } from '@/domain/productDetailFields'
import ProductContentPeek from '@/components/ProductContentPeek.vue'
import ReportPreviewGallery from '@/components/shared/ReportPreviewGallery.vue'

const props = defineProps<{
  product: Product
  activeTab: 'overview' | 'preview' | 'metrics' | 'updates'
  unlocked: boolean
  expired?: boolean
}>()

const detail = computed(() => props.product.typeDetail.dashboard)

const basicItems = computed(() => dashboardOverviewFields(detail.value))
</script>

<template>
  <div v-if="detail">
    <!-- 基本信息 -->
    <InfoGrid v-if="activeTab === 'overview'" :items="basicItems" />

    <div v-else-if="activeTab === 'preview' && expired && product.price.model !== 'member_free' && !product.acquisitions.includes('free')" data-testid="dashboard-expired-gate" class="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">完整看板不可查看</div>

    <!-- 看板预览 -->
    <div v-else-if="activeTab === 'preview'" class="space-y-3">
      <ReportPreviewGallery :preview-images="detail.previewImages" platform="app" title="看板预览" />
      <ProductContentPeek :product="product" />
      <div v-for="panel in detail.panels" :key="panel.id" class="rounded-xl border border-ink-100 p-3">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[13px] font-semibold text-ink-900">{{ panel.title }}</span>
          <span class="text-[11px] text-ink-400">{{ panel.chartType === 'line' ? '📈' : panel.chartType === 'bar' ? '📊' : '🔢' }}</span>
        </div>
        <ContentGate :mode="panel.preview" :unlocked="unlocked" :label="panel.title">
          <div class="text-[12px] text-ink-500">{{ panel.summary }}</div>
        </ContentGate>
      </div>
    </div>

    <!-- 指标定义属于购买前可见的商品说明，不受内容解锁状态限制 -->
    <div v-else-if="activeTab === 'metrics'" class="space-y-3">
      <div v-for="metric in detail.metrics" :key="metric.name" class="border-b border-ink-100 pb-3 last:border-0">
        <div class="mb-1 text-[13px] font-semibold text-ink-900">{{ metric.name }}</div>
        <div class="space-y-1 text-[12px] text-ink-500">
          <div><span class="text-ink-400">指标描述：</span>{{ metric.definition }}</div>
          <div><span class="text-ink-400">计算公式：</span>{{ metric.formula }}</div>
          <div><span class="text-ink-400">支持维度：</span>{{ metric.dimensions.join('、') }}</div>
        </div>
      </div>
    </div>

    <!-- 更新与导出 -->
    <div v-else-if="activeTab === 'updates'" class="space-y-3 text-[13px] text-ink-700">
      <div><span class="text-ink-400">更新周期：</span>{{ detail.updateCycle }}</div>
      <div><span class="text-ink-400">导出规则：</span>{{ detail.exportRule }}</div>
      <div v-if="product.entitlementPolicy?.kind === 'term'" class="rounded-lg bg-warning-50 p-3 text-[12px] text-warning-600">
        企业购买后有效 {{ product.entitlementPolicy.months }} 个月，期间持续获得更新。
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-ink-400">资料准备中</div>
</template>
