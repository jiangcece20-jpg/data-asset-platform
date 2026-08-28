<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import { typeMeta } from '@/utils/productMeta'
import { productListChips, productTrialChips } from '@/domain/productListChips'

const props = withDefaults(defineProps<{
  product: Product
  showTrial?: boolean
}>(), { showTrial: false })

const chips = computed(() => productListChips(props.product))
const trial = computed(() => productTrialChips(props.product))

const venueClass = computed(() =>
  chips.value.venue?.kind === 'seller'
    ? 'bg-orange-50 text-orange-700'
    : 'bg-purple-50 text-purple-600'
)

const opsClass = computed(() => {
  if (!chips.value.ops) return ''
  if (chips.value.ops.kind === 'status') return 'bg-amber-50 text-amber-700'
  if (chips.value.ops.label === '合规首选') return 'bg-indigo-50 text-indigo-700'
  if (chips.value.ops.label === '个人数据集') return 'bg-sky-50 text-sky-700'
  return 'bg-amber-50 text-amber-700'
})
</script>

<template>
  <div data-testid="product-chips" class="flex flex-wrap items-center gap-1.5">
    <span class="tag-chip">{{ typeMeta[chips.type].icon }} {{ chips.typeLabel }}</span>
    <span v-if="chips.venue" class="rounded-full px-2 py-0.5 text-xs" :class="venueClass">{{ chips.venue.name }}</span>
    <span v-if="chips.ops" class="rounded-full px-2 py-0.5 text-xs" :class="opsClass">{{ chips.ops.label }}</span>
    <template v-if="showTrial">
      <span v-for="chip in trial" :key="chip" class="tag-chip">{{ chip }}</span>
    </template>
  </div>
</template>
