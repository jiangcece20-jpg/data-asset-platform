<script setup lang="ts">
import { computed } from 'vue'
import type { ReportPreviewImages } from '@/types/domain'
import { imagesForPlatform, type ReportPreviewPlatform } from '@/domain/reportPreview'

const props = defineProps<{
  previewImages?: ReportPreviewImages
  platform: ReportPreviewPlatform
  title?: string
}>()

const rows = computed(() => imagesForPlatform(props.previewImages, props.platform))
</script>

<template>
  <div v-if="rows.length" class="space-y-3" data-testid="report-preview-gallery">
    <div class="flex items-center justify-between">
      <div class="text-[13px] font-semibold text-slate-800">{{ title || '报表预览' }}</div>
      <div class="text-[11px] text-slate-400">{{ rows.length }} 张</div>
    </div>
    <div class="space-y-3">
      <figure
        v-for="(src, index) in rows"
        :key="index"
        class="overflow-hidden rounded-xl border border-slate-100 bg-white"
        :data-testid="`report-preview-slide-${platform}-${index}`"
      >
        <img :src="src" :alt="`报表预览 ${index + 1}`" class="w-full object-cover" :class="platform === 'pc' ? 'max-h-80' : 'max-h-64'" />
      </figure>
    </div>
  </div>
  <p v-else class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[12px] text-slate-400" data-testid="report-preview-empty">
    暂无报表预览图
  </p>
</template>
