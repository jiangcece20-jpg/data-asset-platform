<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  Product,
  DatasetDetail,
  FieldProfiling,
  NumericFieldProfiling,
  CategoricalFieldProfiling,
  IdentifierFieldProfiling,
  DateTimeFieldProfiling,
  BooleanFieldProfiling,
  DistributionBucket
} from '@/types/domain'

export interface InfoItem {
  label: string
  value?: string | number | null
  full?: boolean
}

const props = defineProps<{
  product: Product
  activeTab: string
  baseInfoItems: InfoItem[]
}>()

const detail = computed<DatasetDetail | undefined>(() => props.product.typeDetail.dataset)

/** 数据集关键指标（用户判断数据适用性的核心信息，顶部醒目展示） */
const datasetItems = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: '数据粒度', value: d.granularity },
    { label: '时间范围', value: d.timeRange },
    { label: '数据行数', value: d.rowCount },
    { label: '字段数', value: d.fields.length ? `${d.fields.length} 个` : null }
  ]
})

/** 字段表示例值列：仅当存在字段级示例值时展示（可信空间同步商品） */
const hasSampleValues = computed(() => (detail.value?.fields ?? []).some((f) => f.sampleValue != null))

// ---- 空值标准化 ----
function displayValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return v.toLocaleString()
  return v
}

// ---- 类型守卫 ----
function isNumeric(s: FieldProfiling): s is NumericFieldProfiling { return s.kind === 'numeric' }
function isCategorical(s: FieldProfiling): s is CategoricalFieldProfiling { return s.kind === 'categorical' }
function isIdentifier(s: FieldProfiling): s is IdentifierFieldProfiling { return s.kind === 'identifier' }
function isDateTime(s: FieldProfiling): s is DateTimeFieldProfiling { return s.kind === 'datetime' }
function isBoolean(s: FieldProfiling): s is BooleanFieldProfiling { return s.kind === 'boolean' }

const kindLabel: Record<string, string> = {
  numeric: '数值型',
  categorical: '分类型',
  identifier: '标识型',
  datetime: '时间型',
  boolean: '布尔型'
}

// ---- 探查维度 ----
const dimensions = computed(() => {
  const d = detail.value
  if (!d) return []
  const stats = d.fieldProfiling ?? []
  return d.fields
    .filter((f) => f.profilingEnabled && stats.some((s) => s.fieldName === f.name))
    .map((f) => ({ key: f.name, label: f.meaning || f.name }))
})

const active = ref('')

watch(
  () => detail.value,
  () => { active.value = dimensions.value[0]?.key ?? '' },
  { immediate: true }
)

const currentStat = computed(() => {
  const d = detail.value
  if (!d) return undefined
  return (d.fieldProfiling ?? []).find((s) => s.fieldName === active.value)
})

// ---- 指标项 ----
interface StatItem { label: string; value: string }

const statItems = computed<StatItem[]>(() => {
  const s = currentStat.value
  if (!s) return []
  const tail: StatItem[] = [
    { label: '空值率', value: displayValue(s.nullRate) },
    { label: '唯一值数', value: displayValue(s.distinctCount) },
    { label: '更新时间', value: displayValue(s.updatedAt) }
  ]
  if (isNumeric(s)) {
    return [
      { label: '最小值', value: displayValue(s.min) },
      { label: '最大值', value: displayValue(s.max) },
      { label: '平均值', value: displayValue(s.avg) },
      ...(s.median ? [{ label: '中位数', value: displayValue(s.median) }] : []),
      ...(s.p25 ? [{ label: 'P25', value: displayValue(s.p25) }] : []),
      ...(s.p75 ? [{ label: 'P75', value: displayValue(s.p75) }] : []),
      ...tail
    ]
  }
  if (isIdentifier(s)) {
    return [
      { label: '唯一性', value: displayValue(s.uniqueness) },
      ...(s.samplePattern ? [{ label: '样例格式', value: displayValue(s.samplePattern) }] : []),
      ...tail
    ]
  }
  if (isDateTime(s)) {
    return [
      { label: '最早日期', value: displayValue(s.minDate) },
      { label: '最晚日期', value: displayValue(s.maxDate) },
      { label: '时间跨度', value: displayValue(s.span) },
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
</script>

<template>
  <div v-if="detail">
    <!-- ==================== Tab 1: 基本信息 ==================== -->
    <div v-if="activeTab === 'basic'" class="space-y-6">
      <!-- 数据集关键指标：粒度/时间范围/行数/字段数，高亮卡置顶 -->
      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="item in datasetItems"
          :key="item.label"
          class="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3"
        >
          <div class="text-xs text-blue-600/70">{{ item.label }}</div>
          <div class="mt-1 text-lg font-bold text-blue-900">{{ displayValue(item.value) }}</div>
        </div>
      </div>

      <!-- 3列信息网格 -->
      <div class="grid grid-cols-3 gap-px bg-slate-100">
        <div
          v-for="(item, idx) in baseInfoItems"
          :key="`${item.label}-${idx}`"
          class="bg-white px-4 py-3"
          :class="item.full ? 'col-span-3' : ''"
        >
          <div class="text-xs text-slate-400">{{ item.label }}</div>
          <div class="mt-1 text-sm font-semibold text-slate-900">{{ displayValue(item.value) }}</div>
        </div>
      </div>

      <!-- 商品说明书 -->
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-slate-800">商品说明书</h3>
        <div class="space-y-3 text-sm leading-relaxed text-slate-600">
          <div>
            <span class="text-slate-400">价值主张：</span>{{ product.valueProposition }}
          </div>
          <div>
            <span class="text-slate-400">详细描述：</span>{{ product.description }}
          </div>
          <div>
            <span class="text-slate-400">质量承诺：</span>{{ product.qualityPromise }}
          </div>
          <div>
            <span class="text-slate-400">合规声明：</span>{{ product.complianceNote }}
          </div>
        </div>
        <div v-if="product.scenarios?.length" class="flex flex-wrap gap-2">
          <span
            v-for="s in product.scenarios"
            :key="s"
            class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
          >{{ s }}</span>
        </div>
      </div>
    </div>

    <!-- ==================== Tab 2: 字段信息 ==================== -->
    <div v-else-if="activeTab === 'fields'">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50 text-xs text-slate-400">
            <th class="px-4 py-3 text-left font-medium">字段名</th>
            <th class="px-4 py-3 text-left font-medium">类型</th>
            <th class="px-4 py-3 text-left font-medium">业务含义</th>
            <th class="px-4 py-3 text-left font-medium">描述</th>
            <th class="px-4 py-3 text-center font-medium">主键</th>
            <th class="px-4 py-3 text-center font-medium">可空</th>
            <th class="px-4 py-3 text-center font-medium">敏感等级</th>
            <th v-if="hasSampleValues" class="px-4 py-3 text-left font-medium">示例值</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="f in detail.fields"
            :key="f.name"
            class="border-b border-slate-100 hover:bg-slate-50/60"
          >
            <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ f.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ f.dataType }}</td>
            <td class="px-4 py-3 text-slate-600">{{ f.meaning }}</td>
            <td class="px-4 py-3 text-slate-600">{{ f.description }}</td>
            <td class="px-4 py-3 text-center">{{ f.primaryKey ? '🔑' : '' }}</td>
            <td class="px-4 py-3 text-center">{{ f.nullable ? '✓' : '✗' }}</td>
            <td class="px-4 py-3 text-center text-slate-600">{{ f.sensitivity ?? '—' }}</td>
            <td v-if="hasSampleValues" class="px-4 py-3 font-mono text-xs text-slate-500">{{ f.sampleValue ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== Tab 3: 样例数据 ==================== -->
    <div v-else-if="activeTab === 'samples'">
      <template v-if="product.availability === 'published' && detail.sampleRows.length > 0">
        <div class="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
          脱敏样例 · 生成于 {{ detail.sampleGeneratedAt }} · 仅供评估，不可用于生产
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs text-slate-400">
              <th
                v-for="col in detail.sampleColumns"
                :key="col"
                class="px-4 py-3 text-left font-medium"
              >{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in detail.sampleRows"
              :key="idx"
              class="border-b border-slate-100"
            >
              <td
                v-for="col in detail.sampleColumns"
                :key="col"
                class="px-4 py-2.5 text-slate-600"
              >{{ row[col] }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="py-12 text-center text-sm text-slate-400">
        上架审核通过后提供脱敏样例
      </div>
    </div>

    <!-- ==================== Tab 4: 探查报告 ==================== -->
    <div v-else-if="activeTab === 'profiling'">
      <template v-if="product.availability !== 'published'">
        <div class="py-12 text-center text-sm text-slate-400">资料准备中</div>
      </template>
      <template v-else>
        <div v-if="dimensions.length" class="flex gap-4">
          <!-- 左侧字段选择器 -->
          <div class="w-48 shrink-0 space-y-1">
            <button
              v-for="dim in dimensions"
              :key="dim.key"
              class="w-full rounded-lg px-3 py-2 text-left text-sm transition"
              :class="active === dim.key
                ? 'bg-brand-50 font-medium text-brand-600'
                : 'text-slate-600 hover:bg-slate-50'"
              @click="active = dim.key"
            >{{ dim.label }}</button>
          </div>

          <!-- 右侧探查内容 -->
          <div class="min-w-0 flex-1">
            <template v-if="currentStat">
              <!-- 类型标签 -->
              <div class="mb-4">
                <span class="rounded bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                  {{ kindLabel[currentStat.kind] }}
                </span>
              </div>

              <!-- 指标卡 3列网格 -->
              <div class="mb-6 grid grid-cols-3 gap-px bg-slate-100">
                <div
                  v-for="(item, idx) in statItems"
                  :key="`${item.label}-${idx}`"
                  class="bg-white px-4 py-3"
                >
                  <div class="text-xs text-slate-400">{{ item.label }}</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ item.value }}</div>
                </div>
              </div>

              <!-- 布尔型 TRUE/FALSE 占比条 -->
              <div v-if="showBooleanBar && booleanBar" class="mb-6">
                <div class="mb-2 text-xs font-medium text-slate-500">TRUE / FALSE 占比</div>
                <div class="flex h-7 overflow-hidden rounded-full">
                  <div
                    class="flex items-center justify-center bg-emerald-400 text-xs text-white"
                    :style="{ width: booleanBar.truePercent + '%' }"
                  >
                    <span v-if="booleanBar.truePercent >= 10">{{ booleanBar.truePercent }}%</span>
                  </div>
                  <div
                    class="flex items-center justify-center bg-slate-300 text-xs text-slate-600"
                    :style="{ width: booleanBar.falsePercent + '%' }"
                  >
                    <span v-if="booleanBar.falsePercent >= 10">{{ booleanBar.falsePercent }}%</span>
                  </div>
                </div>
              </div>

              <!-- 分布图（数值型直方图 / 分类型 TOP / 时间型分布） -->
              <div v-if="showDistribution" class="mb-6">
                <div class="mb-3 text-xs font-medium text-slate-500">{{ distributionTitle }}</div>
                <div class="space-y-2.5">
                  <div v-for="bucket in distributionData" :key="bucket.label">
                    <div class="mb-1 flex items-baseline justify-between gap-3 text-xs">
                      <span class="truncate text-slate-700">{{ bucket.label }}</span>
                      <span class="shrink-0 text-slate-400">
                        {{ bucket.count.toLocaleString() }} · {{ bucket.percent }}%
                      </span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full bg-brand-500"
                        :style="{ width: `${Math.min(Math.max(bucket.percent, 0), 100)}%` }"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 异常提示 -->
              <div
                v-if="currentStat.anomalies"
                class="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
              >
                ⚠️ {{ currentStat.anomalies }}
              </div>
            </template>

            <div v-else class="py-12 text-center text-sm text-slate-400">
              该字段暂无探查结果
            </div>

            <!-- 底部说明 -->
            <div class="mt-2 text-xs text-slate-400">
              探查结果基于脱敏样本统计，数值经区间化处理，仅供评估参考。
            </div>
          </div>
        </div>
        <div v-else class="py-12 text-center text-sm text-slate-400">
          暂无可探查字段
        </div>
      </template>
    </div>
  </div>
  <div v-else class="py-12 text-center text-sm text-slate-400">资料准备中</div>
</template>
