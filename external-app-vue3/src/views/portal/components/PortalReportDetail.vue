<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Product } from '@/types/domain'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'
import ProductContentPeek from '@/components/ProductContentPeek.vue'
import ReportPreviewGallery from '@/components/shared/ReportPreviewGallery.vue'

export interface InfoItem {
  label: string
  value?: string | number | null
  full?: boolean
}

const props = defineProps<{
  product: Product
  activeTab: string
  unlocked: boolean
}>()

const emit = defineEmits<{ unlock: [] }>()

const detail = computed(() => props.product.typeDetail.report)

/** 报告类型特有基础信息 */
const reportItems = computed<InfoItem[]>(() => {
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

/** 左侧目录当前高亮章节 */
const activeBlockId = ref('')
watch(readerBlocks, (blocks) => {
  if (!blocks.some((b) => b.id === activeBlockId.value)) {
    activeBlockId.value = blocks[0]?.id ?? ''
  }
}, { immediate: true })

function scrollToBlock(id: string) {
  activeBlockId.value = id
  document.getElementById(`portal-report-block-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function displayValue(value: InfoItem['value']) {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'number' ? value.toLocaleString() : value
}

/** 图表占位的柱高，固定值保证每次渲染一致 */
const BAR_HEIGHTS = [46, 62, 40, 76, 84]
</script>

<template>
  <div v-if="detail">
    <!-- 报告介绍 -->
    <div v-if="activeTab === 'overview'" class="space-y-5">
      <!-- 关键指标（报告专属） -->
      <div>
        <div class="mb-2 text-sm font-semibold text-ink-900">报告信息</div>
        <dl class="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-ink-100 bg-ink-100">
          <div
            v-for="(item, idx) in reportItems"
            :key="`${item.label}-${idx}`"
            class="bg-white px-3 py-2.5"
            :class="item.full ? 'col-span-3' : ''"
          >
            <dt class="text-xs text-ink-500">{{ item.label }}</dt>
            <dd class="mt-0.5 text-sm font-semibold text-ink-900">{{ displayValue(item.value) }}</dd>
          </div>
        </dl>
      </div>

      <!-- 资源信息 + 合规与授权 + 提供方 -->
      <ProductInfoSections :product="product" />

      <div
        v-if="product.entitlementPolicy?.kind === 'report_version'"
        class="rounded-lg bg-violet-50 p-3 text-xs leading-relaxed text-violet-600"
      >
        企业购买绑定当前版本 {{ product.entitlementPolicy.version }}；后续独立版本需另行购买。
      </div>

      <div class="space-y-2 text-sm leading-relaxed">
        <div class="text-sm font-semibold text-ink-900">商品说明书</div>
        <div><span class="text-ink-500">价值主张：</span><span class="text-ink-700">{{ product.valueProposition }}</span></div>
        <div><span class="text-ink-500">详细描述：</span><span class="text-ink-700">{{ product.description }}</span></div>
        <div><span class="text-ink-500">质量/服务承诺：</span><span class="text-ink-700">{{ product.qualityPromise }}</span></div>
        <div><span class="text-ink-500">合规声明：</span><span class="text-ink-700">{{ product.complianceNote }}</span></div>
      </div>

      <!-- 产品介绍（空间同步富文本） -->
      <div v-if="product.spaceMeta?.productIntroduction" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-ink-900">产品介绍</span>
          <span class="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600">来自可信空间</span>
        </div>
        <p class="whitespace-pre-line text-sm leading-relaxed text-ink-600">{{ product.spaceMeta.productIntroduction }}</p>
      </div>
    </div>

    <!-- 目录 -->
    <div v-else-if="activeTab === 'catalog'">
      <div
        v-for="row in catalogRows"
        :key="row.no"
        class="flex items-center gap-3 border-b border-ink-100 py-3.5 last:border-0"
      >
        <span class="w-8 shrink-0 text-lg font-semibold tabular-nums text-ink-300">{{ row.no }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-ink-900">{{ row.title }}</span>
          <span v-if="row.page" class="mt-0.5 block text-xs text-ink-500">第 {{ row.page }} 页</span>
        </span>
        <span class="shrink-0 text-sm font-medium" :class="row.readable ? 'text-violet-500' : 'text-ink-500'">
          {{ row.readable ? '可阅读' : '会员/单篇' }}
        </span>
      </div>
    </div>

    <!-- 报表预览 -->
    <div v-else-if="activeTab === 'preview'" class="space-y-4">
      <ReportPreviewGallery :preview-images="detail.previewImages" platform="pc" title="报表预览" />
      <ProductContentPeek :product="product" />
    </div>

    <!-- 在线阅读：左侧目录侧边栏 + 右侧正文区 -->
    <div v-else-if="activeTab === 'reader'" class="grid grid-cols-[180px_1fr] gap-4">
      <ProductContentPeek :product="product" class="col-span-2" />
      <!-- 左侧目录侧边栏 -->
      <div class="sticky top-20 self-start">
        <div class="mb-2 text-xs font-medium text-ink-500">目录</div>
        <div class="space-y-0.5">
          <button
            v-for="(block, idx) in readerBlocks"
            :key="block.id"
            class="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
            :class="activeBlockId === block.id
              ? 'bg-violet-50 font-medium text-violet-600'
              : 'text-ink-500 hover:bg-ink-100'"
            @click="scrollToBlock(block.id)"
          >
            <span class="shrink-0 tabular-nums text-ink-300">{{ String(idx + 1).padStart(2, '0') }}</span>
            <span class="min-w-0 flex-1 truncate">{{ block.title }}</span>
            <span v-if="block.open" class="shrink-0"><svg class="inline h-3.5 w-3.5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
          </button>
        </div>
      </div>

      <!-- 右侧正文区 -->
      <div class="space-y-3">
        <div
          v-for="block in readerBlocks"
          :id="`portal-report-block-${block.id}`"
          :key="block.id"
          class="scroll-mt-20 rounded-xl border border-ink-200 p-4"
        >
          <div class="text-xs text-ink-500">
            <template v-if="block.open && !unlocked">公开样例 · </template>第 {{ block.page ?? '—' }} 页
          </div>
          <div class="mt-1 text-sm font-semibold text-ink-900">{{ block.title }}</div>

          <!-- 可读：正文 + 图表区块渲染柱状占位 -->
          <template v-if="block.open">
            <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ block.content }}</p>
            <div v-if="block.kind === 'chart'" class="mt-3 flex h-28 items-end gap-2.5">
              <span
                v-for="(h, i) in BAR_HEIGHTS"
                :key="i"
                class="flex-1 rounded-sm bg-violet-500"
                :style="{ height: `${h}%` }"
              />
            </div>
          </template>

          <!-- 未解锁：只给轮廓，不泄露正文 -->
          <template v-else>
            <p class="mt-2 text-sm leading-relaxed text-ink-300">
              完整正文与精确图表已打码，仅展示章节轮廓。
            </p>
            <button
              class="mt-3 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-violet-500 hover:bg-violet-50"
              @click="emit('unlock')"
            >
              阅读{{ block.title }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-sm text-ink-500">资料准备中</div>
</template>
