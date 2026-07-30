<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { typeMeta, originMeta, priceDisplay } from '@/utils/productMeta'
import type { Resource } from '@/types/resource'

const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()

const hotProducts = computed(() =>
  [...catalog.products]
    .filter((p) => p.availability === 'published')
    .sort((a, b) => (catalog.enhancementOf(b.id)?.sortWeight || 50) - (catalog.enhancementOf(a.id)?.sortWeight || 50))
    .slice(0, 3)
)

const internalViews = computed(() => catalog.searchInternalViews(''))

function goSearch() {
  router.push('/portal/search')
}

function goProduct(id: string) {
  router.push(`/portal/product/${id}`)
}

function openExternalView(view: Resource) {
  const url = view.typeDetail.userView?.externalUrl
  if (url) window.open(url, '_blank')
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- 搜索框 -->
    <div class="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-center">
      <h1 class="text-2xl font-bold text-white">找数买数</h1>
      <p class="mt-1 text-sm text-brand-100">搜索数据资产，发现价值</p>
      <div class="mt-4 flex justify-center gap-2">
        <input
          class="w-96 rounded-lg bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none"
          placeholder="搜索数据资产名称、关键词..."
          @keyup.enter="goSearch"
        />
        <button class="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50" @click="goSearch">
          搜索
        </button>
      </div>
      <div class="mt-3 flex justify-center gap-3 text-xs">
        <button class="rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/30" @click="goSearch">🔍 关键词搜索</button>
        <button class="rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/30" @click="router.push({ path: '/portal/search', query: { mode: 'ai' } })">🤖 AI问答</button>
        <button class="rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/30" @click="router.push('/portal/demand')">📝 需求提报</button>
      </div>
    </div>

    <!-- 热门数据资产 -->
    <div class="mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-800">🏪 热门数据资产</h2>
        <button class="text-sm text-brand-600 hover:underline" @click="goSearch">查看全部 →</button>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="p in hotProducts"
          :key="p.id"
          class="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
          @click="goProduct(p.id)"
        >
          <div class="flex items-center gap-2">
            <span class="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-600">{{ typeMeta[p.type].icon }} {{ typeMeta[p.type].label }}</span>
            <span class="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">🏪市场</span>
          </div>
          <div class="mt-2 text-sm font-semibold text-slate-800">{{ p.name }}</div>
          <div class="mt-1 text-xs text-slate-400">{{ p.subtitle }}</div>
          <div class="mt-2 text-sm font-medium" :class="priceDisplay(p).tone">
            {{ priceDisplay(p).label }}
          </div>
        </div>
      </div>
    </div>

    <!-- 内部视图 -->
    <div v-if="internalViews.length" class="mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-800">🏠 内部视图</h2>
        <button class="text-sm text-brand-600 hover:underline" @click="goSearch">查看全部 →</button>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="view in internalViews.slice(0, 3)"
          :key="view.id"
          class="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 transition hover:shadow-md"
          @click="openExternalView(view)"
        >
          <div class="flex items-center gap-2">
            <span class="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">🏠内部</span>
          </div>
          <div class="mt-2 text-sm font-semibold text-slate-800">{{ view.resourceName }}</div>
          <div class="mt-1 text-xs text-slate-400">{{ view.typeDetail.userView?.dataSourceName }} · {{ view.typeDetail.userView?.chartType }}</div>
          <div class="mt-2 text-xs text-emerald-600">跳转 →</div>
        </div>
      </div>
    </div>

    <!-- 推荐套餐 -->
    <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold text-amber-800">💡 推荐套餐</div>
          <div class="mt-1 text-xs text-amber-600">开通会员，畅享全部会员免费数据资产</div>
        </div>
        <button class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">查看详情 →</button>
      </div>
    </div>
  </div>
</template>
