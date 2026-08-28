<script setup lang="ts">
import { computed } from 'vue'
import type { ReportPreviewImages } from '@/types/domain'
import {
  REPORT_PREVIEW_IMAGE_MAX,
  normalizeReportPreviewImages,
  type ReportPreviewPlatform
} from '@/domain/reportPreview'

const props = withDefaults(
  defineProps<{
    modelValue: ReportPreviewImages
    title?: string
    description?: string
    appHint?: string
    pcHint?: string
    testId?: string
  }>(),
  {
    title: '报表预览图',
    description: '上传后在商品详情页展示；APP 与 PC 分别维护，每端最多 3 张。',
    appHint: '用于移动端商品详情',
    pcHint: '用于门户商品详情',
    testId: 'report-preview'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: ReportPreviewImages]
}>()

const platformSections = computed(() => [
  { key: 'app' as const, label: 'APP 端预览', hint: props.appHint },
  { key: 'pc' as const, label: 'PC 端预览', hint: props.pcHint }
])

function images(platform: ReportPreviewPlatform) {
  return props.modelValue[platform]
}

function canAdd(platform: ReportPreviewPlatform) {
  return images(platform).length < REPORT_PREVIEW_IMAGE_MAX
}

function updatePlatform(platform: ReportPreviewPlatform, next: string[]) {
  emit(
    'update:modelValue',
    normalizeReportPreviewImages({
      ...props.modelValue,
      [platform]: next.slice(0, REPORT_PREVIEW_IMAGE_MAX)
    })
  )
}

function onFile(platform: ReportPreviewPlatform, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file?.type.startsWith('image/') || !canAdd(platform)) return
  const reader = new FileReader()
  reader.onload = () => {
    updatePlatform(platform, [...images(platform), String(reader.result || '')])
  }
  reader.readAsDataURL(file)
}

function removeAt(platform: ReportPreviewPlatform, index: number) {
  updatePlatform(
    platform,
    images(platform).filter((_, idx) => idx !== index)
  )
}
</script>

<template>
  <section class="mt-5 border-t border-slate-100 pt-4" :data-testid="`${testId}-images-editor`">
    <div class="mb-3">
      <div class="text-xs font-medium text-slate-600">{{ title }}</div>
      <p class="mt-0.5 text-[11px] leading-relaxed text-slate-400">{{ description }}</p>
    </div>

    <div v-for="section in platformSections" :key="section.key" class="mb-4 last:mb-0">
      <div class="mb-2 flex items-center justify-between gap-2">
        <div>
          <div class="text-[11px] font-medium text-slate-700">{{ section.label }}</div>
          <div class="text-[10px] text-slate-400">{{ section.hint }}</div>
        </div>
        <span class="text-[10px] text-slate-400" :data-testid="`${testId}-count-${section.key}`">
          {{ images(section.key).length }}/{{ REPORT_PREVIEW_IMAGE_MAX }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2" :data-testid="`${testId}-slots-${section.key}`">
        <figure
          v-for="(src, index) in images(section.key)"
          :key="`${section.key}-${index}`"
          class="relative h-24 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          :data-testid="`${testId}-image-${section.key}-${index}`"
        >
          <img :src="src" :alt="`${section.label} ${index + 1}`" class="h-full w-full object-cover" />
          <button
            type="button"
            class="absolute right-0.5 top-0.5 rounded bg-black/50 px-1 text-[10px] leading-none text-white"
            :data-testid="`${testId}-remove-${section.key}-${index}`"
            @click="removeAt(section.key, index)"
          >
            ×
          </button>
        </figure>

        <label
          v-if="canAdd(section.key)"
          class="flex h-24 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400 hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
          :data-testid="`${testId}-upload-${section.key}`"
        >
          <span class="text-lg font-light leading-none">+</span>
          <span class="mt-1">上传</span>
          <input type="file" accept="image/*" class="hidden" @change="onFile(section.key, $event)" />
        </label>
      </div>
    </div>
  </section>
</template>
