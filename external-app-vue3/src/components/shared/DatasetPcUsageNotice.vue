<script setup lang="ts">
defineProps<{ message: string; open: boolean }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="mx-4 mt-3 rounded-lg bg-brand-50 px-4 py-3 text-xs leading-relaxed text-ink-600" data-testid="dataset-pc-guidance">{{ message }}</div>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section role="dialog" aria-modal="true" aria-labelledby="dataset-pc-title" data-testid="dataset-pc-dialog" class="w-full max-w-sm rounded-xl bg-white p-5">
      <h2 id="dataset-pc-title" class="text-base font-semibold text-ink-900">PC端使用</h2>
      <p class="mt-3 text-sm leading-relaxed text-ink-600">{{ message }}</p>
      <button autofocus class="mt-5 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm text-white" @click="$emit('close')">知道了</button>
    </section>
  </div>
</template>
