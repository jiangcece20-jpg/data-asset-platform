<script setup lang="ts">
defineProps<{
  typeLabel: string
  name: string
  note?: string
}>()
</script>

<template>
  <div data-testid="purchase-identity" class="rounded-xl border border-[#F5E8FF] bg-[#F5E8FF] px-4 py-3">
    <div class="text-[11px] text-[#722ED1]">当前身份</div>
    <div data-testid="purchase-subject-name" class="mt-0.5 text-sm font-medium text-[#531DAB]">{{ typeLabel }} · {{ name }}</div>
    <div v-if="note" class="mt-1 text-[11px] leading-relaxed text-[#722ED1]">{{ note }}</div>
  </div>
</template>
