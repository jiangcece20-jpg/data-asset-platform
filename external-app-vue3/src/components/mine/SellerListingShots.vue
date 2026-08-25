<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { SellingShot, SellingShotSlot } from '@/domain/sellingShotTemplate'
import {
  SELLING_SHOT_CAPTION_MAX,
  SELLING_SHOT_SLOTS,
  SELLING_SHOT_TIPS,
  exampleSellingShots
} from '@/domain/sellingShotTemplate'

const props = defineProps<{
  modelValue: SellingShot[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SellingShot[]]
}>()

const captions = reactive<Record<SellingShotSlot, string>>({
  overview: '',
  kpi: '',
  trend: '',
  finding: ''
})

const bySlot = computed(() => new Map(props.modelValue.map((shot) => [shot.slot, shot])))

function emitShots(nextBySlot: Map<SellingShotSlot, SellingShot>) {
  emit('update:modelValue', SELLING_SHOT_SLOTS
    .map((item) => nextBySlot.get(item.slot))
    .filter((shot): shot is SellingShot => Boolean(shot?.imageDataUrl)))
}

function upsertImage(slot: SellingShotSlot, imageDataUrl: string) {
  const next = new Map(bySlot.value)
  next.set(slot, {
    slot,
    imageDataUrl,
    caption: captions[slot] || bySlot.value.get(slot)?.caption || ''
  })
  emitShots(next)
}

function updateCaption(slot: SellingShotSlot, caption: string) {
  captions[slot] = caption.slice(0, SELLING_SHOT_CAPTION_MAX)
  const current = bySlot.value.get(slot)
  if (!current?.imageDataUrl) return
  upsertImage(slot, current.imageDataUrl)
}

function remove(slot: SellingShotSlot) {
  captions[slot] = ''
  const next = new Map(bySlot.value)
  next.delete(slot)
  emitShots(next)
}

function fillExamples() {
  const examples = exampleSellingShots()
  for (const shot of examples) captions[shot.slot] = shot.caption
  emit('update:modelValue', examples)
}

function onFile(slot: SellingShotSlot, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    upsertImage(slot, String(reader.result || ''))
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <section class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="seller-listing-shots">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-[13px] font-medium text-slate-800">数据预览截图 <span class="text-[11px] font-normal text-slate-400">最多上传 5 个图</span></div>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-500">按模版截数据预览里最能证明价值的画面。总览和核心指标必传。</p>
      </div>
      <button
        type="button"
        data-testid="fill-example-shots"
        class="shrink-0 rounded-full border border-orange-200 px-3 py-1.5 text-[11px] text-orange-700"
        @click="fillExamples"
      >填入示例截图</button>
    </div>

    <svg viewBox="0 0 320 168" class="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-900" role="img" aria-label="报表截图模版示意图">
      <rect x="8" y="8" width="304" height="152" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
      <text x="16" y="24" fill="#7dd3fc" font-size="9">① 总览一屏</text>
      <rect x="16" y="32" width="52" height="10" rx="2" fill="#334155" />
      <rect x="74" y="32" width="52" height="10" rx="2" fill="#334155" />
      <rect x="16" y="50" width="66" height="32" rx="4" fill="#064e3b" stroke="#34d399" />
      <rect x="90" y="50" width="66" height="32" rx="4" fill="#064e3b" />
      <rect x="164" y="50" width="66" height="32" rx="4" fill="#064e3b" />
      <rect x="238" y="50" width="62" height="32" rx="4" fill="#064e3b" />
      <text x="20" y="70" fill="#6ee7b7" font-size="8">② 核心指标</text>
      <rect x="16" y="92" width="178" height="58" rx="6" fill="#1e1b4b" stroke="#a78bfa" />
      <text x="24" y="122" fill="#c4b5fd" font-size="8">③ 趋势或对比</text>
      <rect x="202" y="92" width="98" height="58" rx="6" fill="#431407" stroke="#fb923c" />
      <text x="210" y="122" fill="#fdba74" font-size="8">④ 异常下钻</text>
    </svg>

    <ul class="space-y-1 text-[11px] text-slate-500">
      <li v-for="tip in SELLING_SHOT_TIPS" :key="tip">· {{ tip }}</li>
    </ul>

    <div class="space-y-3">
      <article
        v-for="item in SELLING_SHOT_SLOTS"
        :key="item.slot"
        :data-testid="`shot-slot-${item.slot}`"
        class="rounded-xl border border-slate-100 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="text-[12px] font-medium text-slate-800">
            {{ item.order }}. {{ item.name }}
            <span :class="item.required ? 'text-orange-600' : 'text-slate-400'">{{ item.required ? '必填' : '建议' }}</span>
          </div>
          <button
            v-if="bySlot.get(item.slot)?.imageDataUrl"
            type="button"
            class="text-[11px] text-slate-400"
            @click="remove(item.slot)"
          >删除</button>
        </div>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-500">截哪：{{ item.crop }}</p>
        <p class="mt-0.5 text-[11px] leading-relaxed text-slate-400">为什么：{{ item.why }}</p>

        <div class="mt-2 flex items-start gap-3">
          <label class="flex h-20 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50">
            <img
              v-if="bySlot.get(item.slot)?.imageDataUrl"
              :src="bySlot.get(item.slot)!.imageDataUrl"
              :alt="item.name"
              class="h-full w-full object-cover"
            />
            <span v-else class="px-2 text-center text-[10px] text-slate-400">上传截图</span>
            <input
              :data-testid="`shot-upload-${item.slot}`"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFile(item.slot, $event)"
            />
          </label>
          <label class="min-w-0 flex-1 text-[11px] text-slate-500">卖点说明
            <input
              :value="captions[item.slot] || bySlot.get(item.slot)?.caption || ''"
              :maxlength="SELLING_SHOT_CAPTION_MAX"
              :data-testid="`shot-caption-${item.slot}`"
              class="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800"
              :placeholder="item.exampleCaption"
              @input="updateCaption(item.slot, ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>
      </article>
    </div>
  </section>
</template>
