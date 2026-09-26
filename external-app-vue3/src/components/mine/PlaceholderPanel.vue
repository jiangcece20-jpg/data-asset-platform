<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div data-testid="mine-placeholder" class="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
    <div v-if="title" class="text-[13px] font-medium text-ink-700">{{ title }}</div>
    <p class="mt-2 text-[12px] text-ink-500">该模块由其它产品负责</p>
  </div>
</template>
