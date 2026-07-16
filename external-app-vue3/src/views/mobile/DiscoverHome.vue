<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useAiStore } from '@/stores/ai'
import { typeMeta } from '@/utils/productMeta'
import type { ProductType } from '@/types/domain'

const router = useRouter()
const catalog = useCatalogStore()
const ai = useAiStore()

const query = ref('')
const mode = ref<'auto' | 'answer' | 'search'>('auto')

const hotQuestions = ['货运价格趋势如何', '有没有资格核验类的数据产品', '公路物流行业月报']
const recentSessions = computed(() => ai.sessions.slice(-3).reverse())
const recommended = computed(() => catalog.recommendSlotProducts.slice(0, 4))

const types: ProductType[] = ['dataset', 'api', 'report', 'dashboard']

function submit(q?: string) {
  const question = (q ?? query.value).trim()
  if (!question) return
  if (mode.value === 'search') {
    router.push({ path: '/app/search', query: { q: question } })
  } else {
    router.push({ path: '/app/answer', query: { q: question, mode: mode.value } })
  }
}

function goType(type: ProductType) {
  router.push({ path: '/app/search', query: { type } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-6">
    <MobileHeader title="找数" :show-back="false" />

    <div class="px-4 pt-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <textarea
          v-model="query"
          rows="2"
          placeholder="说说你想了解的问题，或描述你需要的数据"
          class="w-full resize-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          @keydown.enter.prevent="submit()"
        />
        <div class="mt-2 flex items-center justify-between">
          <div class="flex gap-1 rounded-full bg-slate-100 p-0.5 text-[12px]">
            <button
              v-for="m in [
                { key: 'auto', label: '智能识别' },
                { key: 'answer', label: '问答案' },
                { key: 'search', label: '找数据' }
              ]"
              :key="m.key"
              class="rounded-full px-2.5 py-1 transition"
              :class="mode === m.key ? 'bg-brand-500 text-white' : 'text-slate-500'"
              @click="mode = m.key as typeof mode"
            >
              {{ m.label }}
            </button>
          </div>
          <button class="rounded-full bg-brand-500 px-4 py-1.5 text-[13px] font-medium text-white" @click="submit()">发送</button>
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
    <div v-if="recentSessions.length" class="mt-4 px-4">
      <div class="mb-1.5 text-xs font-medium text-slate-400">最近记录</div>
      <div class="space-y-1.5">
        <button
          v-for="s in recentSessions"
          :key="s.id"
          class="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-[13px] text-slate-600"
          @click="router.push({ path: '/app/answer', query: { q: s.question, mode: s.mode } })"
        >
          <span class="truncate">🕘 {{ s.question }}</span>
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
