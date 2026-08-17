<script setup lang="ts">
import { computed } from 'vue'
import type { SellingShot } from '@/domain/sellingShotTemplate'
import { SELLING_SHOT_SLOTS, filledShotCount } from '@/domain/sellingShotTemplate'

const props = defineProps<{
  shots?: SellingShot[]
  compact?: boolean
}>()

const ordered = computed(() => {
  const bySlot = new Map((props.shots ?? []).map((shot) => [shot.slot, shot]))
  return SELLING_SHOT_SLOTS
    .map((item) => ({ def: item, shot: bySlot.get(item.slot) }))
    .filter((row) => row.shot?.imageDataUrl)
})

const count = computed(() => filledShotCount(props.shots))
</script>

<template>
  <div v-if="ordered.length" data-testid="selling-shot-gallery" class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-[13px] font-semibold text-slate-800">卖家卖点截图</div>
      <div class="text-[11px] text-slate-400">{{ count }}/4</div>
    </div>
    <div :class="compact ? 'grid grid-cols-2 gap-2' : 'space-y-3'">
      <figure
        v-for="row in ordered"
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
</template>
