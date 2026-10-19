<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import InfoGrid, { type InfoItem } from './InfoGrid.vue'
import ScrollTable, { type ScrollColumn } from './ScrollTable.vue'
import FieldProfilingPanel from './FieldProfilingPanel.vue'
import { datasetOverviewMetrics } from '@/domain/datasetMetrics'

const props = defineProps<{ product: Product; activeTab: 'basic' | 'fields' | 'samples' | 'profiling' }>()

const detail = computed(() => props.product.typeDetail.dataset)

const fieldColumns: ScrollColumn[] = [
  { key: 'name', label: '字段名', mono: true },
  { key: 'dataType', label: '类型' },
  { key: 'meaning', label: '业务含义' },
  { key: 'description', label: '描述' },
  { key: 'primaryKey', label: '主键', align: 'center' },
  { key: 'nullable', label: '可空', align: 'center' },
  { key: 'sensitivity', label: '敏感等级', align: 'center' }
]

const fieldRows = computed(() =>
  (detail.value?.fields ?? []).map((f) => ({
    name: f.name,
    dataType: f.dataType,
    meaning: f.meaning,
    description: f.description,
    primaryKey: f.primaryKey ? '🔑' : '',
    nullable: f.nullable ? '✓' : '✗',
    sensitivity: f.sensitivity ?? '—'
  }))
)

const sampleColumns = computed<ScrollColumn[]>(() =>
  (detail.value?.sampleColumns ?? []).map((col) => ({ key: col, label: col }))
)

const datasetItems = computed<InfoItem[]>(() => datasetOverviewMetrics(detail.value))
</script>

<template>
  <div v-if="detail">
    <!-- 关键指标（数据集专属，仅已配置项） -->
    <template v-if="activeTab === 'basic'">
      <div data-testid="dataset-overview-metrics">
        <InfoGrid :items="datasetItems" :keep-empty="detail.blankOverview" />
      </div>
    </template>

    <!-- 字段信息：横向滑动，首列字段名吸附 -->
    <ScrollTable
      v-else-if="activeTab === 'fields'"
      :columns="fieldColumns"
      :rows="fieldRows"
      sticky-first
    />

    <!-- 样例数据 -->
    <div v-else-if="activeTab === 'samples'">
      <template v-if="product.hasSampleData !== false && detail.sampleRows.length > 0">
        <div class="mb-2 rounded-lg bg-warning-50 px-3 py-1.5 text-[11px] text-warning-600">
          脱敏样例 · 生成于 {{ detail.sampleGeneratedAt }} · 仅供评估，不可用于生产
        </div>
        <ScrollTable :columns="sampleColumns" :rows="detail.sampleRows" sticky-first />
      </template>
      <div v-else class="py-8 text-center text-[13px] text-ink-400">当前无样例</div>
    </div>

    <!-- 探查报告：整表概览 + 按字段维度切换 -->
    <template v-else-if="activeTab === 'profiling'">
      <FieldProfilingPanel v-if="product.availability === 'published'" :detail="detail" />
      <div v-else class="py-8 text-center text-[13px] text-ink-400">资料准备中</div>
    </template>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-ink-400">资料准备中</div>
</template>
