<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import ProductChips from '@/components/shared/ProductChips.vue'
import { originMeta } from '@/utils/productMeta'
import { productTopicTags } from '@/domain/productListChips'

const props = defineProps<{ product: Product; title: string }>()
const topicTags = computed(() => productTopicTags(props.product))
</script>

<template>
  <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
    <div class="mb-2">
      <ProductChips :product="product" show-trial />
    </div>
    <div class="text-[17px] font-semibold text-slate-900">{{ title }}</div>
    <div class="mt-1 text-[13px] text-slate-500">{{ product.recommendText || product.subtitle }}</div>

    <div v-if="topicTags.length" class="mt-2 flex flex-wrap gap-1.5">
      <span v-for="tag in topicTags" :key="tag" class="tag-chip">{{ tag }}</span>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-500">
      <div>来源：{{ originMeta[product.origin] }}</div>
      <div>覆盖范围：{{ product.coverage }}</div>
      <div>更新频率：{{ product.updateFrequency }}</div>
      <div>交付方式：{{ product.deliveryMethod }}</div>
    </div>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span v-for="s in product.scenarios" :key="s" class="tag-chip">{{ s }}</span>
    </div>

    <div v-if="product.spaceProductNo" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
      空间商品编号 {{ product.spaceProductNo }}（只读，来自可信空间，同步于 {{ product.spaceSyncedAt }}）
    </div>
  </div>
</template>
