<script setup lang="ts">
import type { ProductAction, ProductActionKey } from '@/domain/productAccess'

const props = defineProps<{
  primary: ProductAction
  secondary?: ProductAction
  favorite?: boolean
}>()
const emit = defineEmits<{
  action: [key: ProductActionKey]
  toggleFavorite: []
}>()

function primaryClick() {
  if (!props.primary.disabled) emit('action', props.primary.key)
}

function secondaryClick() {
  if (props.secondary && !props.secondary.disabled) emit('action', props.secondary.key)
}
</script>

<template>
  <div data-testid="product-action-area" class="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 space-y-2 border-t border-ink-100 bg-white/95 p-3 backdrop-blur">
    <div class="flex items-center gap-3">
      <!-- 收藏（设计稿：底栏左侧竖排星标） -->
      <button
        data-testid="product-favorite"
        class="flex w-11 shrink-0 flex-col items-center gap-0.5"
        @click="emit('toggleFavorite')"
      >
        <svg v-if="favorite" class="h-6 w-6 text-brand-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
        <svg v-else class="h-6 w-6 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
        <span class="text-[10px] leading-3" :class="favorite ? 'text-brand-600' : 'text-ink-400'">{{ favorite ? '已收藏' : '收藏' }}</span>
      </button>

      <a
        v-if="primary.href && !primary.disabled"
        data-testid="product-primary-action"
        :href="primary.href"
        class="min-w-0 flex-1 rounded-full bg-brand-500 px-6 py-3 text-center text-[15px] font-medium text-white"
      >{{ primary.label }}</a>
      <button
        v-else
        data-testid="product-primary-action"
        class="min-w-0 flex-1 rounded-full px-6 py-3 text-[15px] font-medium text-white"
        :class="primary.disabled ? 'bg-ink-300' : 'bg-brand-500'"
        :disabled="primary.disabled"
        @click="primaryClick"
      >
        {{ primary.label }}
      </button>
    </div>
    <button
      v-if="secondary"
      data-testid="product-secondary-action"
      class="w-full rounded-full border border-brand-500 py-3 text-[14px] font-medium text-brand-600"
      :disabled="secondary.disabled"
      @click="secondaryClick"
    >
      {{ secondary.label }}
    </button>
  </div>
</template>
