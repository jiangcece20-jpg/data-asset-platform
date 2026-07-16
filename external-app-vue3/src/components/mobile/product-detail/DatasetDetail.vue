<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'

const props = defineProps<{ product: Product; activeTab: 'basic' | 'fields' | 'samples' | 'profiling' }>()

const detail = computed(() => props.product.typeDetail.dataset)
</script>

<template>
  <div v-if="detail">
    <!-- 基本信息 -->
    <div v-if="activeTab === 'basic'" class="space-y-3 text-[13px] text-slate-700">
      <div><span class="text-slate-400">粒度：</span>{{ detail.granularity }}</div>
      <div><span class="text-slate-400">时间范围：</span>{{ detail.timeRange }}</div>
      <div><span class="text-slate-400">行数：</span>{{ detail.rowCount.toLocaleString() }}</div>
      <div><span class="text-slate-400">分类分级：</span>{{ detail.classification }}</div>
      <div><span class="text-slate-400">质量更新时间：</span>{{ detail.qualityUpdatedAt || '—' }}</div>
    </div>

    <!-- 字段信息 -->
    <div v-else-if="activeTab === 'fields'" class="overflow-x-auto">
      <table class="w-full text-left text-[12px]">
        <thead class="bg-slate-50 text-slate-400">
          <tr>
            <th class="px-3 py-2 font-medium">字段名</th>
            <th class="px-3 py-2 font-medium">类型</th>
            <th class="px-3 py-2 font-medium">业务含义</th>
            <th class="px-3 py-2 font-medium">描述</th>
            <th class="px-3 py-2 font-medium">主键</th>
            <th class="px-3 py-2 font-medium">可空</th>
            <th class="px-3 py-2 font-medium">敏感等级</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in detail.fields" :key="field.name" class="border-t border-slate-100">
            <td class="px-3 py-2 font-mono text-slate-800">{{ field.name }}</td>
            <td class="px-3 py-2 text-slate-500">{{ field.dataType }}</td>
            <td class="px-3 py-2 text-slate-600">{{ field.meaning }}</td>
            <td class="px-3 py-2 text-slate-500">{{ field.description }}</td>
            <td class="px-3 py-2 text-center">{{ field.primaryKey ? '🔑' : '' }}</td>
            <td class="px-3 py-2 text-center">{{ field.nullable ? '✓' : '✗' }}</td>
            <td class="px-3 py-2 text-center">{{ field.sensitivity || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 样例数据 -->
    <div v-else-if="activeTab === 'samples'">
      <template v-if="product.availability === 'published' && detail.sampleRows.length > 0">
        <div class="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
          脱敏样例 · 生成于 {{ detail.sampleGeneratedAt }} · 仅供评估，不可用于生产
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[12px]">
            <thead class="bg-slate-50 text-slate-400">
              <tr>
                <th v-for="col in detail.sampleColumns" :key="col" class="px-3 py-2 font-medium">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in detail.sampleRows" :key="idx" class="border-t border-slate-100">
                <td v-for="col in detail.sampleColumns" :key="col" class="px-3 py-2 text-slate-600">{{ row[col] ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <div v-else class="py-8 text-center text-[13px] text-slate-400">
        上架审核通过后提供脱敏样例
      </div>
    </div>

    <!-- 探查报告 -->
    <div v-else-if="activeTab === 'profiling'" class="space-y-2 text-[13px] text-slate-700">
      <template v-if="product.availability === 'published'">
        <div><span class="text-slate-400">完整率：</span>{{ detail.profiling.completeness }}</div>
        <div><span class="text-slate-400">唯一性：</span>{{ detail.profiling.uniqueness }}</div>
        <div><span class="text-slate-400">空值率：</span>{{ detail.profiling.nullRate }}</div>
        <div><span class="text-slate-400">分布：</span>{{ detail.profiling.distribution }}</div>
        <div><span class="text-slate-400">异常：</span>{{ detail.profiling.anomalies }}</div>
        <div><span class="text-slate-400">结论：</span>{{ detail.profiling.conclusion }}</div>
        <div><span class="text-slate-400">更新时间：</span>{{ detail.profiling.updatedAt || '—' }}</div>
      </template>
      <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
</template>
