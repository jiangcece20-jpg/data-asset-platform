<script setup lang="ts">
import { useCatalogStore } from '@/stores/catalog'

const catalog = useCatalogStore()

function toggleRecommend(productId: string, current: boolean) {
  const p = catalog.byId(productId)
  if (p) p.recommendSlot = !current
}
</script>

<template>
  <div>
    <div class="mb-2 text-[13px] font-medium text-ink-700">推荐位管理</div>
    <div class="rounded-xl border border-ink-200 bg-white">
      <div class="grid grid-cols-4 border-b border-ink-100 bg-ink-100 px-4 py-2 text-[11px] font-medium text-ink-500">
        <span>商品名称</span>
        <span>类型</span>
        <span>来源</span>
        <span>推荐状态</span>
      </div>
      <div
        v-for="p in catalog.published"
        :key="p.id"
        class="grid grid-cols-4 items-center border-b border-ink-100 px-4 py-3 text-[12px] last:border-0"
      >
        <span class="truncate pr-2 text-ink-700">{{ p.name }}</span>
        <span class="text-ink-500">{{ p.type === 'dataset' ? '数据集' : p.type === 'api' ? 'API' : p.type === 'report' ? '报告' : '看板' }}</span>
        <span class="text-ink-500">{{ p.origin === 'asset_platform' ? '资产平台' : p.origin === 'trusted_space' ? '可信空间' : '—' }}</span>
        <div>
          <button
            class="rounded-full px-3 py-1 text-[11px] font-medium transition"
            :class="p.recommendSlot ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'"
            @click="toggleRecommend(p.id, !!p.recommendSlot)"
          >
            {{ p.recommendSlot ? '推荐中' : '未推荐' }}
          </button>
        </div>
      </div>
      <div v-if="!catalog.published.length" class="py-8 text-center text-[12px] text-ink-500">暂无可推荐商品</div>
    </div>
  </div>
</template>
