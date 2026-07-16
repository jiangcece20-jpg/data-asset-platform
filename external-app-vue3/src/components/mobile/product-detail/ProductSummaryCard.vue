<script setup lang="ts">
import type { Product } from '@/types/domain'
import StatusBadge from '@/components/StatusBadge.vue'
import { typeMeta, dealChannelMeta, originMeta } from '@/utils/productMeta'

defineProps<{ product: Product; title: string }>()
</script>

<template>
  <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
    <div class="mb-2 flex flex-wrap items-center gap-1.5">
      <span class="tag-chip">{{ typeMeta[product.type].icon }} {{ typeMeta[product.type].label }}</span>
      <span class="rounded-full px-2 py-0.5 text-xs" :class="dealChannelMeta[product.dealChannel].tone">{{ dealChannelMeta[product.dealChannel].label }}</span>
      <StatusBadge dict="availability" :value="product.availability" />
    </div>
    <div class="text-[17px] font-semibold text-slate-900">{{ title }}</div>
    <div class="mt-1 text-[13px] text-slate-500">{{ product.subtitle }}</div>

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
