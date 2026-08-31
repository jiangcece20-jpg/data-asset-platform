<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { DistributionBucket } from '@/types/domain'
import {
  TIME_GRAIN_OPTIONS,
  type TimeGrain,
  withFormattedTimeLabels
} from '@/domain/timeDistribution'

const props = defineProps<{
  buckets: DistributionBucket[]
  grain: TimeGrain
}>()

const emit = defineEmits<{
  'update:grain': [grain: TimeGrain]
}>()

const scrollEl = ref<HTMLElement | null>(null)

const chartBuckets = computed(() => withFormattedTimeLabels(props.buckets, props.grain))

const maxPercent = computed(() =>
  Math.max(...chartBuckets.value.map((bucket) => bucket.percent), 1)
)

const yAxisHint = computed(() => {
  if (props.grain === 'year') return '按年 · 纵轴为记录条数与占比'
  if (props.grain === 'quarter') return '按年季 · 纵轴为记录条数与占比'
  return '按年月 · 纵轴为记录条数与占比'
})

/** 默认对齐最大日期柱，避免滚到右侧空白 */
async function scrollToLatest() {
  await nextTick()
  await nextTick()
  const scroller = scrollEl.value
  if (!scroller) return
  const bar = scroller.querySelector<HTMLElement>('[data-testid="time-distribution-bar"]:last-child')
  if (bar) {
    bar.scrollIntoView({ inline: 'end', block: 'nearest', behavior: 'instant' as ScrollBehavior })
    return
  }
  scroller.scrollLeft = Math.max(scroller.scrollWidth - scroller.clientWidth, 0)
}

onMounted(() => { void scrollToLatest() })

watch(
  () => [props.grain, chartBuckets.value.map((b) => b.label).join('|')] as const,
  () => { void scrollToLatest() }
)
</script>

<template>
  <div data-testid="time-distribution-chart">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="text-[12px] font-medium text-slate-500">时间分布</div>
        <div class="mt-0.5 text-[11px] text-slate-400">{{ yAxisHint }}</div>
      </div>
      <div class="flex gap-1" role="tablist" aria-label="时间粒度">
        <button
          v-for="option in TIME_GRAIN_OPTIONS"
          :key="option.key"
          type="button"
          role="tab"
          :aria-selected="grain === option.key"
          :data-grain="option.key"
          class="rounded border px-2 py-0.5 text-[11px] transition"
          :class="grain === option.key
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-slate-200 bg-white text-slate-500'"
          @click="emit('update:grain', option.key)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div
      ref="scrollEl"
      class="overflow-x-auto pb-1"
      data-testid="time-distribution-scroll"
      role="region"
      aria-label="时间分布滑动窗口"
    >
      <div class="inline-flex items-end gap-2 pr-1">
        <div
          v-for="bucket in chartBuckets"
          :key="bucket.label"
          class="flex w-14 shrink-0 flex-col items-center"
          data-testid="time-distribution-bar"
        >
          <div class="mb-1 text-center text-[10px] leading-tight text-slate-500">
            <div class="font-medium text-slate-700">{{ bucket.count.toLocaleString() }}</div>
            <div>{{ bucket.percent }}%</div>
          </div>
          <div class="flex h-28 w-full items-end justify-center rounded-t bg-slate-50 px-1.5 pt-1">
            <div
              class="w-full max-w-[28px] rounded-t bg-brand-500"
              :style="{ height: `${Math.max((bucket.percent / maxPercent) * 100, 4)}%` }"
              :title="`${bucket.label}：${bucket.count.toLocaleString()} 条（${bucket.percent}%）`"
            />
          </div>
          <div class="mt-1 w-full truncate text-center text-[10px] leading-tight text-slate-600" :title="bucket.label">
            {{ bucket.label }}
          </div>
        </div>
      </div>
    </div>
    <div class="mt-1 text-[10px] text-slate-400">默认停在最新日期；左右滑动可查看更早时间窗口</div>
  </div>
</template>
