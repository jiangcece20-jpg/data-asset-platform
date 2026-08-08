<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta, dealChannelMeta, originMeta } from '@/utils/productMeta'
import type { ProductType, DealChannel, ProductOrigin } from '@/types/domain'
import type { Resource } from '@/types/resource'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const query = ref(String(route.query.q || ''))
const activeType = ref<ProductType | ''>((route.query.type as ProductType) || '')
const activeChannel = ref<DealChannel | ''>('')
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
  () => route.query.origin,
  (o) => (activeOrigin.value = (o as ProductOrigin) || '')
)

const types: ProductType[] = ['dataset', 'api', 'report', 'dashboard']
const channels: DealChannel[] = ['app_payment', 'space_purchase']
const origins: Array<ProductOrigin | ''> = ['', 'app_content', 'asset_platform', 'trusted_space', 'seller_market']

const results = computed(() =>
  catalog.search(query.value, {
    type: activeType.value || undefined,
    dealChannel: activeChannel.value || undefined,
    origin: activeOrigin.value || undefined
  })
)

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
  if (activeChannel.value) parts.push(dealChannelMeta[activeChannel.value].label)
  if (activeOrigin.value) parts.push(originMeta[activeOrigin.value])
  return parts.length ? parts.join(' · ') : '综合排序'
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
    </div>

    <div class="mt-3 space-y-2 px-4">
      <div class="flex flex-wrap gap-1.5">
        <button
          class="rounded-full px-2.5 py-1 text-[11px]"
          :class="!activeType ? 'bg-brand-500 text-white' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeType = ''"
        >
          全部类型
        </button>
        <button
          v-for="t in types"
          :key="t"
          class="rounded-full px-2.5 py-1 text-[11px]"
          :class="activeType === t ? 'bg-brand-500 text-white' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeType = t"
        >
          {{ typeMeta[t].icon }} {{ typeMeta[t].label }}
        </button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          class="rounded-full px-2.5 py-1 text-[11px]"
          :class="!activeChannel ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeChannel = ''"
        >
          全部归属
        </button>
        <button
          v-for="c in channels"
          :key="c"
          class="rounded-full px-2.5 py-1 text-[11px]"
          :class="activeChannel === c ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeChannel = c"
        >
          {{ dealChannelMeta[c].label }}
        </button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="o in origins"
          :key="o || 'all'"
          class="rounded-full px-2.5 py-1 text-[11px]"
          :class="activeOrigin === o ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeOrigin = o"
        >
          {{ o ? originMeta[o] : '全部来源' }}
        </button>
      </div>
    </div>

    <div class="mt-3 px-4 text-[11px] text-slate-400">共 {{ results.length }} 个结果 · 匹配原因：{{ matchReason() }}</div>

    <div v-if="results.length" class="mt-2 space-y-2.5 px-4">
      <ProductCard v-for="p in results" :key="p.id" :product="p" :match-reason="matchReason()" />
    </div>

    <!-- 内部视图结果 -->
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
            @click.stop="router.push('/app/seller/listing')"
          >
            申请上架到 APP（入驻商家）
          </button>
        </div>
      </div>
    </div>

    <EmptyState v-if="!results.length" icon="🔍" title="没有找到匹配的商品" desc="换个关键词试试，或直接提交需求，运营会为你跟进推荐或定制">
      <button
        class="w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white"
        @click="router.push({ path: '/app/demand', query: { q: query, type: activeType, channel: activeChannel } })"
      >
        提交需求
      </button>
    </EmptyState>
  </div>
</template>
