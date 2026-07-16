<script setup lang="ts">
import type { ProductAction, ProductActionKey } from '@/domain/productAccess'

const props = defineProps<{ primary: ProductAction; secondary?: ProductAction; priceText?: string }>()
const emit = defineEmits<{ action: [key: ProductActionKey] }>()

function primaryClick() {
  if (!props.primary.disabled) emit('action', props.primary.key)
}

function secondaryClick() {
  if (props.secondary && !props.secondary.disabled) emit('action', props.secondary.key)
}
</script>

<template>
  <div class="fixed bottom-0 left-1/2 w-[390px] -translate-x-1/2 space-y-2 border-t border-slate-100 bg-white p-3">
    <div v-if="priceText" class="text-center text-[12px] text-slate-400">{{ priceText }}</div>
    <button
      class="w-full rounded-full py-3 text-[14px] font-medium text-white"
      :class="primary.disabled ? 'bg-slate-300' : 'bg-brand-500'"
      :disabled="primary.disabled"
      @click="primaryClick"
    >
      {{ primary.label }}
    </button>
    <button
      v-if="secondary"
      class="w-full rounded-full border border-brand-500 py-3 text-[14px] font-medium text-brand-600"
      :disabled="secondary.disabled"
      @click="secondaryClick"
    >
      {{ secondary.label }}
    </button>
  </div>
</template>
