<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta, priceDisplay } from '@/utils/productMeta'
import type { Product, ProductType } from '@/types/domain'
import type { Resource } from '@/types/resource'
import { productCardSummary } from '@/domain/productCardSummary'
import ProductChips from '@/components/shared/ProductChips.vue'
import ProductSearchFilters from '@/components/shared/ProductSearchFilters.vue'
import {
  ROUTE_META,
  buildRetrievalHits,
  explainProductMatch,
  formatMatchExplain
} from '@/domain/discoverRouting'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const query = ref(String(route.query.q || ''))
const sortType = ref<'default' | 'price_asc' | 'latest'>('default')
const activeType = ref<ProductType | ''>((route.query.type as ProductType) || '')
const activeVenue = ref(String(route.query.venue || ''))

watch(
  () => route.query.q,
  (q) => {
    query.value = String(q || '')
  }
)

watch(
  () => route.query.mode,
  (mode) => {
    if (mode === 'ai') {
      router.replace({
        path: '/portal/ai-chat',
        query: { q: query.value || undefined, entry: 'ai' }
      })
    }
  },
  { immediate: true }
)

const marketResults = computed(() => {
  const results = catalog.search(query.value, {
    type: activeType.value || undefined,
    venue: activeVenue.value || undefined
  })
  if (sortType.value === 'price_asc') {
    return [...results].sort((a, b) => (a.price.itemPrice || 0) - (b.price.itemPrice || 0))
  }
  if (sortType.value === 'latest') {
    return [...results].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  return results
})

const rankedHits = computed(() => buildRetrievalHits(marketResults.value, query.value))

function matchExplainFor(productId: string) {
  const product = catalog.byId(productId)
  if (!product) return ''
  const hit = rankedHits.value.find((item) => item.id === productId)
  if (hit) return formatMatchExplain(hit)
  return formatMatchExplain(explainProductMatch(product, query.value))
}

const internalResults = computed(() => catalog.searchInternalViews(query.value))

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

function cardSummary(product: Product) {
  if (product.type === 'dataset' || product.type === 'api') {
    return productCardSummary(product).lead
  }
  return product.recommendText || product.subtitle
}

function handleSearch() {
  router.replace({
    path: '/portal/search',
    query: {
      q: query.value.trim() || undefined,
      entry: 'keyword',
      type: activeType.value || undefined,
      venue: activeVenue.value || undefined
    }
  })
}

function handleItemClick(item: MixedResult) {
  if (item.type === 'product') {
    router.push(`/portal/product/${(item.data as Product).id}`)
  } else {
    const url = (item.data as Resource).typeDetail.userView?.externalUrl
    if (url) window.open(url, '_blank')
  }
}

function goAi(from?: string) {
  router.push({
    path: '/portal/ai-chat',
    query: {
      q: query.value.trim() || undefined,
      entry: 'ai',
      from
    }
  })
}
</script>

<template>
  <div class="mx-auto max-w-5xl" data-testid="portal-keyword-search">
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">关键词搜索</h1>
          <p class="mt-0.5 text-xs text-slate-400">按名称、关键词匹配商品</p>
        </div>
        <div
          class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
          data-testid="route-badge"
        >
          {{ ROUTE_META.known_lookup.label }}
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <input
          v-model="query"
          data-testid="portal-search-input"
          class="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          placeholder="搜索数据资产名称、关键词..."
          @keyup.enter="handleSearch"
        />
        <button
          class="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          data-testid="portal-search-submit"
          @click="handleSearch"
        >
          搜索
        </button>
        <button
          class="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
          data-testid="portal-go-ai"
          @click="goAi()"
        >
          AI 问答
        </button>
      </div>

      <div class="mt-4">
        <ProductSearchFilters
          v-model:type="activeType"
          v-model:venue="activeVenue"
          variant="portal"
        />
      </div>
    </div>

    <div v-if="mixedResults.length" class="mt-4 flex items-center justify-between">
      <div class="text-sm text-slate-400">
        共 {{ mixedResults.length }} 条结果
        <span v-if="mixedResults.length > 0 && mixedResults.length < 10"> · 已展示全部</span>
      </div>
      <div class="flex gap-2 text-sm">
        <button
          class="rounded-md px-3 py-1"
          :class="sortType === 'default' ? 'bg-brand-50 font-medium text-brand-600' : 'text-slate-500'"
          @click="sortType = 'default'"
        >默认</button>
        <button
          class="rounded-md px-3 py-1"
          :class="sortType === 'price_asc' ? 'bg-brand-50 font-medium text-brand-600' : 'text-slate-500'"
          @click="sortType = 'price_asc'"
        >价格↑</button>
        <button
          class="rounded-md px-3 py-1"
          :class="sortType === 'latest' ? 'bg-brand-50 font-medium text-brand-600' : 'text-slate-500'"
          @click="sortType = 'latest'"
        >最新</button>
      </div>
    </div>

    <div v-if="mixedResults.length" class="mt-3 space-y-2">
      <div
        v-for="item in mixedResults"
        :key="(item.data as Product | Resource).id"
        class="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
        @click="handleItemClick(item)"
      >
        <div class="flex min-w-0 shrink-0 flex-col items-start gap-1.5">
          <span
            class="rounded px-2 py-1 text-xs font-medium"
            :class="item.source === 'market' ? 'bg-brand-50 text-brand-600' : 'bg-emerald-50 text-emerald-600'"
          >{{ item.source === 'market' ? '🏪市场' : '🏠内部' }}</span>
          <ProductChips v-if="item.type === 'product'" :product="item.data as Product" />
          <span v-else class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{{ item.label }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-slate-800">
            {{ item.type === 'product' ? (item.data as Product).name : (item.data as Resource).resourceName }}
          </div>
          <div v-if="item.type === 'product'" class="mt-0.5 line-clamp-2 text-xs text-slate-400">
            {{ cardSummary(item.data as Product) }}
          </div>
          <div v-else class="mt-0.5 text-xs text-slate-400">
            {{ (item.data as Resource).typeDetail.userView?.dataSourceName }} · {{ (item.data as Resource).typeDetail.userView?.chartType }}
          </div>
          <div
            v-if="item.type === 'product' && query.trim()"
            class="mt-1 text-[11px] text-slate-400"
            data-testid="match-explain"
          >
            {{ matchExplainFor((item.data as Product).id) }}
          </div>
        </div>
        <div class="shrink-0 text-right">
          <div v-if="item.type === 'product'" class="text-sm font-medium" :class="priceDisplay(item.data as Product).tone">
            {{ priceDisplay(item.data as Product).label }}
          </div>
          <div v-else class="text-sm font-medium text-emerald-600">跳转</div>
          <div class="mt-1 text-xs text-slate-400">{{ item.type === 'product' ? '详情' : '打开' }} →</div>
        </div>
      </div>
    </div>

    <div
      v-else-if="query.trim() && !mixedResults.length"
      class="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center"
    >
      <div class="text-4xl">🔍</div>
      <div class="mt-2 text-sm font-medium text-slate-600">未找到匹配的结果</div>
      <div class="mt-1 text-xs text-slate-400">可改用 AI 问答做汇总与对比，或提交需求</div>
      <div class="mt-4 flex justify-center gap-3">
        <button
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white"
          data-testid="upgrade-ai-cta"
          @click="goAi('keyword_empty')"
        >
          没有命中？试试 AI 问答
        </button>
        <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600" @click="router.push('/portal/demand')">
          提交需求
        </button>
      </div>
    </div>

    <div v-else-if="!mixedResults.length" class="mt-6 rounded-xl bg-white p-8 text-center">
      <div class="text-4xl">📭</div>
      <div class="mt-2 text-sm text-slate-500">暂无上架商品</div>
    </div>
  </div>
</template>
