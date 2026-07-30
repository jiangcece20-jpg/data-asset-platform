<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import InfoGrid, { type InfoItem } from './InfoGrid.vue'
import ScrollTable, { type ScrollColumn } from './ScrollTable.vue'
import FieldProfilingPanel from './FieldProfilingPanel.vue'

const props = defineProps<{ product: Product; activeTab: 'basic' | 'fields' | 'samples' | 'profiling'; baseInfoItems: InfoItem[] }>()

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

/** 合并基础信息 + 数据集特有指标为一个表格 */
const combinedItems = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return props.baseInfoItems
  return [
    ...props.baseInfoItems,
    { label: '数据粒度', value: d.granularity },
    { label: '时间范围', value: d.timeRange },
    { label: '数据行数', value: d.rowCount },
    { label: '字段数', value: d.fields.length ? `${d.fields.length} 个` : undefined },
    { label: '质量更新时间', value: d.qualityUpdatedAt },
    { label: '样本生成时间', value: d.sampleGeneratedAt }
  ]
})
</script>

<template>
  <div v-if="detail">
    <!-- 基本信息（合并基础信息 + 数据集指标） -->
    <template v-if="activeTab === 'basic'">
      <InfoGrid :items="combinedItems" />

      <div class="mt-2 flex flex-wrap gap-1.5">
        <span v-for="s in product.scenarios" :key="s" class="tag-chip">{{ s }}</span>
      </div>
      <div v-if="product.spaceProductNo" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
        空间商品编号 {{ product.spaceProductNo }}（只读，来自可信空间，同步于 {{ product.spaceSyncedAt }}）
      </div>

      <!-- 空间分类分级（结构化） -->
      <div v-if="product.spaceMeta?.classificationStandard" class="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div class="mb-1.5 flex items-center gap-2">
          <span class="text-[12px] font-medium text-slate-500">分类分级</span>
          <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
        </div>
        <div class="space-y-1 text-[12px] text-slate-700">
          <div><span class="text-slate-400">分类标准：</span>{{ product.spaceMeta.classificationStandard }}</div>
          <div><span class="text-slate-400">分类路径：</span>{{ product.spaceMeta.classificationPath }}</div>
          <div><span class="text-slate-400">分级：</span>{{ product.spaceMeta.classificationLevel }} 级</div>
        </div>
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
      <template v-if="product.availability === 'published' && detail.sampleRows.length > 0">
        <div class="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
          脱敏样例 · 生成于 {{ detail.sampleGeneratedAt }} · 仅供评估，不可用于生产
        </div>
        <ScrollTable :columns="sampleColumns" :rows="detail.sampleRows" sticky-first />
      </template>
      <div v-else class="py-8 text-center text-[13px] text-slate-400">
        上架审核通过后提供脱敏样例
      </div>
    </div>

    <!-- 探查报告：整表概览 + 按字段维度切换 -->
    <template v-else-if="activeTab === 'profiling'">
      <FieldProfilingPanel v-if="product.availability === 'published'" :detail="detail" />
      <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
    </template>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
</template>
