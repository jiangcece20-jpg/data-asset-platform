<script setup lang="ts">
defineProps<{ icon?: string; title: string; desc?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-8 py-14 text-center">
    <div class="mb-3 text-4xl">{{ icon || '🗒️' }}</div>
    <div class="text-[14px] font-medium text-slate-600">{{ title }}</div>
    <div v-if="desc" class="mt-1 text-[12px] leading-relaxed text-slate-400">{{ desc }}</div>
    <div class="mt-3 w-full">
      <slot />
    </div>
  </div>
</template>
