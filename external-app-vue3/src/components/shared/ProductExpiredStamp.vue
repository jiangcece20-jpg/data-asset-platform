<script setup lang="ts">
defineProps<{ dataset?: boolean }>()
</script>

<template>
  <span data-testid="product-expired-stamp" class="inline-flex shrink-0 items-center rounded-md border-2 border-[#92400e] bg-[#fef3c7] px-3 py-1 text-sm font-bold leading-5 tracking-wider text-[#92400e] shadow-sm">{{ dataset ? '更新已到期' : '已到期' }}</span>
</template>
