<script setup lang="ts">
export interface DetailTab {
  key: string
  label: string
}

const props = defineProps<{ modelValue: string; tabs: DetailTab[] }>()
const emit = defineEmits<{ 'update:modelValue': [key: string] }>()

function select(key: string) {
  if (key !== props.modelValue) emit('update:modelValue', key)
}
</script>

<template>
  <div class="sticky top-12 z-10 flex gap-1 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="modelValue === tab.key"
      :data-tab="tab.key"
      class="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition"
      :class="modelValue === tab.key ? 'bg-brand-500 text-white' : 'text-slate-500'"
      @click="select(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
