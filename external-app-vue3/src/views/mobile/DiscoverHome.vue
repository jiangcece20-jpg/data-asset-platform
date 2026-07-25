<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useAiStore, guideQuestions } from '@/stores/ai'
import { typeMeta } from '@/utils/productMeta'
import type { ProductType } from '@/types/domain'

const router = useRouter()
const catalog = useCatalogStore()
const ai = useAiStore()

const query = ref('')

// 热门问题与 AI 找数首屏统一为同一份场景化问题
const hotQuestions = guideQuestions.map((g) => g.text)
const recentQuestions = computed(() => ai.recentQuestions.slice(0, 3))
const recommended = computed(() => catalog.recommendSlotProducts.slice(0, 4))

const types: ProductType[] = ['dataset', 'api', 'report', 'dashboard']

// 统一入口：提问即进入「找数结果」页——顶部 AI 摘要 + 下方全文搜索结果列表
function submit(q?: string) {
  const question = (q ?? query.value).trim()
  if (!question) return
  router.push({ path: '/app/answer', query: { q: question } })
}

function goType(type: ProductType) {
  router.push({ path: '/app/search', query: { type } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-6">
    <MobileHeader title="找数" :show-back="false" />

    <!-- AI 找数：唯一提问入口，发送即进入对话 -->
    <div class="px-4 pt-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <div class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-brand-600">
          <span>✨</span><span>AI 找数 · 用自然语言提问</span>
        </div>
        <textarea
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

    <!-- 推荐内容 -->
    <div v-if="recommended.length" class="mt-4 px-4">
      <div class="mb-1.5 flex items-center justify-between">
        <div class="text-xs font-medium text-slate-400">推荐内容</div>
        <button class="text-[11px] text-brand-600" @click="router.push('/app/search')">全部商品 ›</button>
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
          <span class="text-[11px] text-slate-500">{{ typeMeta[t].label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
