<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import './portal-concept.css'
import DataNexus from './components/DataNexus.vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { typeMeta, listedAtOf } from '@/utils/productMeta'
import type { Product, ProductType } from '@/types/domain'
import type { Resource } from '@/types/resource'
import { productCardSummary } from '@/domain/productCardSummary'
import { productPriceSummary } from '@/domain/productPriceSummary'
import { productListChips, productTrialChips } from '@/domain/productListChips'
import { hasExpiredEnterpriseProductEntitlement } from '@/domain/v102Trade'
import { isDiscoverProductUsable } from '@/domain/discoverUsability'
import {
  buildRetrievalHits,
  explainProductMatch,
  formatMatchExplain
} from '@/domain/discoverRouting'
import PortalProductIcon from './components/PortalProductIcon.vue'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()

const query = ref(String(route.query.q || ''))
const sortType = ref<'default' | 'price_asc' | 'latest'>('default')
// 结果视图：长卡（单列）与豆腐块（双列网格）可切换
const viewMode = ref<'list' | 'grid'>('grid')
const activeType = ref<ProductType | ''>((route.query.type as ProductType) || '')
const activeVenue = ref(String(route.query.venue || ''))
const usableOnly = ref(false)
const activeOps = ref('')

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

// ---------- 筛选 ----------
const filters = reactive({
  venueKind: '' as '' | 'platform' | 'space' | 'seller'
})

const TYPE_OPTIONS: Array<{ key: ProductType; label: string }> = [
  { key: 'dataset', label: '数据集' },
  { key: 'api', label: 'API' },
  { key: 'report', label: '行业报告' },
  { key: 'dashboard', label: '自有看板' }
]

const VENUE_OPTIONS = [
  { key: 'platform', label: '自营产品' },
  { key: 'space', label: '可信空间' },
  { key: 'seller', label: '入驻商家' }
] as const

const OPS_OPTIONS = ['热门', '合规首选'] as const

const activeFilterCount = computed(() => {
  let n = usableOnly.value ? 1 : 0
  if (activeType.value) n += 1
  if (filters.venueKind) n += 1
  if (activeOps.value) n += 1
  return n
})

function resetFilters() {
  activeType.value = ''
  activeVenue.value = ''
  usableOnly.value = false
  filters.venueKind = ''
  activeOps.value = ''
  page.value = 1
}

// ---------- 检索结果 ----------
const baseResults = computed(() =>
  catalog.search(query.value, {
    type: activeType.value || undefined,
    venue: activeVenue.value || undefined
  })
)

const filteredProducts = computed(() =>
  baseResults.value.filter((p) => {
    const venue = productListChips(p).venue
    if (filters.venueKind === 'platform' && venue) return false
    if (filters.venueKind === 'space' && (!venue || venue.kind !== 'space')) return false
    if (filters.venueKind === 'seller' && (!venue || venue.kind !== 'seller')) return false
    if (activeOps.value) {
      const ops = productListChips(p).ops
      if (!ops || ops.kind !== 'campaign' || ops.label !== activeOps.value) return false
    }
    if (usableOnly.value && !isDiscoverProductUsable(p, {
      enterpriseAuthenticated: user.isEnterpriseAuthenticated,
      accessLevel: entitlements.accessLevel(p),
      serviceExpired: hasExpiredEnterpriseProductEntitlement(entitlements.list, p.id, user.context.currentEnterpriseId)
    })) return false

    return true
  })
)

const sortedProducts = computed(() => {
  if (sortType.value === 'price_asc') {
    return [...filteredProducts.value].sort((a, b) => (a.price.itemPrice || 0) - (b.price.itemPrice || 0))
  }
  if (sortType.value === 'latest') {
    return [...filteredProducts.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  return filteredProducts.value
})

const rankedHits = computed(() => buildRetrievalHits(baseResults.value, query.value))

function matchExplainFor(productId: string) {
  const product = catalog.byId(productId)
  if (!product) return ''
  const hit = rankedHits.value.find((item) => item.id === productId)
  if (hit) return formatMatchExplain(hit)
  return formatMatchExplain(explainProductMatch(product, query.value))
}

const hasExtraFilters = computed(
  () => activeFilterCount.value > 0
)

const internalResults = computed(() =>
  hasExtraFilters.value ? [] : catalog.searchInternalViews(query.value)
)

interface MixedResult {
  type: 'product' | 'view'
  data: Product | Resource
  label: string
  source: 'market' | 'internal'
}

const mixedResults = computed<MixedResult[]>(() => [
  ...sortedProducts.value.map((p) => ({
    type: 'product' as const,
    data: p,
    label: typeMeta[p.type].label,
    source: 'market' as const
  })),
  ...internalResults.value.map((v) => ({
    type: 'view' as const,
    data: v,
    label: '内部视图',
    source: 'internal' as const
  }))
])

// ---------- 分页 ----------
const page = ref(1)
const PAGE_SIZE = 10
const totalPages = computed(() => Math.max(1, Math.ceil(mixedResults.value.length / PAGE_SIZE)))
watch([query, sortType, filters, activeType, activeVenue, usableOnly, activeOps], () => {
  page.value = 1
})
const pagedResults = computed(() =>
  mixedResults.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = page.value
  const pages: number[] = []
  const start = Math.max(1, Math.min(current - 2, total - 4))
  const end = Math.min(total, start + 4)
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
})

// ---------- 顶部筛选分面计数 ----------
const typeCounts = computed(() => {
  const counts = new Map<ProductType, number>()
  for (const p of baseResults.value) counts.set(p.type, (counts.get(p.type) || 0) + 1)
  return counts
})

const venueCounts = computed(() => {
  const counts = { platform: 0, space: 0, seller: 0 }
  for (const p of baseResults.value) {
    const kind = productListChips(p).venue?.kind
    if (kind === 'space') counts.space += 1
    else if (kind === 'seller') counts.seller += 1
    else counts.platform += 1
  }
  return counts
})

const opsCounts = computed(() => {
  const counts: Record<string, number> = { 热门: 0, 合规首选: 0 }
  for (const p of baseResults.value) {
    const ops = productListChips(p).ops
    if (ops?.kind === 'campaign' && ops.label in counts) counts[ops.label] += 1
  }
  return counts
})

// ---------- 行展示 ----------
function cardSummary(product: Product) {
  if (product.type === 'dataset' || product.type === 'api') {
    return productCardSummary(product).lead
  }
  return product.recommendText || product.subtitle
}

function productMetrics(p: Product): string {
  return [p.coverage, p.updateFrequency, p.provider].filter(Boolean).join(' · ')
}

function opsChip(p: Product) {
  const label = productListChips(p).ops?.label
  if (!label) return ''
  // 营销标签每卡至多 1 个
  return label === '热门' || label === '合规首选' ? label : ''
}

function venueChip(p: Product) {
  return productListChips(p).venue?.name || ''
}

// 豆腐块元信息行：类型 · 来源
function typeLine(p: Product): string {
  const chips = productListChips(p)
  return [typeMeta[p.type].label, chips.venue?.name].filter(Boolean).join(' · ')
}

function toggleFavorite(e: Event, id: string) {
  e.stopPropagation()
  catalog.toggleFavorite(id)
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
  <div class="market-concept">
    <div class="market-container" data-testid="portal-keyword-search">
      <section class="market-hero">
        <div class="hero-copy">
          <div class="hero-eyebrow"><span class="live-dot"></span> CONNECTING DATA. CREATING VALUE.<span class="concept-tag">DESIGN EXPLORATION / 01</span></div>
          <h1>让数据的价值，<span>超越你的想象。</span></h1>
          <p>交通运输全链路数据 · 官方审核上架 · 可信空间交付</p>
        </div>
        <DataNexus />
      </section>

      <!-- 主体：左侧筛选栏 + 右侧结果 -->
      <div class="market-body relative mt-2 flex gap-4">
        <!-- 左侧筛选栏 -->
        <aside class="market-sidebar w-52 shrink-0">
          <div class="sticky top-2 rounded-lg border border-[#F0F1F3] bg-white/90 p-4 shadow-card backdrop-blur">
            <div class="mb-3 text-[14px] font-semibold text-ink-900">商品筛选</div>
            <div data-testid="portal-filter-toolbar" class="space-y-4">
              <div>
                <div class="mb-1.5 text-[12px] font-medium text-ink-500">类别</div>
                <div class="filter-chip-options">
                  <button :aria-pressed="!activeType" :class="{ chosen: !activeType }" @click="activeType = ''">全部</button>
                  <button v-for="opt in TYPE_OPTIONS" :key="opt.key" :aria-pressed="activeType === opt.key" :class="{ chosen: activeType === opt.key }" @click="activeType = activeType === opt.key ? '' : opt.key">{{ opt.label }}</button>
                </div>
              </div>
              <!-- 来源 -->
              <div>
                <div class="mb-1.5 text-[12px] font-medium text-ink-500">来源</div>
                <div class="space-y-0.5">
                  <button
                    v-for="opt in VENUE_OPTIONS"
                    :key="opt.key"
                    class="flex w-full items-center justify-between rounded-md px-2 py-1 text-[13px] transition"
                    :class="filters.venueKind === opt.key ? 'bg-violet-50 text-violet-700' : 'text-ink-600 hover:bg-ink-100/60'"
                    @click="filters.venueKind = filters.venueKind === opt.key ? '' : opt.key"
                  >
                    <span>{{ opt.label }}</span>
                    <span class="text-[11px]" :class="filters.venueKind === opt.key ? 'text-violet-400' : 'text-ink-400'">{{ venueCounts[opt.key] }}</span>
                  </button>
                </div>
              </div>

              <!-- 运营标签 -->
              <div>
                <div class="mb-1.5 text-[12px] font-medium text-ink-500">运营标签</div>
                <div class="space-y-0.5">
                  <button
                    v-for="label in OPS_OPTIONS"
                    :key="label"
                    class="flex w-full items-center justify-between rounded-md px-2 py-1 text-[13px] transition"
                    :class="activeOps === label ? 'bg-violet-50 text-violet-700' : 'text-ink-600 hover:bg-ink-100/60'"
                    @click="activeOps = activeOps === label ? '' : label"
                  >
                    <span>{{ label }}</span>
                    <span class="text-[11px]" :class="activeOps === label ? 'text-violet-400' : 'text-ink-400'">{{ opsCounts[label] || 0 }}</span>
                  </button>
                </div>
              </div>

              <!-- 可使用 -->
              <div>
                <div class="mb-1.5 text-[12px] font-medium text-ink-500">使用权限</div>
                <button
                  data-testid="portal-usable-filter"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px] transition"
                  :class="usableOnly ? 'bg-violet-50 text-violet-700' : 'text-ink-600 hover:bg-ink-100/60'"
                  :aria-pressed="usableOnly"
                  @click="usableOnly = !usableOnly"
                >
                  <span class="flex h-4 w-4 items-center justify-center rounded border" :class="usableOnly ? 'border-violet-500 bg-violet-500' : 'border-ink-300'">
                    <svg v-if="usableOnly" class="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                  </span>
                  我可使用
                </button>
              </div>

              <!-- 重置 -->
              <button
                v-if="activeFilterCount"
                class="w-full rounded-md border border-ink-200 py-1.5 text-[12px] text-ink-500 transition hover:border-danger-300 hover:text-danger-500"
                @click="resetFilters"
              >
                重置筛选（{{ activeFilterCount }}）
              </button>
            </div>
          </div>
        </aside>

        <!-- 右侧结果区 -->
        <div class="market-results min-w-0 flex-1">
          <!-- 结果工具栏 -->
          <div class="market-toolbar mb-3 flex items-center gap-2">
            <div class="text-[13px] text-ink-500">
              共 <span class="font-semibold text-ink-900">{{ mixedResults.length }}</span> 条结果
            </div>
            <span class="toolbar-spacer flex-1"></span>
            <div class="inline-flex rounded-lg bg-ink-100 p-0.5 text-[13px]">
              <button
                class="rounded-md px-3 py-1 transition"
                :class="sortType === 'default' ? 'bg-white font-medium text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'"
                @click="sortType = 'default'"
              >综合</button>
              <button
                class="rounded-md px-3 py-1 transition"
                :class="sortType === 'latest' ? 'bg-white font-medium text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'"
                @click="sortType = 'latest'"
              >最新</button>
              <button
                class="rounded-md px-3 py-1 transition"
                :class="sortType === 'price_asc' ? 'bg-white font-medium text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'"
                @click="sortType = 'price_asc'"
              >价格 ↑</button>
            </div>
            <div class="inline-flex rounded-lg bg-ink-100 p-0.5">
              <button
                class="rounded-md px-2 py-1 transition"
                :class="viewMode === 'list' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'"
                aria-label="长卡视图"
                @click="viewMode = 'list'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button
                class="rounded-md px-2 py-1 transition"
                :class="viewMode === 'grid' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'"
                aria-label="豆腐块视图"
                @click="viewMode = 'grid'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
              </button>
            </div>
            <section class="discovery-console" aria-label="数据搜索">
        <form class="nexus-search" @submit.prevent="handleSearch">
          <input v-model="query" data-testid="portal-search-input" aria-label="搜索数据商品" placeholder="搜索数据商品">
          <button type="submit" data-testid="portal-search-submit">搜索</button>
        </form>
        <button class="search-ai-link" data-testid="portal-go-ai" @click="goAi()">AI 问答</button>
            </section>

          </div>

          <!-- 长卡视图 -->
          <div v-if="viewMode === 'list'" class="space-y-2.5">
            <div
              v-for="item in pagedResults"
              :key="(item.data as Product | Resource).id"
              class="market-card market-list-card group relative flex cursor-pointer items-start gap-4 rounded-lg border border-ink-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-card-hover-violet"
              role="link"
              tabindex="0"
              @keydown.enter="handleItemClick(item)"
              @keydown.space.prevent="handleItemClick(item)"
              @click="handleItemClick(item)"
            >
              <!-- 右上角：收藏 -->
              <div class="absolute right-3 top-3 flex items-center gap-1.5">
                <button
                  v-if="item.type === 'product'"
                  class="text-ink-300 transition hover:text-warning-500"
                  :class="(item.data as Product).favorite ? 'text-warning-500' : ''"
                  :aria-label="(item.data as Product).favorite ? '取消收藏' : '收藏'"
                  @click.stop="toggleFavorite($event, (item.data as Product).id)"
                >
                  <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" :fill="(item.data as Product).favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </div>

              <!-- 类型图标 -->
              <PortalProductIcon v-if="item.type === 'product'" :type="(item.data as Product).type" :size="44" />
              <span v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-5h4v5" /></svg>
              </span>

              <!-- 主体 -->
              <div class="min-w-0 flex-1 pr-24">
                <div class="flex items-center gap-2">
                  <div class="truncate text-[16px] font-semibold text-ink-900 transition group-hover:text-violet-700">
                    {{ item.type === 'product' ? (item.data as Product).name : (item.data as Resource).resourceName }}
                  </div>
                  <span
                    v-if="item.type === 'product' && opsChip(item.data as Product)"
                    class="flex shrink-0 items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-700"
                  >
                    <svg v-if="opsChip(item.data as Product) === '热门'" class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2 5.6L20 11l-6 2.4L12 19l-2-5.6L4 11l6-2.4z" /></svg>
                    <svg v-else class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.4 2.9 7.8 7 10 4.1-2.2 7-5.6 7-10V6z" /><path d="m9 11.5 2 2 4-4" /></svg>
                    {{ opsChip(item.data as Product) }}
                  </span>
                </div>

                <div v-if="item.type === 'product'" class="mt-1.5 truncate text-[13px] leading-5 text-ink-600">
                  {{ cardSummary(item.data as Product) }}
                </div>
                <div v-else class="mt-1.5 truncate text-[13px] leading-5 text-ink-600">
                  {{ (item.data as Resource).typeDetail.userView?.dataSourceName }} · {{ (item.data as Resource).typeDetail.userView?.chartType }}
                </div>

                <div v-if="item.type === 'product'" class="mt-1 truncate text-[12px] text-ink-500">
                  {{ productMetrics(item.data as Product) }}
                </div>

                <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span
                    v-if="item.type === 'product' && venueChip(item.data as Product)"
                    class="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600"
                  >{{ venueChip(item.data as Product) }}</span>
                  <span v-else-if="item.type === 'view'" class="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] text-violet-600">{{ item.label }}</span>
                  <span
                    v-if="item.type === 'product' && (item.data as Product).hasTrialApi"
                    class="rounded-md border border-violet-200 px-2 py-0.5 text-[11px] text-violet-600"
                  >可试用</span>
                  <span
                    v-if="item.type === 'product' && productTrialChips(item.data as Product).includes('有样例')"
                    class="rounded-md border border-ink-200 px-2 py-0.5 text-[11px] text-ink-600"
                  >有样例</span>
                </div>

                <div
                  v-if="item.type === 'product' && query.trim()"
                  class="mt-1.5 truncate text-[11px] text-ink-400"
                  data-testid="match-explain"
                >
                  {{ matchExplainFor((item.data as Product).id) }}
                </div>
              </div>

              <!-- 价格（右栏） -->
              <div class="absolute bottom-4 right-4 flex flex-col items-end">
                <template v-if="item.type === 'product'">
                  <template v-if="productPriceSummary(item.data as Product).kind === 'money'">
                    <div class="text-[22px] font-bold leading-none tabular-nums text-violet-600">
                      <span class="text-[13px] align-top">¥</span>{{ productPriceSummary(item.data as Product).text.replace('¥', '') }}
                      <span class="ml-0.5 text-[12px] font-normal text-ink-400">{{ productPriceSummary(item.data as Product).suffix }}</span>
                    </div>
                    <div v-if="productPriceSummary(item.data as Product).hint" class="mt-1 text-[11px] text-ink-400">
                      {{ productPriceSummary(item.data as Product).hint }}
                    </div>
                  </template>
                  <div
                    v-else-if="productPriceSummary(item.data as Product).kind === 'free'"
                    class="text-[20px] font-bold text-violet-600"
                  >{{ productPriceSummary(item.data as Product).text }}</div>
                  <div
                    v-else
                    class="rounded-md bg-ink-100 px-2.5 py-1 text-[12px] text-ink-600"
                  >{{ productPriceSummary(item.data as Product).text }}</div>
                </template>
                <span v-else class="text-[14px] font-medium text-violet-600">内部视图</span>
              </div>
            </div>
          </div>

          <!-- 紧凑商品卡片 -->
          <div v-else class="market-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <article v-for="item in pagedResults" :key="item.data.id"
              class="market-card product-tile group"
              :data-kind="item.type === 'product' ? (item.data as Product).type : 'view'"
              role="link" tabindex="0"
              @keydown.enter.self="handleItemClick(item)"
              @keydown.space.self.prevent="handleItemClick(item)"
              @click="handleItemClick(item)">
              <div class="tile-heading">
                <div class="tile-icon"><PortalProductIcon :type="item.type === 'product' ? (item.data as Product).type : 'view'" :size="38" /></div>
                <h2>{{ item.type === 'product' ? (item.data as Product).name : (item.data as Resource).resourceName }}</h2>
                <button v-if="item.type === 'product'" class="tile-favorite" :class="{ saved: (item.data as Product).favorite }"
                  :aria-label="(item.data as Product).favorite ? '取消收藏' : '收藏'"
                  @click.stop="toggleFavorite($event, (item.data as Product).id)">
                  <svg width="16" height="16" viewBox="0 0 24 24" :fill="(item.data as Product).favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5"><path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3L2.8 9.7l6.4-.9z"/></svg>
                </button>
              </div>
              <div class="tile-chips">
                <span class="tile-type">{{ item.label }}</span>
                <template v-if="item.type === 'product'">
                  <span v-if="opsChip(item.data as Product)" class="tile-ops">{{ opsChip(item.data as Product) }}</span>
                  <span v-if="(item.data as Product).hasTrialApi">可试用</span>
                  <span v-if="productTrialChips(item.data as Product).includes('有样例')">有样例</span>
                </template>
              </div>
              <p class="tile-summary">{{ item.type === 'product' ? cardSummary(item.data as Product) : (item.data as Resource).typeDetail.userView?.dataSourceName }}</p>
              <div v-if="item.type === 'product' && query.trim()" class="tile-match" data-testid="match-explain">{{ matchExplainFor((item.data as Product).id) }}</div>
              <div class="tile-source"><span>{{ item.type === 'product' ? venueChip(item.data as Product) || '自营产品' : 'BI 资源' }}</span><time v-if="item.type === 'product'">{{ listedAtOf(item.data as Product) }}</time></div>
              <div class="tile-footer">
                <div v-if="item.type === 'product'" class="tile-pricing">
                  <strong :class="{ 'tile-money': productPriceSummary(item.data as Product).kind === 'money' }">{{ productPriceSummary(item.data as Product).text }}<small>{{ productPriceSummary(item.data as Product).suffix }}</small></strong>
                  <span v-if="productPriceSummary(item.data as Product).hint">{{ productPriceSummary(item.data as Product).hint }}</span>
                </div>
                <strong v-else class="tile-view">内部视图</strong>
                <span class="tile-detail" aria-hidden="true">查看详情 <b>↗</b></span>
              </div>
            </article>
          </div>

          <!-- 分页 -->
          <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-1.5 text-[13px]">
            <button
              class="rounded-md border border-ink-200 px-2.5 py-1 text-ink-500 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page === 1"
              @click="page -= 1"
            >上一页</button>
            <button
              v-for="n in pageNumbers"
              :key="n"
              class="h-7 w-7 rounded-md text-[13px] transition"
              :class="n === page ? 'bg-brand-500 font-medium text-white' : 'text-ink-600 hover:bg-ink-100'"
              @click="page = n"
            >{{ n }}</button>
            <button
              class="rounded-md border border-ink-200 px-2.5 py-1 text-ink-500 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page === totalPages"
              @click="page += 1"
            >下一页</button>
          </div>

          <!-- 空态 -->
          <div
            v-if="usableOnly && !mixedResults.length"
            class="py-14 text-center"
          >
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <svg class="h-6 w-6 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6" /></svg>
            </div>
            <div class="mt-3 text-sm font-medium text-ink-700">当前企业暂无可直接使用的商品</div>
            <button class="mt-4 rounded-lg border border-ink-300 px-4 py-2 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-600" @click="resetFilters">清空筛选</button>
          </div>

          <div
            v-else-if="query.trim() && !mixedResults.length"
            class="py-14 text-center"
          >
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <svg class="h-6 w-6 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div class="mt-3 text-sm font-medium text-ink-700">未找到匹配的结果</div>
            <div class="mt-1 text-xs text-ink-500">可调整筛选条件，或改用 AI 问答做汇总与对比</div>
            <div class="mt-4 flex justify-center gap-3">
              <button
                v-if="activeFilterCount"
                class="rounded-lg border border-ink-300 px-4 py-2 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-600"
                @click="resetFilters"
              >
                清空筛选
              </button>
              <button
                class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white transition hover:bg-brand-600"
                data-testid="upgrade-ai-cta"
                @click="goAi('keyword_empty')"
              >
                没有命中？试试 AI 问答
              </button>
              <button class="rounded-lg border border-ink-300 px-4 py-2 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-600" @click="router.push({ path: '/portal/mine', query: { menu: 'demands', submitDemand: '1' } })">
                提交需求
              </button>
            </div>
          </div>

          <div v-else-if="!mixedResults.length" class="py-14 text-center text-sm text-ink-500">暂无上架商品</div>
        </div>
      </div>
    </div>
    <footer class="market-footer"><span>万联灵析 <b>/</b> 让数据成为生产力</span><span>DISCOVER · CONNECT · CREATE</span><span>PC 视觉探索版 01</span></footer>
  </div>
</template>

<style scoped>
/* 视觉探索样式集中在 portal-concept.css，限定在搜索门户内。 */
</style>
