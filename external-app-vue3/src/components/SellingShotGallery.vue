<script setup lang="ts">
import { computed } from 'vue'
import type { CustomSellingShot, SellingShot } from '@/domain/sellingShotTemplate'
import { SELLING_SHOT_SLOTS, filledShotCount } from '@/domain/sellingShotTemplate'

const props = defineProps<{
  shots?: SellingShot[]
  customShots?: CustomSellingShot[]
  compact?: boolean
}>()

const templateRows = computed(() => {
  const bySlot = new Map((props.shots ?? []).map((shot) => [shot.slot, shot]))
  return SELLING_SHOT_SLOTS
    .map((item) => ({ def: item, shot: bySlot.get(item.slot) }))
    .filter((row) => row.shot?.imageDataUrl)
})

const customRows = computed(() => (props.customShots ?? []).filter((shot) => shot.imageDataUrl))

const hasAny = computed(() => templateRows.value.length > 0 || customRows.value.length > 0)

const countLabel = computed(() => {
  const templateCount = filledShotCount(props.shots)
  const customCount = customRows.value.length
  if (customCount) return `${templateCount}/4 · 自定义 ${customCount}`
  return `${templateCount}/4`
})
</script>

<template>
  <div v-if="hasAny" data-testid="selling-shot-gallery" class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="text-[13px] font-semibold text-slate-800">卖家卖点截图</div>
      <div class="text-[11px] text-slate-400">{{ countLabel }}</div>
    </div>

    <div v-if="templateRows.length" class="space-y-2">
      <div v-if="customRows.length" class="text-[11px] font-medium text-slate-500">模版截图</div>
      <div :class="compact ? 'grid grid-cols-2 gap-2' : 'space-y-3'">
        <figure
          v-for="row in templateRows"
          :key="row.def.slot"
          :data-testid="`selling-shot-${row.def.slot}`"
          class="overflow-hidden rounded-xl border border-slate-100 bg-white"
        >
          <img :src="row.shot!.imageDataUrl" :alt="row.def.name" class="h-36 w-full object-cover" />
          <figcaption class="space-y-0.5 px-3 py-2">
            <div class="text-[11px] font-medium text-slate-700">{{ row.def.order }}. {{ row.def.name }}</div>
            <div v-if="row.shot!.caption" class="text-[11px] leading-relaxed text-slate-500">{{ row.shot!.caption }}</div>
          </figcaption>
        </figure>
      </div>
    </div>

    <div v-if="customRows.length" class="space-y-2">
      <div class="text-[11px] font-medium text-slate-500">自定义补充</div>
      <div :class="compact ? 'grid grid-cols-2 gap-2' : 'space-y-3'">
        <figure
          v-for="row in customRows"
          :key="row.id"
          :data-testid="`custom-selling-shot-${row.id}`"
          class="overflow-hidden rounded-xl border border-slate-100 bg-white"
        >
          <img :src="row.imageDataUrl" :alt="row.title" class="h-36 w-full object-cover" />
          <figcaption class="space-y-0.5 px-3 py-2">
            <div class="text-[11px] font-medium text-slate-700">{{ row.title }}</div>
            <div class="text-[11px] leading-relaxed text-slate-500">{{ row.description }}</div>
          </figcaption>
        </figure>
      </div>
    </div>
  </div>
</template>
