<script setup lang="ts">
import { computed } from 'vue'
import type { PreviewMode } from '@/types/domain'

const props = defineProps<{ mode: PreviewMode; unlocked: boolean; label?: string }>()

const showContent = computed(() => props.mode === 'visible' || props.unlocked)
</script>

<template>
  <div v-if="showContent">
    <slot />
  </div>
  <div v-else-if="mode === 'masked'" class="space-y-1.5">
    <div class="h-3 rounded bg-slate-100"></div>
    <div class="h-3 rounded bg-slate-100"></div>
    <div class="h-3 rounded bg-slate-100"></div>
    <div class="pt-1 text-[12px] text-slate-400">🔒 解锁后查看关键内容</div>
  </div>
  <div v-else-if="mode === 'locked'" class="flex flex-col items-center py-4">
    <span class="text-2xl">🔒</span>
    <div class="mt-1.5 text-[13px] font-medium text-slate-600">{{ label || '此内容需购买后查看' }}</div>
    <div class="mt-0.5 text-[11px] text-slate-400">解锁后可阅读完整内容</div>
  </div>
</template>
