<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useAiStore, guideQuestions } from '@/stores/ai'
import { discoverShowcaseProducts } from '@/domain/discoverShowcase'
import { typeMeta } from '@/utils/productMeta'
import type { ProductType } from '@/types/domain'

const router = useRouter()
const catalog = useCatalogStore()
const ai = useAiStore()

const query = ref('')

const activeMode = ref<'ai' | 'keyword'>('keyword')

// 热门问题与 AI 找数首屏统一为同一份场景化问题
const hotQuestions = guideQuestions.map((g) => g.text)
const recentQuestions = computed(() => ai.recentQuestions.slice(0, 3))
const recommended = computed(() => discoverShowcaseProducts(catalog.products))

const types: ProductType[] = ['dataset', 'api', 'report', 'dashboard']

function submit(q?: string) {
  const question = (q ?? query.value).trim()
  if (!question) return
  if (activeMode.value === 'keyword') {
    router.push({ path: '/app/search', query: { q: question, entry: 'keyword' } })
  } else {
    router.push({ path: '/app/ai-find', query: { q: question, entry: 'ai' } })
  }
}

function goType(type: ProductType) {
  router.push({ path: '/app/search', query: { type } })
}

function goSellerMarket() {
  router.push({ path: '/app/search', query: { type: 'dataset', venue: 'seller' } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-6">
    <MobileHeader title="找数" :show-back="false" />

    <!-- 模式切换：关键词搜索 / AI 问答 -->
    <div class="px-4 pt-3">
      <div class="mb-2 flex gap-2">
        <button
          class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
          :class="activeMode === 'keyword' ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeMode = 'keyword'"
        >
          🔍 关键词搜索
        </button>
        <button
          class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
          :class="activeMode === 'ai' ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeMode = 'ai'"
        >
          🤖 AI 问答
        </button>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <div v-if="activeMode === 'ai'" class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-brand-600">
          <span>✨</span><span>用自然语言提问，AI 帮你找数</span>
        </div>
        <div v-else class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
          <span>🔍</span><span>输入关键词，搜索全部商品</span>
        </div>
        <input
          v-if="activeMode === 'keyword'"
          v-model="query"
          type="text"
          placeholder="搜索数据资产名称、关键词…"
          class="w-full text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          @keydown.enter.prevent="submit()"
        />
        <textarea
          v-else
          v-model="query"
          rows="2"
          placeholder="说说你想了解的问题，或描述你需要的数据"
          class="w-full resize-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          @keydown.enter.prevent="submit()"
        />
        <div class="mt-2 flex items-center justify-end">
          <button class="rounded-full bg-brand-500 px-5 py-1.5 text-[13px] font-medium text-white" @click="submit()">发送</button>
        </div>
      </div>
    </div>

    <!-- 热门问题 -->
    <div class="mt-4 px-4">
      <div class="mb-1.5 text-xs font-medium text-slate-400">热门问题</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="q in hotQuestions"
          :key="q"
          class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600"
          @click="submit(q)"
        >
          {{ q }}
        </button>
      </div>
    </div>

    <!-- 最近记录 -->
    <div v-if="recentQuestions.length" class="mt-4 px-4">
      <div class="mb-1.5 text-xs font-medium text-slate-400">最近记录</div>
      <div class="space-y-1.5">
        <button
          v-for="q in recentQuestions"
          :key="q"
          class="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-[13px] text-slate-600"
          @click="submit(q)"
        >
          <span class="truncate">🕘 {{ q }}</span>
          <span class="shrink-0 text-slate-300">›</span>
        </button>
      </div>
    </div>

    <!-- 数据来源样例：固定展示各来源对应的详情页形态 -->
    <div v-if="recommended.length" class="mt-4 px-4">
      <div class="mb-1.5 flex items-center justify-between">
        <div>
          <div class="text-xs font-medium text-slate-400">数据来源样例</div>
          <div class="mt-0.5 text-[11px] text-slate-400">本平台、可信空间与个人数据集等详情形态</div>
        </div>
        <button class="shrink-0 text-[11px] text-brand-600" @click="router.push('/app/search')">全部商品 ›</button>
      </div>
      <div class="space-y-2.5">
        <ProductCard v-for="p in recommended" :key="p.id" :product="p" />
      </div>
    </div>

    <!-- 全部商品频道 -->
    <div class="mt-4 px-4">
      <div class="mb-1.5 text-xs font-medium text-slate-400">全部商品频道</div>
      <div class="grid grid-cols-4 gap-2">
        <button v-for="t in types" :key="t" class="flex flex-col items-center gap-1 rounded-xl bg-white py-2.5 shadow-card" @click="goType(t)">
          <span class="text-lg">{{ typeMeta[t].icon }}</span>
          <span class="text-[11px] text-slate-600">{{ typeMeta[t].label }}</span>
        </button>
      </div>
      <button class="mt-2 flex w-full items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5 text-left" @click="goSellerMarket">
        <div>
          <div class="text-[13px] font-medium text-orange-800">入驻商家数据集</div>
          <div class="mt-0.5 text-[11px] text-orange-700/80">按卖家成交位置查看 · 平台收款开通</div>
        </div>
        <span class="text-orange-600">›</span>
      </button>
    </div>
  </div>
</template>
