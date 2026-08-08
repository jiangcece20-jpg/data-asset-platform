<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  void router.replace({ path: '/app/mine', query: { menu: 'seller', sellerTab: 'listings' } })
})
</script>

<template>
  <div class="flex min-h-full items-center justify-center bg-slate-50 text-[13px] text-slate-400">
    正在进入卖家中心…
  </div>
</template>
