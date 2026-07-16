<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import ContentGate from './ContentGate.vue'

const props = defineProps<{
  product: Product
  activeTab: 'overview' | 'catalog' | 'reader' | 'license'
  unlocked: boolean
}>()

const detail = computed(() => props.product.typeDetail.report)
</script>

<template>
  <div v-if="detail">
    <!-- 基本信息 -->
    <div v-if="activeTab === 'overview'" class="space-y-3 text-[13px] text-slate-700">
      <div><span class="text-slate-400">作者：</span>{{ detail.author }}</div>
      <div><span class="text-slate-400">发布日期：</span>{{ detail.publishedAt }}</div>
      <div><span class="text-slate-400">版本：</span>{{ detail.version }}</div>
      <div><span class="text-slate-400">适用读者：</span>{{ detail.audience }}</div>
      <div><span class="text-slate-400">授权说明：</span>{{ detail.license }}</div>
    </div>

    <!-- 目录 -->
    <div v-else-if="activeTab === 'catalog'" class="space-y-2">
      <div
        v-for="(item, idx) in detail.catalog"
        :key="idx"
        class="flex items-center justify-between rounded-lg px-3 py-2 text-[13px]"
        :class="item.previewable ? 'bg-slate-50 text-slate-700' : 'bg-slate-50/50 text-slate-400'"
      >
        <span>{{ idx + 1 }}. {{ item.title }}</span>
        <span v-if="!item.previewable" class="text-[11px]">🔒 需解锁</span>
        <span v-else class="text-[11px] text-emerald-500">可预览</span>
      </div>
    </div>

    <!-- 在线阅读 -->
    <div v-else-if="activeTab === 'reader'" class="space-y-4">
      <div v-for="block in detail.blocks" :key="block.id" class="border-b border-slate-100 pb-3 last:border-0">
        <div class="mb-1.5 text-[13px] font-semibold text-slate-800">{{ block.title }}</div>
        <ContentGate :mode="block.preview" :unlocked="unlocked" :label="block.title">
          <div class="text-[13px] leading-relaxed text-slate-600">{{ block.content }}</div>
        </ContentGate>
      </div>
    </div>

    <!-- 授权 -->
    <div v-else-if="activeTab === 'license'" class="space-y-3 text-[13px] text-slate-700">
      <div class="rounded-lg bg-slate-50 p-3 leading-relaxed">{{ detail.license }}</div>
      <div v-if="product.entitlementPolicy?.kind === 'report_version'" class="rounded-lg bg-amber-50 p-3 text-[12px] text-amber-700">
        单品购买永久绑定当前版本 {{ product.entitlementPolicy.version }}；后续独立版本需另行购买。
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
</template>
