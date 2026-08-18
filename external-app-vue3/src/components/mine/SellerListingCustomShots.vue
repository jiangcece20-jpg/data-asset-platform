<script setup lang="ts">
import type { CustomSellingShot } from '@/domain/sellingShotTemplate'
import {
  CUSTOM_SELLING_SHOT_DESC_MAX,
  CUSTOM_SELLING_SHOT_MAX,
  CUSTOM_SELLING_SHOT_TITLE_MAX
} from '@/domain/sellingShotTemplate'
import { genId } from '@/utils/id'

const props = defineProps<{
  modelValue: CustomSellingShot[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CustomSellingShot[]]
}>()

function updateList(next: CustomSellingShot[]) {
  emit('update:modelValue', next.slice(0, CUSTOM_SELLING_SHOT_MAX))
}

function addRow() {
  if (props.modelValue.length >= CUSTOM_SELLING_SHOT_MAX) return
  updateList([
    ...props.modelValue,
    { id: genId('custom-shot'), title: '', description: '', imageDataUrl: '' }
  ])
}

function patch(id: string, patch: Partial<CustomSellingShot>) {
  updateList(props.modelValue.map((row) => (row.id === id ? { ...row, ...patch } : row)))
}

function remove(id: string) {
  updateList(props.modelValue.filter((row) => row.id !== id))
}

function onFile(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file?.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    patch(id, { imageDataUrl: String(reader.result || '') })
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <section class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="seller-listing-custom-shots">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-[13px] font-medium text-slate-800">自定义补充截图</div>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
          模版四槽位之外，可再传最多 {{ CUSTOM_SELLING_SHOT_MAX }} 张。每张须自定义标题与描述，用于补充说明报表价值。
        </p>
      </div>
      <button
        type="button"
        data-testid="add-custom-shot"
        class="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 disabled:opacity-40"
        :disabled="modelValue.length >= CUSTOM_SELLING_SHOT_MAX"
        @click="addRow"
      >+ 添加截图</button>
    </div>

    <div v-if="!modelValue.length" class="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
      暂无自定义截图，点击「添加截图」上传
    </div>

    <article
      v-for="(row, index) in modelValue"
      :key="row.id"
      :data-testid="`custom-shot-row-${index}`"
      class="rounded-xl border border-slate-100 p-3"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="text-[12px] font-medium text-slate-800">自定义 {{ index + 1 }}</div>
        <button type="button" class="text-[11px] text-slate-400" @click="remove(row.id)">删除</button>
      </div>

      <div class="mt-2 flex items-start gap-3">
        <label class="flex h-20 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50">
          <img v-if="row.imageDataUrl" :src="row.imageDataUrl" :alt="row.title || '自定义截图'" class="h-full w-full object-cover" />
          <span v-else class="px-2 text-center text-[10px] text-slate-400">上传图片</span>
          <input
            :data-testid="`custom-shot-upload-${index}`"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFile(row.id, $event)"
          />
        </label>
        <div class="min-w-0 flex-1 space-y-2">
          <label class="block text-[11px] text-slate-500">标题
            <input
              :value="row.title"
              :maxlength="CUSTOM_SELLING_SHOT_TITLE_MAX"
              :data-testid="`custom-shot-title-${index}`"
              class="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800"
              placeholder="如：线路对比专题"
              @input="patch(row.id, { title: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label class="block text-[11px] text-slate-500">描述
            <textarea
              :value="row.description"
              :maxlength="CUSTOM_SELLING_SHOT_DESC_MAX"
              rows="2"
              :data-testid="`custom-shot-desc-${index}`"
              class="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800"
              placeholder="说明这张图想传达什么价值"
              @input="patch(row.id, { description: ($event.target as HTMLTextAreaElement).value })"
            />
          </label>
        </div>
      </div>
    </article>
  </section>
</template>
