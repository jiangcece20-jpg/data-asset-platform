<script setup lang="ts">
defineProps<{
  typeLabel: string
  name: string
  note?: string
}>()
</script>

<template>
  <div data-testid="purchase-identity" class="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
    <div class="text-[11px] text-violet-500">当前身份</div>
    <div data-testid="purchase-subject-name" class="mt-0.5 text-sm font-medium text-violet-900">{{ typeLabel }} · {{ name }}</div>
    <div v-if="note" class="mt-1 text-[11px] leading-relaxed text-violet-700">{{ note }}</div>
  </div>
</template>
