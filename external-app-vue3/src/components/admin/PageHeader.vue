<script setup lang="ts">
defineProps<{ title: string; desc?: string }>()
</script>

<template>
  <div class="mb-4">
    <div class="text-xl font-semibold text-ink-900">{{ title }}</div>
    <div v-if="desc" class="mt-1 text-[13px] text-ink-500">{{ desc }}</div>
  </div>
</template>
