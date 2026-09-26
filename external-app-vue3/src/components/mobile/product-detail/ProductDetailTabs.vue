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
  <div class="sticky top-0 z-20">
    <div class="mx-4 flex overflow-x-auto rounded-t-2xl bg-white px-2 pt-1 shadow-card">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        role="tab"
        :aria-selected="modelValue === tab.key"
        :data-tab="tab.key"
        class="relative whitespace-nowrap px-3.5 py-3 text-[14px] transition"
        :class="modelValue === tab.key ? 'font-semibold text-brand-600' : 'text-ink-500'"
        @click="select(tab.key)"
      >
        {{ tab.label }}
        <span v-if="modelValue === tab.key" class="absolute inset-x-3.5 bottom-1.5 h-0.5 rounded-full bg-brand-500"></span>
      </button>
    </div>
  </div>
</template>
