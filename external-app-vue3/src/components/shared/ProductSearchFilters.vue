<script setup lang="ts">
import { computed } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta } from '@/utils/productMeta'
import type { ProductType } from '@/types/domain'
import { productVenueFilters } from '@/domain/productListChips'

const type = defineModel<ProductType | ''>('type', { default: '' })
const venue = defineModel<string>('venue', { default: '' })

withDefaults(defineProps<{ variant?: 'mobile' | 'portal' }>(), { variant: 'mobile' })

const catalog = useCatalogStore()
const types: ProductType[] = ['dataset', 'api', 'report', 'dashboard']
const venues = computed(() => productVenueFilters(catalog.discoverable))
</script>

<template>
  <div
    class="grid grid-cols-2 gap-1.5"
    :class="variant === 'portal' ? 'mx-auto max-w-md gap-2' : ''"
  >
    <select
      v-model="type"
      data-testid="filter-types"
      aria-label="商品类型"
      class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700"
    >
      <option value="">全部类型</option>
      <option v-for="item in types" :key="item" :value="item">{{ typeMeta[item].label }}</option>
    </select>
    <select
      v-model="venue"
      data-testid="filter-venues"
      aria-label="成交位置"
      class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700"
    >
      <option value="">全部位置</option>
      <option v-for="item in venues" :key="item.key" :value="item.key">{{ item.label }}</option>
    </select>
  </div>
</template>
