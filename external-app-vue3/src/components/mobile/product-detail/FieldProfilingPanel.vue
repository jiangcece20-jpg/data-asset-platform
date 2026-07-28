<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  DatasetDetail,
  FieldProfiling,
  NumericFieldProfiling,
  CategoricalFieldProfiling,
  IdentifierFieldProfiling,
  DateTimeFieldProfiling,
  BooleanFieldProfiling,
  DistributionBucket
} from '@/types/domain'
import InfoGrid, { type InfoItem } from './InfoGrid.vue'

const props = defineProps<{ detail: DatasetDetail }>()

/**
 * 可探查维度 = 后台开启了 profilingEnabled 且已产出探查结果的字段。
 * 不再提供整表概览；仅按字段维度展示。
 */
const dimensions = computed(() => {
  const stats = props.detail.fieldProfiling ?? []
  return props.detail.fields
    .filter((f) => f.profilingEnabled && stats.some((s) => s.fieldName === f.name))
    .map((f) => ({ key: f.name, label: f.meaning || f.name }))
})

const active = ref('')

// 切换商品后回到第一个维度
watch(
  () => props.detail,
  () => { active.value = dimensions.value[0]?.key ?? '' },
  { immediate: true }
)

const currentStat = computed(() =>
  (props.detail.fieldProfiling ?? []).find((s) => s.fieldName === active.value)
)

// ---- 类型守卫（strict:false 下判别联合需手动收窄） ----
function isNumeric(s: FieldProfiling): s is NumericFieldProfiling { return s.kind === 'numeric' }
function isCategorical(s: FieldProfiling): s is CategoricalFieldProfiling { return s.kind === 'categorical' }
function isIdentifier(s: FieldProfiling): s is IdentifierFieldProfiling { return s.kind === 'identifier' }
function isDateTime(s: FieldProfiling): s is DateTimeFieldProfiling { return s.kind === 'datetime' }
function isBoolean(s: FieldProfiling): s is BooleanFieldProfiling { return s.kind === 'boolean' }

// ---- 按类型构建指标卡 ----
const statItems = computed<InfoItem[]>(() => {
  const s = currentStat.value
  if (!s) return []
  const tail: InfoItem[] = [
    { label: '空值率', value: s.nullRate },
    { label: '唯一值数', value: s.distinctCount.toLocaleString() },
    { label: '更新时间', value: s.updatedAt }
  ]
  if (isNumeric(s)) {
    return [
      { label: '最小值', value: s.min },
      { label: '最大值', value: s.max },
      { label: '平均值', value: s.avg },
      ...(s.median ? [{ label: '中位数', value: s.median }] : []),
      ...(s.p25 ? [{ label: 'P25', value: s.p25 }] : []),
      ...(s.p75 ? [{ label: 'P75', value: s.p75 }] : []),
      ...tail
    ]
  }
  if (isIdentifier(s)) {
    return [
      { label: '唯一性', value: s.uniqueness },
      ...(s.samplePattern ? [{ label: '样例格式', value: s.samplePattern, full: true }] : []),
      ...tail
    ]
  }
  if (isDateTime(s)) {
    return [
      { label: '最早日期', value: s.minDate },
      { label: '最晚日期', value: s.maxDate },
      { label: '时间跨度', value: s.span },
      ...tail
    ]
  }
  if (isBoolean(s)) {
    return [
      { label: 'TRUE', value: `${s.trueCount.toLocaleString()}（${s.truePercent}%）` },
      { label: 'FALSE', value: `${s.falseCount.toLocaleString()}（${100 - s.truePercent}%）` },
      ...tail
    ]
  }
  // categorical
  return tail
})

// ---- 分布数据（数值型直方图 / 分类型 TOP / 时间型分布） ----
const distributionData = computed<DistributionBucket[]>(() => {
  const s = currentStat.value
  if (!s) return []
  if (isNumeric(s)) return s.histogram
  if (isCategorical(s)) return s.topValues
  if (isDateTime(s)) return s.distribution
  return []
})

const distributionTitle = computed(() => {
  const s = currentStat.value
  if (!s) return ''
  if (isNumeric(s)) return '区间分布直方图'
  if (isCategorical(s)) return 'TOP 值分布'
  if (isDateTime(s)) return '时间分布'
  return ''
})

const showDistribution = computed(() => distributionData.value.length > 0)
const showBooleanBar = computed(() => {
  const s = currentStat.value
  return Boolean(s && isBoolean(s))
})
const booleanBar = computed(() => {
  const s = currentStat.value
  if (!s || !isBoolean(s)) return null
  return { truePercent: s.truePercent, falsePercent: 100 - s.truePercent }
})

const kindLabel: Record<string, string> = {
  numeric: '数值型',
  categorical: '分类型',
  identifier: '标识型',
  datetime: '时间型',
  boolean: '布尔型'
}
</script>

<template>
  <div class="space-y-3">
    <!-- 维度切换：横向 chip，无整表概览 -->
    <div v-if="dimensions.length" class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="探查维度">
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

    <template v-if="currentStat">
      <!-- 类型标签 -->
      <div class="flex items-center gap-2">
        <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{{ kindLabel[currentStat.kind] }}</span>
      </div>

      <!-- 指标卡 -->
      <InfoGrid :items="statItems" />

      <!-- 布尔型 TRUE/FALSE 条 -->
      <div v-if="showBooleanBar && booleanBar" class="pt-1">
        <div class="mb-2 text-[12px] font-medium text-slate-500">TRUE / FALSE 占比</div>
        <div class="flex h-6 overflow-hidden rounded-full">
          <div class="flex items-center justify-center bg-emerald-400 text-[11px] text-white" :style="{ width: booleanBar.truePercent + '%' }">
            <span v-if="booleanBar.truePercent >= 15">{{ booleanBar.truePercent }}%</span>
          </div>
          <div class="flex items-center justify-center bg-slate-300 text-[11px] text-slate-600" :style="{ width: booleanBar.falsePercent + '%' }">
            <span v-if="booleanBar.falsePercent >= 15">{{ booleanBar.falsePercent }}%</span>
          </div>
        </div>
      </div>

      <!-- 分布图（数值型直方图 / 分类型 TOP / 时间型分布） -->
      <div v-if="showDistribution" class="pt-1">
        <div class="mb-2 text-[12px] font-medium text-slate-500">{{ distributionTitle }}</div>
        <div class="space-y-2">
          <div v-for="bucket in distributionData" :key="bucket.label">
            <div class="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
              <span class="truncate text-slate-700">{{ bucket.label }}</span>
              <span class="shrink-0 text-slate-400">{{ bucket.count.toLocaleString() }} · {{ bucket.percent }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-brand-500"
                :style="{ width: `${Math.min(Math.max(bucket.percent, 0), 100)}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 异常提示 -->
      <div v-if="currentStat.anomalies" class="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
        ⚠️ {{ currentStat.anomalies }}
      </div>
    </template>

    <div v-else-if="!dimensions.length" class="py-8 text-center text-[13px] text-slate-400">
      暂无可探查字段
    </div>
    <div v-else class="py-8 text-center text-[13px] text-slate-400">
      该字段暂无探查结果
    </div>

    <div class="pt-1 text-[11px] text-slate-400">
      探查结果基于脱敏样本统计，数值经区间化处理，仅供评估参考。
    </div>
  </div>
</template>
