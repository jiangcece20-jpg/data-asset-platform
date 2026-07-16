<script setup lang="ts">
import type { ExecutionTask } from '@/types/reverseFlow'

defineProps<{
  tasks: ExecutionTask[]
}>()
</script>

<template>
  <div class="space-y-2">
    <div v-for="t in tasks" :key="t.id" class="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-[13px]">
      <span>{{ t.completedAt ? '✅' : '⏳' }}</span>
      <span class="text-slate-700">{{ t.title }}</span>
      <span class="ml-auto text-[11px] text-slate-400">{{ t.system }}</span>
      <span v-if="t.completedBy" class="text-[11px] text-slate-400">{{ t.completedBy }}</span>
    </div>
  </div>
</template>
