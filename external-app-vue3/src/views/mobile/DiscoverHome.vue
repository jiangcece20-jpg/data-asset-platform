<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import ChatInterface from '@/components/mobile/ChatInterface.vue'
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

const recommended = computed(() => discoverShowcaseProducts(catalog.products))
const types: ProductType[] = ['dataset', 'api', 'report', 'dashboard']

const lastQuestion = computed(() => {
  const userMsgs = ai.chatMessages.filter((m) => m.role === 'user')
  const last = userMsgs[userMsgs.length - 1]
  if (!last) return ''
  const text = last.blocks.find((b) => b.type === 'text')
  return text && text.type === 'text' ? text.content : ''
})

function submitKeyword(q?: string) {
  const question = (q ?? query.value).trim()
  if (!question) return
  router.push({ path: '/app/search', query: { q: question, entry: 'keyword' } })
}

function handleAiSend(text: string) {
  ai.sendQuestion(text)
  setTimeout(() => ai.flushResponse(), 600)
}

function handleAiFollowUp(text: string) {
  if (text === '提交需求') {
    router.push({ path: '/app/demand', query: { q: lastQuestion.value } })
    return
  }
  handleAiSend(text)
}

function handleAiReset() {
  ai.resetChat()
}

function handleDowngradeKeyword() {
  activeMode.value = 'keyword'
  if (lastQuestion.value.trim()) {
    query.value = lastQuestion.value.trim()
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
  <div class="flex h-full min-h-0 flex-col bg-slate-50" data-testid="discover-home">
    <MobileHeader title="找数" :show-back="false" />

    <!-- 模式切换：关键词搜索 / AI 问答 -->
    <div class="shrink-0 px-4 pt-3">
      <div class="flex gap-2">
        <button
          data-testid="discover-mode-keyword"
          class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
          :class="activeMode === 'keyword' ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeMode = 'keyword'"
        >
          🔍 关键词搜索
        </button>
        <button
          data-testid="discover-mode-ai"
          class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
          :class="activeMode === 'ai' ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-slate-500 border border-slate-200'"
          @click="activeMode = 'ai'"
        >
          🤖 AI 问答
        </button>
      </div>
    </div>

    <!-- 关键词搜索：搜索框 + 频道入口 -->
    <div v-if="activeMode === 'keyword'" class="flex-1 overflow-y-auto pb-6" data-testid="discover-keyword-panel">
      <div class="px-4 pt-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
          <div class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <span>🔍</span><span>输入关键词，搜索全部商品</span>
          </div>
          <input
            v-model="query"
            type="text"
            placeholder="搜索数据资产名称、关键词…"
            class="w-full text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            @keydown.enter.prevent="submitKeyword()"
          />
          <div class="mt-2 flex items-center justify-end">
            <button class="rounded-full bg-brand-500 px-5 py-1.5 text-[13px] font-medium text-white" @click="submitKeyword()">搜索</button>
          </div>
        </div>
      </div>

      <div v-if="recommended.length" class="mt-4 px-4">
        <div class="mb-1.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-medium text-slate-400">数据来源样例</div>
            <div class="mt-0.5 text-[11px] text-slate-400">本平台、资产平台、可信空间与个人数据集等详情形态</div>
          </div>
          <button class="shrink-0 text-[11px] text-brand-600" @click="router.push('/app/search')">全部商品 ›</button>
        </div>
        <div class="space-y-2.5">
          <ProductCard v-for="p in recommended" :key="p.id" :product="p" />
        </div>
      </div>

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

    <!-- AI 问答：对话式界面 -->
    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-3" data-testid="discover-ai-panel">
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <ChatInterface
          embedded
          :messages="ai.chatMessages"
          :guides="guideQuestions"
          :follow-ups="ai.chatFollowUps"
          :typing="ai.chatTyping"
          placeholder="说说你想了解的问题，或描述你需要的数据"
          @send="handleAiSend"
          @select-guide="handleAiSend"
          @select-follow-up="handleAiFollowUp"
          @reset="handleAiReset"
          @navigate-product="(id) => router.push(`/app/product/${id}`)"
          @downgrade-keyword="handleDowngradeKeyword"
        />
      </div>
    </div>
  </div>
</template>
