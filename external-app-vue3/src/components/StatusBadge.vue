<script setup lang="ts">
import { computed } from 'vue'
import { statusMeta, statusClass } from '@/utils/statusMeta'

const props = defineProps<{
  dict: string
  value: string
}>()

const meta = computed(() => statusMeta(props.dict, props.value))
const cls = computed(() => statusClass(props.dict, props.value))
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="cls">{{ meta.label }}</span>
</template>
