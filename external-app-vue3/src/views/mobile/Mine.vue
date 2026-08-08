<script setup lang="ts">
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import MineShell from '@/components/mine/MineShell.vue'
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="我的" :show-back="false" />
    <MineShell layout="mobile" />
  </div>
</template>
