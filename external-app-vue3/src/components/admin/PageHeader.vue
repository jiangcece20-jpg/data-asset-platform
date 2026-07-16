<script setup lang="ts">
defineProps<{ title: string; desc?: string }>()
</script>

<template>
  <div class="mb-4">
    <div class="text-lg font-semibold text-slate-900">{{ title }}</div>
    <div v-if="desc" class="mt-0.5 text-[13px] text-slate-400">{{ desc }}</div>
  </div>
</template>
