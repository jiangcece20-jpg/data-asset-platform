<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
import ProductSearchFilters from '@/components/shared/ProductSearchFilters.vue'
import { useCatalogStore } from '@/stores/catalog'
import {
  ROUTE_META,
  buildRetrievalHits,
  explainProductMatch,
  formatMatchExplain
} from '@/domain/discoverRouting'
import { typeMeta } from '@/utils/productMeta'
import type { ProductOrigin, ProductType } from '@/types/domain'
import type { Resource } from '@/types/resource'
import { productVenueFilters } from '@/domain/productListChips'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const query = ref(String(route.query.q || ''))
const activeType = ref<ProductType | ''>((route.query.type as ProductType) || '')
const activeVenue = ref(String(route.query.venue || ''))
const activeOrigin = ref<ProductOrigin | ''>((route.query.origin as ProductOrigin) || '')

watch(
  () => route.query.q,
  (q) => (query.value = String(q || ''))
)
watch(
  () => route.query.type,
  (t) => (activeType.value = (t as ProductType) || '')
)
watch(
  () => route.query.venue,
  (value) => (activeVenue.value = String(value || ''))
)
watch(
  () => route.query.origin,
  (o) => (activeOrigin.value = (o as ProductOrigin) || '')
)
watch(activeVenue, () => {
  if (activeVenue.value) activeOrigin.value = ''
})

const venueLabel = computed(() =>
  productVenueFilters(catalog.discoverable).find((item) => item.key === activeVenue.value)?.label
)

const results = computed(() =>
  catalog.search(query.value, {
    type: activeType.value || undefined,
    origin: activeOrigin.value || undefined,
    venue: activeVenue.value || undefined
  })
)

const rankedHits = computed(() => buildRetrievalHits(results.value, query.value))

function matchExplainFor(productId: string) {
  const product = catalog.byId(productId)
  if (!product) return ''
  const hit = rankedHits.value.find((item) => item.id === productId)
  if (hit) return formatMatchExplain(hit)
  return formatMatchExplain(explainProductMatch(product, query.value))
}

const internalViews = computed(() => catalog.searchInternalViews(query.value))

const hasInternalViews = computed(() => internalViews.value.length > 0)

function openExternalView(view: Resource) {
  const url = view.typeDetail.userView?.externalUrl
  if (url) {
    window.open(url, '_blank')
  } else {
    alert('该视图暂无跳转链接')
  }
}

function matchReason(): string {
  const parts: string[] = []
  if (query.value) parts.push(`关键词“${query.value}”`)
  if (activeType.value) parts.push(typeMeta[activeType.value].label)
  if (venueLabel.value) parts.push(venueLabel.value)
  else if (activeOrigin.value === 'seller_market') parts.push('入驻商家')
  return parts.length ? parts.join(' · ') : '综合排序'
}

function goAiAnswer(from: 'keyword_empty' | 'manual' = 'manual') {
  const q = query.value.trim()
  if (!q) return
  router.push({ path: '/app/answer', query: { q, entry: 'ai', from } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="找数据结果" />

    <div class="px-4 pt-3">
      <div class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
        <span class="text-slate-400">🔍</span>
        <input v-model="query" placeholder="搜索商品名称、场景或关键词" class="flex-1 text-[13px] focus:outline-none" />
      </div>
      <div
        class="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
        data-testid="route-badge"
      >
        <span>{{ ROUTE_META.known_lookup.shortLabel }}</span>
        <span>{{ ROUTE_META.known_lookup.label }}</span>
      </div>
    </div>

    <div class="mt-3 px-4">
      <ProductSearchFilters v-model:type="activeType" v-model:venue="activeVenue" />
    </div>

    <div class="mt-3 px-4 text-[11px] text-slate-400">
      共 {{ results.length }} 个结果 · 匹配原因：{{ matchReason() }}
      <span v-if="results.length > 0 && results.length < 10"> · 已展示全部</span>
    </div>

    <div v-if="results.length" class="mt-2 space-y-2.5 px-4">
      <div v-for="p in results" :key="p.id">
        <ProductCard :product="p" />
        <div
          v-if="query.trim()"
          class="-mt-1.5 mb-1 pl-1 text-[10px] text-slate-400"
          data-testid="match-explain"
        >
          {{ matchExplainFor(p.id) }}
        </div>
      </div>
    </div>

    <div v-if="hasInternalViews" class="mt-4 px-4">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-xs font-medium text-slate-500">🏠 内部视图</span>
        <span class="text-xs text-slate-400">{{ internalViews.length }} 条</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="view in internalViews"
          :key="view.id"
          class="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div class="flex items-center justify-between" @click="openExternalView(view)">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-slate-800">{{ view.resourceName }}</span>
                <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">🏠内部</span>
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ view.typeDetail.userView?.dataSourceName }} · {{ view.typeDetail.userView?.chartType }}
              </div>
              <div class="mt-0.5 text-xs text-slate-400">
                更新于 {{ view.updatedAt }}
              </div>
            </div>
            <span class="text-slate-300">›</span>
          </div>
          <button
            class="mt-2 w-full rounded-lg border border-orange-200 bg-orange-50 py-1.5 text-[11px] font-medium text-orange-700"
            @click.stop="router.push({ path: '/app/mine', query: { menu: 'seller', sellerTab: 'listing' } })"
          >
            申请上架到 APP（入驻商家）
          </button>
        </div>
      </div>
    </div>

    <EmptyState v-if="!results.length" icon="🔍" title="没有找到匹配的商品" desc="换个关键词试试，或用 AI 问答做汇总与对比">
      <button
        class="w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white"
        data-testid="upgrade-ai-cta"
        @click="goAiAnswer('keyword_empty')"
      >
        没有命中？试试 AI 问答
      </button>
      <button
        class="mt-2 w-full rounded-full border border-slate-200 bg-white py-2.5 text-[13px] font-medium text-slate-600"
        @click="router.push({ path: '/app/demand', query: { q: query, type: activeType } })"
      >
        提交需求
      </button>
    </EmptyState>
  </div>
</template>
