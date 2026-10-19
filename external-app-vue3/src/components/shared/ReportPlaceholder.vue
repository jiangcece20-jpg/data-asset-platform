<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{ name?: string }>()
const router = useRouter()
</script>

<template>
  <section data-testid="report-placeholder" class="mx-auto max-w-4xl rounded-lg bg-white p-6">
    <button class="text-sm text-brand-600" @click="router.back()">← 返回</button>
    <h1 class="mt-6 text-xl font-semibold text-ink-900">{{ name || '行业报告' }}</h1>
    <p class="mt-4 text-sm text-ink-500">行业报告本期仅占位，暂未开放。</p>
  </section>
</template>
