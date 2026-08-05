<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useAiStore } from '@/stores/ai'
import { typeMeta, priceDisplay } from '@/utils/productMeta'
import type { Product } from '@/types/domain'
import type { Resource } from '@/types/resource'
import ProductContentPeek from '@/components/ProductContentPeek.vue'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const ai = useAiStore()

type SearchMode = 'keyword' | 'ai'
const mode = ref<SearchMode>(route.query.mode === 'ai' ? 'ai' : 'keyword')
const query = ref('')
const aiAnswer = ref('')
const sortType = ref<'default' | 'price_asc' | 'latest'>('default')

// 关键词模式结果
const marketResults = computed(() => {
  const results = catalog.search(query.value)
  if (sortType.value === 'price_asc') {
    return [...results].sort((a, b) => (a.price.itemPrice || 0) - (b.price.itemPrice || 0))
  }
  if (sortType.value === 'latest') {
    return [...results].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  return results
})

const internalResults = computed(() => catalog.searchInternalViews(query.value))

// 混排结果
interface MixedResult {
  type: 'product' | 'view'
  data: Product | Resource
  label: string
  source: 'market' | 'internal'
}

const mixedResults = computed<MixedResult[]>(() => {
  const products: MixedResult[] = marketResults.value.map((p) => ({
    type: 'product',
    data: p,
    label: typeMeta[p.type].label,
    source: 'market'
  }))
  const views: MixedResult[] = internalResults.value.map((v) => ({
    type: 'view',
    data: v,
    label: '内部视图',
    source: 'internal'
  }))
  return [...products, ...views]
})

function handleSearch() {
  if (mode.value === 'ai' && query.value.trim()) {
    ai.sendQuestion(query.value)
    setTimeout(() => {
      ai.flushResponse()
      // ChatMessage.role 为 'user' | 'ai'，文本内容在 blocks 中（无 text 字段）
      const lastAi = ai.chatMessages.filter((m) => m.role === 'ai').pop()
      const parts: string[] = []
      if (lastAi) {
        for (const b of lastAi.blocks) {
          if (b.type === 'text') parts.push(b.content)
        }
      }
      aiAnswer.value = parts.join('\n')
    }, 600)
  }
}

function handleItemClick(item: MixedResult) {
  if (item.type === 'product') {
    router.push(`/portal/product/${(item.data as Product).id}`)
  } else {
    const url = (item.data as Resource).typeDetail.userView?.externalUrl
    if (url) window.open(url, '_blank')
  }
}

function switchMode(m: SearchMode) {
  mode.value = m
  aiAnswer.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- 搜索栏 -->
    <div class="rounded-2xl bg-white p-6 shadow-sm">
      <div class="flex justify-center gap-2">
        <div class="flex rounded-lg bg-slate-100 p-1">
          <button
            class="rounded-md px-4 py-1.5 text-sm transition"
            :class="mode === 'keyword' ? 'bg-white text-brand-600 font-medium shadow-sm' : 'text-slate-500'"
            @click="switchMode('keyword')"
          >🔍 关键词</button>
          <button
            class="rounded-md px-4 py-1.5 text-sm transition"
            :class="mode === 'ai' ? 'bg-white text-brand-600 font-medium shadow-sm' : 'text-slate-500'"
            @click="switchMode('ai')"
          >🤖 AI问答</button>
        </div>
      </div>
      <div class="mt-4 flex justify-center gap-2">
        <input
          v-model="query"
          class="w-96 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          :placeholder="mode === 'keyword' ? '搜索数据资产名称、关键词...' : '描述你想了解的问题或需要的数据...'"
          @keyup.enter="handleSearch"
        />
        <button class="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600" @click="handleSearch">
          {{ mode === 'keyword' ? '搜索' : '提问' }}
        </button>
      </div>
    </div>

    <!-- AI 回答 -->
    <div v-if="mode === 'ai' && aiAnswer" class="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
      <div class="text-sm font-medium text-brand-700">🤖 AI回答</div>
      <div class="mt-2 text-sm leading-relaxed text-slate-700">{{ aiAnswer }}</div>
    </div>

    <!-- 排序 + 结果计数 -->
    <div v-if="mixedResults.length" class="mt-4 flex items-center justify-between">
      <div class="text-sm text-slate-400">共 {{ mixedResults.length }} 条结果</div>
      <div class="flex gap-2 text-sm">
        <button
          class="rounded-md px-3 py-1"
          :class="sortType === 'default' ? 'bg-brand-50 text-brand-600 font-medium' : 'text-slate-500'"
          @click="sortType = 'default'"
        >默认</button>
        <button
          class="rounded-md px-3 py-1"
          :class="sortType === 'price_asc' ? 'bg-brand-50 text-brand-600 font-medium' : 'text-slate-500'"
          @click="sortType = 'price_asc'"
        >价格↑</button>
        <button
          class="rounded-md px-3 py-1"
          :class="sortType === 'latest' ? 'bg-brand-50 text-brand-600 font-medium' : 'text-slate-500'"
          @click="sortType = 'latest'"
        >最新</button>
      </div>
    </div>

    <!-- 混排结果列表 -->
    <div v-if="mixedResults.length" class="mt-3 space-y-2">
      <div
        v-for="item in mixedResults"
        :key="(item.data as any).id"
        class="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
        @click="handleItemClick(item)"
      >
        <!-- 类型标签 -->
        <div class="flex shrink-0 items-center gap-2">
          <span
            class="rounded px-2 py-1 text-xs font-medium"
            :class="item.source === 'market' ? 'bg-brand-50 text-brand-600' : 'bg-emerald-50 text-emerald-600'"
          >{{ item.source === 'market' ? '🏪市场' : '🏠内部' }}</span>
          <span v-if="item.type === 'product'" class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{{ item.label }}</span>
        </div>
        <!-- 名称 + 描述 -->
        <div class="flex-1">
          <div class="text-sm font-semibold text-slate-800">{{ (item.data as any).name || (item.data as any).resourceName }}</div>
          <div v-if="item.type === 'product'" class="mt-0.5 text-xs text-slate-400">{{ (item.data as Product).subtitle }}</div>
          <div v-else class="mt-0.5 text-xs text-slate-400">{{ (item.data as Resource).typeDetail.userView?.dataSourceName }} · {{ (item.data as Resource).typeDetail.userView?.chartType }}</div>
          <ProductContentPeek v-if="item.type === 'product'" :product="item.data as Product" class="mt-2" />
        </div>
        <!-- 价格/操作 -->
        <div class="shrink-0 text-right">
          <div v-if="item.type === 'product'" class="text-sm font-medium" :class="priceDisplay(item.data as Product).tone">{{ priceDisplay(item.data as Product).label }}</div>
          <div v-else class="text-sm font-medium text-emerald-600">跳转</div>
          <div class="mt-1 text-xs text-slate-400">{{ item.type === 'product' ? '详情' : '打开' }} →</div>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else-if="query && !mixedResults.length" class="mt-8 rounded-xl bg-white p-8 text-center">
      <div class="text-4xl">🔍</div>
      <div class="mt-2 text-sm text-slate-500">未找到匹配的结果</div>
      <button class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white" @click="router.push('/portal/demand')">提交需求 →</button>
    </div>

    <!-- 默认（无搜索词）提示 -->
    <div v-else class="mt-8 rounded-xl bg-white p-8 text-center">
      <div class="text-4xl">👆</div>
      <div class="mt-2 text-sm text-slate-500">输入关键词开始搜索，或切换到 AI问答模式</div>
    </div>
  </div>
</template>
