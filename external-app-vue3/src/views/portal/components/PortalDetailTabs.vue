<script setup lang="ts">
export interface DetailTab {
  key: string
  label: string
}

defineProps<{ tabs: DetailTab[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex gap-1 border-b border-slate-200">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="relative px-4 py-2.5 text-sm font-medium transition-colors"
      :class="modelValue === tab.key
        ? 'text-brand-600'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span
        v-if="modelValue === tab.key"
        class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500"
      />
    </button>
  </div>
</template>
