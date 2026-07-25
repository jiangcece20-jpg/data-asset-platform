<script setup lang="ts">
import type { SupplyTimelineEntry } from '@/types/demandFlow'

defineProps<{ entries: SupplyTimelineEntry[] }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-[13px] font-medium text-slate-700">时间线</div>
    <ol class="space-y-2">
      <li v-for="e in entries" :key="e.id" data-testid="timeline-entry" class="flex gap-2 text-[12px]">
        <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"></span>
        <div>
          <div class="text-slate-600">{{ e.detail }}</div>
          <div class="text-slate-400">{{ e.actor }} · {{ e.createdAt.slice(0, 19).replace('T', ' ') }}</div>
        </div>
      </li>
    </ol>
    <div v-if="!entries.length" class="py-3 text-center text-[12px] text-slate-400">暂无记录</div>
  </div>
</template>
