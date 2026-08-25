<script setup lang="ts">
import { UPDATE_FREQUENCIES } from '@/domain/updateFrequency'

defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <select
    :value="modelValue"
    class="w-full rounded-lg border border-slate-200 bg-white"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="">{{ placeholder || '请选择更新频率' }}</option>
    <option v-for="item in UPDATE_FREQUENCIES" :key="item" :value="item">{{ item }}</option>
  </select>
</template>
