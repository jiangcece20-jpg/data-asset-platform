<script setup lang="ts">
export interface DetailTab {
  key: string
  label: string
}

defineProps<{ tabs: DetailTab[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex gap-1 border-b border-ink-200">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="relative px-4 py-2.5 text-sm font-medium transition-colors"
      :class="modelValue === tab.key
        ? 'text-violet-600'
        : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span
        v-if="modelValue === tab.key"
        class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-violet-500"
      />
    </button>
  </div>
</template>
