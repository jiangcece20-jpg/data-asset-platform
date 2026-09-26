<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta } from '@/utils/productMeta'
import type { Product, ProductType } from '@/types/domain'
import type { Resource } from '@/types/resource'
import { productCardSummary } from '@/domain/productCardSummary'
import { productPriceSummary } from '@/domain/productPriceSummary'
import { productListChips } from '@/domain/productListChips'
import ProductTypeIcon from '@/components/shared/ProductTypeIcon.vue'
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

// ---------- 筛选 ----------
const filters = reactive({
  venueKind: '' as '' | 'platform' | 'space' | 'seller',
  priceKinds: [] as Array<'free' | 'money' | 'quote'>,
  freqs: [] as string[],
  scales: [] as string[],
  providers: [] as string[]
})

const TYPE_OPTIONS: Array<{ key: ProductType; label: string }> = [
  { key: 'dataset', label: '数据集' },
  { key: 'api', label: 'API' },
  { key: 'report', label: '行业报告' },
  { key: 'dashboard', label: '自有看板' }
]

const VENUE_OPTIONS = [
  { key: 'platform', label: '本平台' },
  { key: 'space', label: '可信空间' },
  { key: 'seller', label: '入驻商家' }
] as const

const PRICE_OPTIONS = [
  { key: 'free' as const, label: '免费' },
  { key: 'money' as const, label: '付费' },
  { key: 'quote' as const, label: '待报价' }
]

const FREQ_OPTIONS = [
  { key: '实时更新', label: '实时' },
  { key: '每日更新', label: '每日' },
  { key: '每周更新', label: '每周' },
  { key: '每月更新', label: '每月' },
  { key: '不定期', label: '不定期' }
]

const SCALE_OPTIONS = [
  { key: 'lt1w', label: '1 万行以内', test: (n: number) => n < 10_000 },
  { key: '1w-100w', label: '1 万–100 万行', test: (n: number) => n >= 10_000 && n < 1_000_000 },
  { key: 'gte100w', label: '100 万行以上', test: (n: number) => n >= 1_000_000 }
]

// 当前展开的顶部筛选面板（同一时间只开一个，点外部关闭）
const openFilter = ref<null | 'venue' | 'price' | 'scale' | 'freq' | 'provider'>(null)
function toggleFilterPanel(key: 'venue' | 'price' | 'scale' | 'freq' | 'provider') {
  openFilter.value = openFilter.value === key ? null : key
}
function closeFilterPanel() {
  openFilter.value = null
}

function toggle(list: string[], value: string) {
  const idx = list.indexOf(value)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(value)
}

const activeFilterCount = computed(() => {
  let n = filters.priceKinds.length + filters.freqs.length + filters.scales.length + filters.providers.length
  if (activeType.value) n += 1
  if (filters.venueKind) n += 1
  return n
})

function resetFilters() {
  activeType.value = ''
  activeVenue.value = ''
  filters.venueKind = ''
  filters.priceKinds.splice(0)
  filters.freqs.splice(0)
  filters.scales.splice(0)
  filters.providers.splice(0)
  closeFilterPanel()
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

    if (filters.priceKinds.length && !filters.priceKinds.includes(productPriceSummary(p).kind as 'free' | 'money' | 'quote')) return false

    if (filters.freqs.length && !filters.freqs.includes(p.updateFrequency)) return false

    if (filters.scales.length) {
      const rowCount = p.typeDetail.dataset?.rowCount
      if (typeof rowCount !== 'number' || !SCALE_OPTIONS.some((o) => filters.scales.includes(o.key) && o.test(rowCount))) {
        return false
      }
    }

    if (filters.providers.length && !filters.providers.includes(p.provider)) return false

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
watch([query, sortType, filters, activeType, activeVenue], () => {
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

const providerFacets = computed(() => {
  const counts = new Map<string, number>()
  for (const p of filteredProducts.value) {
    if (!p.provider) continue
    counts.set(p.provider, (counts.get(p.provider) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
})

const venueLabel = computed(
  () => VENUE_OPTIONS.find((o) => o.key === filters.venueKind)?.label || ''
)

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
  <div class="mx-auto max-w-6xl pb-10" data-testid="portal-keyword-search">
    <!-- 浅色科技头 -->
    <div class="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-[#EAF2FF] via-[#F4F8FF] to-[#F7F9FC] px-8 pb-7 pt-8">
      <!-- 装饰：柔和光斑 + 网格点 + 细环 -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl"></div>
      <div class="pointer-events-none absolute right-24 top-10 h-24 w-24 rounded-full bg-[#7BCFEE]/25 blur-2xl"></div>
      <div
        class="pointer-events-none absolute inset-0 opacity-60"
        style="background-image: radial-gradient(circle, rgba(46,107,255,0.10) 1px, transparent 1px); background-size: 18px 18px; -webkit-mask-image: linear-gradient(to left, #000 0%, transparent 55%); mask-image: linear-gradient(to left, #000 0%, transparent 55%);"
      ></div>
      <svg class="pointer-events-none absolute right-10 top-6 h-32 w-32 text-brand-400/25" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="54" stroke="currentColor" stroke-width="1" />
        <circle cx="60" cy="60" r="38" stroke="currentColor" stroke-width="1" stroke-dasharray="3 5" />
        <circle cx="60" cy="60" r="6" fill="currentColor" />
      </svg>

      <div class="relative max-w-2xl">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Data Marketplace</span>
          <span
            class="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-brand-600 ring-1 ring-brand-100"
            data-testid="route-badge"
          >{{ ROUTE_META.known_lookup.label }}</span>
        </div>
        <h1 class="mt-2 text-[26px] font-bold leading-tight text-ink-900">找数买数，一站完成</h1>
        <p class="mt-1 text-[13px] text-ink-500">检索已发布的数据集、API、行业报告与自有看板，按个人或企业身份查看真实可购买方案</p>

        <div class="mt-4 flex h-12 items-center gap-2 rounded-xl bg-white p-1.5 pl-4 shadow-card">
          <svg class="h-[18px] w-[18px] shrink-0 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="query"
            data-testid="portal-search-input"
            class="h-full min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            placeholder="输入关键词，如：运价、货车轨迹、订单预测"
            @keyup.enter="handleSearch"
          />
          <button
            class="h-9 shrink-0 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white transition hover:bg-brand-600"
            data-testid="portal-search-submit"
            @click="handleSearch"
          >
            找数
          </button>
          <button
            class="h-9 shrink-0 rounded-lg px-4 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            data-testid="portal-go-ai"
            @click="goAi()"
          >
            AI 问答
          </button>
        </div>
      </div>
    </div>

    <!-- 结果工作台：顶部导航式筛选，无侧栏 -->
    <div class="relative mt-4 rounded-2xl border border-[#F0F1F3] bg-white shadow-card">
      <div v-if="openFilter" class="fixed inset-0 z-40" @click="closeFilterPanel"></div>

      <!-- 类型 Tab -->
      <div class="flex items-center gap-1 overflow-x-auto border-b border-ink-100 px-4 text-sm">
        <button
          class="relative shrink-0 px-3 pb-2.5 pt-3 font-medium transition"
          :class="!activeType ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'"
          @click="activeType = ''"
        >
          全部<span class="ml-1 text-xs font-normal text-ink-400">{{ baseResults.length }}</span>
          <span v-if="!activeType" class="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500"></span>
        </button>
        <button
          v-for="opt in TYPE_OPTIONS"
          :key="opt.key"
          class="relative shrink-0 px-3 pb-2.5 pt-3 font-medium transition"
          :class="activeType === opt.key ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'"
          @click="activeType = activeType === opt.key ? '' : opt.key"
        >
          {{ opt.label }}<span class="ml-1 text-xs font-normal text-ink-400">{{ typeCounts.get(opt.key) || 0 }}</span>
          <span v-if="activeType === opt.key" class="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500"></span>
        </button>
      </div>

      <!-- 筛选工具栏 -->
      <div class="flex flex-wrap items-center gap-2 px-5 py-3">
        <!-- 来源（单选） -->
        <div class="relative z-50">
          <button
            class="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[13px] transition"
            :class="filters.venueKind
              ? 'border-brand-300 bg-brand-50 text-brand-600'
              : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'"
            @click.stop="toggleFilterPanel('venue')"
          >
            {{ venueLabel || '来源' }}
            <svg class="h-3.5 w-3.5 transition" :class="openFilter === 'venue' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div
            v-if="openFilter === 'venue'"
            class="absolute left-0 top-full z-50 mt-1.5 w-40 rounded-xl border border-ink-100 bg-white p-1.5 shadow-float"
          >
            <button
              v-for="opt in VENUE_OPTIONS"
              :key="opt.key"
              class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition hover:bg-ink-100/60"
              :class="filters.venueKind === opt.key ? 'text-brand-600' : 'text-ink-700'"
              @click="filters.venueKind = filters.venueKind === opt.key ? '' : opt.key; closeFilterPanel()"
            >
              <span class="flex items-center gap-2">
                <span class="h-1.5 w-1.5 rounded-full" :class="filters.venueKind === opt.key ? 'bg-brand-500' : 'bg-ink-300'"></span>{{ opt.label }}
              </span>
              <span class="text-[11px] text-ink-400">{{ venueCounts[opt.key] }}</span>
            </button>
          </div>
        </div>

        <!-- 价格（多选） -->
        <div class="relative z-50">
          <button
            class="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[13px] transition"
            :class="filters.priceKinds.length
              ? 'border-brand-300 bg-brand-50 text-brand-600'
              : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'"
            @click.stop="toggleFilterPanel('price')"
          >
            价格<span v-if="filters.priceKinds.length" class="text-brand-500"> · {{ filters.priceKinds.length }}</span>
            <svg class="h-3.5 w-3.5 transition" :class="openFilter === 'price' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div
            v-if="openFilter === 'price'"
            class="absolute left-0 top-full z-50 mt-1.5 w-36 rounded-xl border border-ink-100 bg-white p-1.5 shadow-float"
          >
            <button
              v-for="opt in PRICE_OPTIONS"
              :key="opt.key"
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition hover:bg-ink-100/60"
              :class="filters.priceKinds.includes(opt.key) ? 'text-brand-600' : 'text-ink-700'"
              @click="toggle(filters.priceKinds, opt.key)"
            >
              <span class="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition" :class="filters.priceKinds.includes(opt.key) ? 'border-brand-500 bg-brand-500' : 'border-ink-300'">
                <svg v-if="filters.priceKinds.includes(opt.key)" class="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 数据规模（多选） -->
        <div class="relative z-50">
          <button
            class="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[13px] transition"
            :class="filters.scales.length
              ? 'border-brand-300 bg-brand-50 text-brand-600'
              : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'"
            @click.stop="toggleFilterPanel('scale')"
          >
            数据规模<span v-if="filters.scales.length" class="text-brand-500"> · {{ filters.scales.length }}</span>
            <svg class="h-3.5 w-3.5 transition" :class="openFilter === 'scale' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div
            v-if="openFilter === 'scale'"
            class="absolute left-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-ink-100 bg-white p-1.5 shadow-float"
          >
            <button
              v-for="opt in SCALE_OPTIONS"
              :key="opt.key"
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition hover:bg-ink-100/60"
              :class="filters.scales.includes(opt.key) ? 'text-brand-600' : 'text-ink-700'"
              @click="toggle(filters.scales, opt.key)"
            >
              <span class="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition" :class="filters.scales.includes(opt.key) ? 'border-brand-500 bg-brand-500' : 'border-ink-300'">
                <svg v-if="filters.scales.includes(opt.key)" class="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 更新频率（多选） -->
        <div class="relative z-50">
          <button
            class="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[13px] transition"
            :class="filters.freqs.length
              ? 'border-brand-300 bg-brand-50 text-brand-600'
              : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'"
            @click.stop="toggleFilterPanel('freq')"
          >
            更新频率<span v-if="filters.freqs.length" class="text-brand-500"> · {{ filters.freqs.length }}</span>
            <svg class="h-3.5 w-3.5 transition" :class="openFilter === 'freq' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div
            v-if="openFilter === 'freq'"
            class="absolute left-0 top-full z-50 mt-1.5 w-36 rounded-xl border border-ink-100 bg-white p-1.5 shadow-float"
          >
            <button
              v-for="opt in FREQ_OPTIONS"
              :key="opt.key"
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition hover:bg-ink-100/60"
              :class="filters.freqs.includes(opt.key) ? 'text-brand-600' : 'text-ink-700'"
              @click="toggle(filters.freqs, opt.key)"
            >
              <span class="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition" :class="filters.freqs.includes(opt.key) ? 'border-brand-500 bg-brand-500' : 'border-ink-300'">
                <svg v-if="filters.freqs.includes(opt.key)" class="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 供应商（多选） -->
        <div class="relative z-50">
          <button
            class="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[13px] transition"
            :class="filters.providers.length
              ? 'border-brand-300 bg-brand-50 text-brand-600'
              : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600'"
            @click.stop="toggleFilterPanel('provider')"
          >
            供应商<span v-if="filters.providers.length" class="text-brand-500"> · {{ filters.providers.length }}</span>
            <svg class="h-3.5 w-3.5 transition" :class="openFilter === 'provider' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div
            v-if="openFilter === 'provider'"
            class="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-ink-100 bg-white p-1.5 shadow-float"
          >
            <div class="max-h-56 overflow-y-auto">
              <button
                v-for="[name, count] in providerFacets"
                :key="name"
                class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition hover:bg-ink-100/60"
                :class="filters.providers.includes(name) ? 'text-brand-600' : 'text-ink-700'"
                @click="toggle(filters.providers, name)"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="filters.providers.includes(name) ? 'bg-brand-500' : 'bg-ink-300'"></span>
                  <span class="truncate">{{ name }}</span>
                </span>
                <span class="ml-2 shrink-0 text-[11px] text-ink-400">{{ count }}</span>
              </button>
              <div v-if="!providerFacets.length" class="px-2.5 py-1.5 text-xs text-ink-400">暂无可选供应商</div>
            </div>
          </div>
        </div>

        <button
          v-if="activeFilterCount"
          class="inline-flex h-8 items-center rounded-lg px-2 text-[13px] text-ink-500 transition hover:text-danger-500"
          @click="resetFilters"
        >
          <svg class="mr-0.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          重置（{{ activeFilterCount }}）
        </button>

        <span class="flex-1"></span>

        <div class="text-[13px] text-ink-500">
          共 <span class="font-semibold text-ink-900">{{ mixedResults.length }}</span> 条结果
        </div>
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
      </div>

      <!-- 列表 -->
      <div class="px-3 pb-3">
          <div
            v-for="item in pagedResults"
            :key="(item.data as Product | Resource).id"
            class="group flex cursor-pointer items-start gap-4 rounded-xl border border-transparent px-3 py-3.5 transition hover:border-ink-200 hover:bg-ink-100/50"
            @click="handleItemClick(item)"
          >
            <ProductTypeIcon v-if="item.type === 'product'" :type="(item.data as Product).type" :size="42" />
            <span v-else class="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-success-50">
              <svg class="h-5 w-5 text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-5h4v5" /></svg>
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="truncate text-[15px] font-semibold text-ink-900 transition group-hover:text-brand-600">
                  {{ item.type === 'product' ? (item.data as Product).name : (item.data as Resource).resourceName }}
                </div>
                <span
                  v-if="item.type === 'product' && opsChip(item.data as Product)"
                  class="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-600"
                >{{ opsChip(item.data as Product) }}</span>
                <button
                  v-if="item.type === 'product'"
                  class="shrink-0 text-ink-300 transition hover:text-warning-500"
                  :class="(item.data as Product).favorite ? 'text-warning-500 opacity-100' : 'opacity-0 group-hover:opacity-100'"
                  :aria-label="(item.data as Product).favorite ? '取消收藏' : '收藏'"
                  @click="toggleFavorite($event, (item.data as Product).id)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" :fill="(item.data as Product).favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </div>

              <div v-if="item.type === 'product'" class="mt-1 truncate text-[13px] text-ink-500">
                {{ cardSummary(item.data as Product) }}
              </div>
              <div v-else class="mt-1 truncate text-[13px] text-ink-500">
                {{ (item.data as Resource).typeDetail.userView?.dataSourceName }} · {{ (item.data as Resource).typeDetail.userView?.chartType }}
              </div>

              <div v-if="item.type === 'product'" class="mt-1.5 truncate text-xs text-ink-500">
                {{ productMetrics(item.data as Product) }}
              </div>

              <div class="mt-1.5 flex items-center gap-1.5">
                <span
                  v-if="item.type === 'product' && venueChip(item.data as Product)"
                  class="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600"
                >{{ venueChip(item.data as Product) }}</span>
                <span v-else-if="item.type === 'view'" class="rounded-full bg-success-50 px-2 py-0.5 text-[11px] text-success-600">{{ item.label }}</span>
                <span
                  v-if="item.type === 'product' && (item.data as Product).hasTrialApi"
                  class="rounded-full border border-brand-200 px-2 py-0.5 text-[11px] text-brand-600"
                >可试用</span>
                <span
                  v-if="item.type === 'product' && (item.data as Product).hasSampleData"
                  class="rounded-full border border-ink-200 px-2 py-0.5 text-[11px] text-ink-600"
                >有样例</span>
              </div>

              <div
                v-if="item.type === 'product' && query.trim()"
                class="mt-1 truncate text-[11px] text-ink-400"
                data-testid="match-explain"
              >
                {{ matchExplainFor((item.data as Product).id) }}
              </div>
            </div>

            <div class="flex w-32 shrink-0 flex-col items-end justify-center self-stretch text-right">
              <template v-if="item.type === 'product'">
                <div
                  v-if="productPriceSummary(item.data as Product).kind === 'money'"
                  class="text-lg font-bold tabular-nums text-danger-500"
                >
                  <span class="text-xs font-semibold">¥</span>{{ productPriceSummary(item.data as Product).text.replace('¥', '') }}<span class="ml-0.5 text-xs font-normal text-ink-500">{{ productPriceSummary(item.data as Product).suffix }}</span>
                </div>
                <div
                  v-else-if="productPriceSummary(item.data as Product).kind === 'free'"
                  class="text-base font-bold text-brand-500"
                >免费</div>
                <div
                  v-else
                  class="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
                >{{ productPriceSummary(item.data as Product).text }}</div>
                <button class="mt-1.5 text-[13px] font-medium text-brand-600 transition hover:text-brand-700">
                  查看详情 →
                </button>
              </template>
              <template v-else>
                <span class="text-sm font-medium text-brand-600">内部视图</span>
                <button class="mt-1.5 text-[13px] font-medium text-brand-600 transition hover:text-brand-700">打开 →</button>
              </template>
            </div>
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
          v-if="query.trim() && !mixedResults.length"
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
</template>
