<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import { productListChips, productTrialChips } from '@/domain/productListChips'

const props = withDefaults(defineProps<{
  product: Product
  showTrial?: boolean
}>(), { showTrial: false })

const chips = computed(() => productListChips(props.product))
const trial = computed(() => productTrialChips(props.product))

const venueClass = computed(() =>
  chips.value.venue?.kind === 'seller'
    ? 'bg-warning-50 text-warning-600'
    : 'bg-[#F5E8FF] text-[#722ED1]'
)

const opsClass = computed(() => {
  if (!chips.value.ops) return ''
  if (chips.value.ops.kind === 'status') return 'bg-warning-50 text-warning-600'
  if (chips.value.ops.label === '合规首选') return 'bg-brand-50 text-brand-600'
  if (chips.value.ops.label === '个人数据集') return 'bg-ink-100 text-ink-600'
  return 'bg-warning-50 text-warning-600'
})
</script>

<template>
  <div data-testid="product-chips" class="flex flex-wrap items-center gap-1.5">
    <span class="tag-chip">{{ chips.typeLabel }}</span>
    <span v-if="chips.venue" class="rounded-full px-2 py-0.5 text-xs" :class="venueClass">{{ chips.venue.name }}</span>
    <span v-if="chips.ops" class="rounded-full px-2 py-0.5 text-xs" :class="opsClass">{{ chips.ops.label }}</span>
    <template v-if="showTrial">
      <span v-for="chip in trial" :key="chip" class="tag-chip">{{ chip }}</span>
    </template>
  </div>
</template>
