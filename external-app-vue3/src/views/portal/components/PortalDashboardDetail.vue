<script setup lang="ts">
import { computed } from 'vue'
import type { Product, PreviewMode } from '@/types/domain'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'
import ProductContentPeek from '@/components/ProductContentPeek.vue'
import ReportPreviewGallery from '@/components/shared/ReportPreviewGallery.vue'
import { dashboardOverviewFields } from '@/domain/productDetailFields'

const props = defineProps<{
  product: Product
  activeTab: string
  unlocked: boolean
  expired?: boolean
}>()

const detail = computed(() => props.product.typeDetail.dashboard)

const dashboardItems = computed(() => dashboardOverviewFields(detail.value))

function gateMode(mode: PreviewMode, unlocked: boolean): 'visible' | 'masked' | 'locked' {
  if (mode === 'visible' || unlocked) return 'visible'
  return mode
}

function chartIcon(chartType: 'line' | 'bar' | 'number'): string {
  if (chartType === 'line') return '折线图'
  if (chartType === 'bar') return '柱状图'
  return '指标卡'
}

</script>

<template>
  <div v-if="detail">
    <!-- Tab: overview 基本信息 -->
    <div v-if="activeTab === 'overview'" class="space-y-5">
      <!-- 关键指标（看板专属） -->
      <div data-testid="dashboard-overview-info">
        <h3 class="mb-3 text-sm font-semibold text-ink-900">看板信息</h3>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div
            v-for="(item, i) in dashboardItems"
            :key="`dash-${item.label}-${i}`"
            class="min-w-0 rounded-md border border-ink-200 bg-white p-3"
          >
            <div class="text-xs text-ink-500">{{ item.label }}</div>
            <div class="mt-1 break-words text-sm font-semibold text-ink-900">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <ProductInfoSections :product="product" :compact-dashboard="product.origin === 'app_content'" />

      <!-- 商品说明书 -->
      <div class="rounded-lg border border-ink-200 p-4" data-testid="dashboard-manual">
        <h3 class="mb-3 text-sm font-semibold text-ink-900">商品说明书</h3>
        <div class="divide-y divide-dashed divide-ink-100 text-sm leading-relaxed">
          <div v-for="item in [
            { label: '价值主张', value: product.valueProposition },
            { label: '详细描述', value: product.description },
            { label: '质量承诺', value: product.qualityPromise },
            { label: '合规声明', value: product.complianceNote }
          ]" :key="item.label" data-testid="dashboard-manual-item" class="py-3 first:pt-0 last:pb-0">
            <div class="text-xs text-ink-500">{{ item.label }}</div>
            <div class="mt-1 whitespace-pre-line text-ink-700">{{ item.value || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- 产品介绍（空间同步富文本） -->
      <div v-if="product.spaceMeta?.productIntroduction" class="space-y-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-ink-900">产品介绍</h3>
          <span class="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600">来自可信空间</span>
        </div>
        <p class="whitespace-pre-line text-sm leading-relaxed text-ink-600">{{ product.spaceMeta.productIntroduction }}</p>
      </div>
    </div>

    <div v-else-if="activeTab === 'preview' && expired && product.price.model !== 'member_free' && !product.acquisitions.includes('free')" data-testid="dashboard-expired-gate" class="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">完整看板不可查看</div>

    <!-- 看板预览 -->
    <div v-else-if="activeTab === 'preview'" class="grid grid-cols-2 gap-4">
      <ReportPreviewGallery
        :preview-images="detail.previewImages"
        platform="pc"
        title="看板预览"
        class="col-span-2"
      />
      <ProductContentPeek :product="product" class="col-span-2" />
      <div
        v-for="panel in detail.panels"
        :key="panel.id"
        class="rounded-lg border border-ink-200 p-4"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-semibold text-ink-900">{{ panel.title }}</span>
          <span class="text-xs text-ink-500">{{ chartIcon(panel.chartType) }}</span>
        </div>
        <!-- inline content gate -->
        <div v-if="gateMode(panel.preview, unlocked) === 'visible'" class="text-sm text-ink-500">
          {{ panel.summary }}
        </div>
        <div v-else-if="gateMode(panel.preview, unlocked) === 'masked'" class="space-y-1.5">
          <div class="h-3 rounded bg-ink-100"></div>
          <div class="h-3 rounded bg-ink-100"></div>
          <div class="h-3 rounded bg-ink-100"></div>
          <div class="pt-1 text-xs text-ink-500"> 解锁后查看关键内容</div>
        </div>
        <div v-else class="flex flex-col items-center py-4">
          <span class="text-2xl"></span>
          <div class="mt-1.5 text-sm font-medium text-ink-600">{{ panel.title }}</div>
          <div class="mt-0.5 text-xs text-ink-500">解锁后可阅读完整内容</div>
        </div>
      </div>
    </div>

    <!-- Tab: metrics 指标定义（购买前公开，不受内容解锁状态限制） -->
    <div v-else-if="activeTab === 'metrics'" class="grid grid-cols-2 gap-4">
      <div
        v-for="metric in detail.metrics"
        :key="metric.name"
        class="rounded-lg border border-ink-200 p-4"
      >
        <div class="mb-2 text-sm font-semibold text-ink-900">{{ metric.name }}</div>
        <div class="space-y-1.5 text-sm text-ink-500">
          <div><span class="text-ink-500">指标描述：</span>{{ metric.definition }}</div>
          <div><span class="text-ink-500">计算公式：</span>{{ metric.formula }}</div>
          <div><span class="text-ink-500">支持维度：</span>{{ metric.dimensions.join('、') }}</div>
        </div>
      </div>
    </div>

    <!-- Tab: updates 更新与导出 -->
    <div v-else-if="activeTab === 'updates'" class="space-y-3">
      <div class="space-y-2 rounded-lg border border-ink-200 p-4 text-sm text-ink-700">
        <div><span class="text-ink-500">更新周期：</span>{{ detail.updateCycle }}</div>
        <div><span class="text-ink-500">导出规则：</span>{{ detail.exportRule }}</div>
      </div>
      <div
        v-if="product.entitlementPolicy?.kind === 'term'"
        class="rounded-lg bg-violet-50 p-3 text-sm text-violet-600"
      >
        企业购买后有效 {{ product.entitlementPolicy.months }} 个月，期间持续获得更新。
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-sm text-ink-500">资料准备中</div>
</template>
