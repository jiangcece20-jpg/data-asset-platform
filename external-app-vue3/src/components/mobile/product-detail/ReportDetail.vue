<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import InfoGrid, { type InfoItem } from './InfoGrid.vue'
import ProductContentPeek from '@/components/ProductContentPeek.vue'

const props = defineProps<{
  product: Product
  activeTab: 'overview' | 'catalog' | 'reader'
  unlocked: boolean
}>()

const emit = defineEmits<{ unlock: [] }>()

const detail = computed(() => props.product.typeDetail.report)

const basicItems = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: '发布日期', value: d.publishedAt },
    { label: '报告页数', value: d.pageCount ? `${d.pageCount} 页` : undefined },
    { label: '研究机构', value: d.author },
    { label: '报告版本', value: d.version },
    { label: '适用读者', value: d.audience, full: true },
    { label: '下载授权', value: d.license, full: true }
  ]
})

/** 目录项：带序号、页码与可读状态 */
const catalogRows = computed(() =>
  (detail.value?.catalog ?? []).map((item, idx) => ({
    no: String(idx + 1).padStart(2, '0'),
    title: item.title,
    page: item.page,
    // 已解锁则全部可读；否则只有 previewable 的章节可读
    readable: props.unlocked || item.previewable
  }))
)

/** 阅读器区块：可见的正常渲染，其余展示轮廓 + 解锁入口 */
const readerBlocks = computed(() =>
  (detail.value?.blocks ?? []).map((b) => ({
    ...b,
    open: props.unlocked || b.preview === 'visible'
  }))
)

/** 图表占位的柱高，固定值保证每次渲染一致 */
const BAR_HEIGHTS = [46, 62, 40, 76, 84]
</script>

<template>
  <div v-if="detail">
    <!-- 报告介绍 -->
    <template v-if="activeTab === 'overview'">
      <InfoGrid :items="basicItems" />
      <div
        v-if="product.entitlementPolicy?.kind === 'report_version'"
        class="mt-3 rounded-lg bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-700"
      >
        单品购买永久绑定当前版本 {{ product.entitlementPolicy.version }}；后续独立版本需另行购买。
      </div>
    </template>

    <!-- 目录 -->
    <div v-else-if="activeTab === 'catalog'">
      <div
        v-for="row in catalogRows"
        :key="row.no"
        class="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-0"
      >
        <span class="w-7 shrink-0 text-[17px] font-semibold tabular-nums text-slate-300">{{ row.no }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[14px] font-semibold text-slate-900">{{ row.title }}</span>
          <span v-if="row.page" class="mt-0.5 block text-[12px] text-slate-400">第 {{ row.page }} 页</span>
        </span>
        <span class="shrink-0 text-[13px] font-medium" :class="row.readable ? 'text-brand-500' : 'text-slate-400'">
          {{ row.readable ? '可阅读' : '会员/单篇' }}
        </span>
      </div>
    </div>

    <!-- 在线阅读 -->
    <div v-else-if="activeTab === 'reader'" class="space-y-3">
      <ProductContentPeek :product="product" />
      <div
        v-for="block in readerBlocks"
        :key="block.id"
        class="rounded-xl border border-slate-200 p-3.5"
      >
        <div class="text-[12px] text-slate-400">
          <template v-if="block.open && !unlocked">公开样例 · </template>第 {{ block.page ?? '—' }} 页
        </div>
        <div class="mt-1 text-[14px] font-semibold text-slate-900">{{ block.title }}</div>

        <!-- 可读：正文 + 图表区块渲染柱状占位 -->
        <template v-if="block.open">
          <p class="mt-2 text-[13px] leading-relaxed text-slate-600">{{ block.content }}</p>
          <div v-if="block.kind === 'chart'" class="mt-3 flex h-24 items-end gap-2.5">
            <span
              v-for="(h, i) in BAR_HEIGHTS"
              :key="i"
              class="flex-1 rounded-sm bg-brand-500"
              :style="{ height: `${h}%` }"
            />
          </div>
        </template>

        <!-- 未解锁：只给轮廓，不泄露正文 -->
        <template v-else>
          <p class="mt-2 text-[13px] leading-relaxed text-slate-300">
            完整正文与精确图表已打码，仅展示章节轮廓。
          </p>
          <button
            class="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-[13px] font-medium text-brand-500"
            @click="emit('unlock')"
          >
            阅读{{ block.title }}
          </button>
        </template>
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
</template>
