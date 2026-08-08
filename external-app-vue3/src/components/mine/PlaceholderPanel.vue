<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div data-testid="mine-placeholder" class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
    <div v-if="title" class="text-[13px] font-medium text-slate-700">{{ title }}</div>
    <p class="mt-2 text-[12px] text-slate-500">该模块由其它产品负责</p>
  </div>
</template>
