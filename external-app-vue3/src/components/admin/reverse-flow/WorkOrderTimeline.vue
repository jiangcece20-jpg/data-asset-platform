<script setup lang="ts">
import type { ReverseTimelineEntry } from '@/types/reverseFlow'

defineProps<{
  entries: ReverseTimelineEntry[]
}>()
</script>

<template>
  <div class="space-y-1.5">
    <div v-for="e in entries" :key="e.id" class="flex items-start gap-2 text-[12px]">
      <span class="mt-0.5 text-slate-400">{{ e.createdAt.slice(11, 19) }}</span>
      <span class="text-slate-600">{{ e.actor }}</span>
      <span class="text-slate-700">{{ e.detail }}</span>
    </div>
  </div>
</template>
