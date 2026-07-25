<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DatasetDetail } from '@/types/domain'
import InfoGrid, { type InfoItem } from './InfoGrid.vue'

const props = defineProps<{ detail: DatasetDetail }>()

const OVERVIEW = '__overview__'

/**
 * 可探查维度 = 整表概览 + 后台开启了 profilingEnabled 且已产出探查结果的字段。
 * 后台未开启或无结果的字段不出现，避免前台暴露未经审核的敏感字段。
 */
const dimensions = computed(() => {
  const stats = props.detail.fieldProfiling ?? []
  const usable = props.detail.fields
    .filter((f) => f.profilingEnabled && stats.some((s) => s.fieldName === f.name))
    .map((f) => ({ key: f.name, label: f.meaning || f.name }))
  return [{ key: OVERVIEW, label: '整表概览' }, ...usable]
})

const active = ref(OVERVIEW)

// 切换商品后回到概览，避免停留在上一个数据集的字段上
watch(
  () => props.detail,
  () => {
    active.value = OVERVIEW
  }
)

const currentStat = computed(() =>
  (props.detail.fieldProfiling ?? []).find((s) => s.fieldName === active.value)
)

const overviewItems = computed<InfoItem[]>(() => {
  const p = props.detail.profiling
  return [
    { label: '完整率', value: p.completeness },
    { label: '唯一性', value: p.uniqueness },
    { label: '空值率', value: p.nullRate },
    { label: '更新时间', value: p.updatedAt },
    { label: '分布特征', value: p.distribution, full: true },
    { label: '异常检测', value: p.anomalies, full: true },
    { label: '探查结论', value: p.conclusion, full: true }
  ]
})

const statItems = computed<InfoItem[]>(() => {
  const s = currentStat.value
  if (!s) return []
  return [
    { label: '空值率', value: s.nullRate },
    { label: '唯一值数', value: s.distinctCount },
    { label: '最小值', value: s.min },
    { label: '最大值', value: s.max },
    { label: '平均值', value: s.avg },
    { label: '更新时间', value: s.updatedAt }
  ]
})
</script>

<template>
  <div class="space-y-3">
    <!-- 维度切换：横向 chip，第一个固定为整表概览 -->
    <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="探查维度">
      <button
        v-for="dim in dimensions"
        :key="dim.key"
        role="tab"
        :aria-selected="active === dim.key"
        :data-dim="dim.key"
        class="whitespace-nowrap rounded-full border px-3 py-1 text-[12px] transition"
        :class="active === dim.key
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-200 bg-white text-slate-500'"
        @click="active = dim.key"
      >
        {{ dim.label }}
      </button>
    </div>

    <!-- 整表概览 -->
    <InfoGrid v-if="active === OVERVIEW" :items="overviewItems" />

    <!-- 单字段探查 -->
    <template v-else-if="currentStat">
      <InfoGrid :items="statItems" />

      <div v-if="currentStat.topValues.length" class="pt-1">
        <div class="mb-2 text-[12px] font-medium text-slate-500">TOP 值分布</div>
        <div class="space-y-2">
          <div v-for="tv in currentStat.topValues" :key="tv.value">
            <div class="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
              <span class="truncate text-slate-700">{{ tv.value }}</span>
              <span class="shrink-0 text-slate-400">{{ tv.count.toLocaleString() }} · {{ tv.percent }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-brand-500"
                :style="{ width: `${Math.min(Math.max(tv.percent, 0), 100)}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentStat.anomalies" class="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
        ⚠️ {{ currentStat.anomalies }}
      </div>
    </template>

    <div v-else class="py-8 text-center text-[13px] text-slate-400">该字段暂无探查结果</div>

    <div class="pt-1 text-[11px] text-slate-400">
      探查结果基于脱敏样本统计，数值经区间化处理，仅供评估参考。
    </div>
  </div>
</template>
