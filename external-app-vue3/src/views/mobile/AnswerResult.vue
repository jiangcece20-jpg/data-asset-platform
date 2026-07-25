<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import { useAiStore } from '@/stores/ai'
import { useCatalogStore } from '@/stores/catalog'

const route = useRoute()
const router = useRouter()
const ai = useAiStore()
const catalog = useCatalogStore()

const question = computed(() => String(route.query.q || ''))
const mode = computed(() => (String(route.query.mode || 'auto') as 'auto' | 'answer' | 'search'))
const sessionId = ref('')

// 顶部搜索框：预填当前问题，可继续改词/追问/换问题
const queryInput = ref('')

function runAsk() {
  const session = ai.ask(question.value, mode.value)
  sessionId.value = session.id
}

// 问题变化即重跑（首次进入 + 顶部再次搜索都走这里）
watch(question, (q) => {
  queryInput.value = q
  runAsk()
}, { immediate: true })

function submitSearch() {
  const q = queryInput.value.trim()
  if (!q || q === question.value) return
  router.push({ path: '/app/answer', query: { q } })
}

const session = computed(() => ai.byId(sessionId.value))
const hasAnswer = computed(() => !!session.value?.answerText)

const primarySourceProduct = computed(() => {
  const pid = session.value?.unlockedProductId || session.value?.sources[0]?.productId
  return pid ? catalog.byId(pid) : undefined
})

// 全文搜索结果（百度式：AI 摘要之下接全文结果列表）
const fullResults = computed(() => (question.value ? catalog.search(question.value) : []))

const canUnlock = computed(() => {
  const p = primarySourceProduct.value
  return p && (p.type === 'report' || p.type === 'dashboard')
})

function goCheckout() {
  const p = primarySourceProduct.value
  if (!p) return
  if (p.type === 'dataset' || p.type === 'api') {
    router.push(`/app/product/${p.id}`)
    return
  }
  if (p.memberIncluded) {
    router.push({ path: '/app/checkout/member', query: { returnQ: question.value, returnMode: mode.value } })
  } else {
    router.push({ path: `/app/checkout/item/${p.id}`, query: { returnQ: question.value, returnMode: mode.value } })
  }
}

const justUnlocked = computed(() => route.query.unlocked === '1')
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="找数结果" />

    <!-- 顶部搜索框：结果页保留，可继续查找/追问 -->
    <div class="sticky top-12 z-10 bg-slate-50 px-4 pt-3 pb-2">
      <div class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-card">
        <span class="text-slate-400">🔍</span>
        <input
          v-model="queryInput"
          placeholder="继续提问或修改关键词"
          class="flex-1 bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          @keydown.enter.prevent="submitSearch"
        />
        <button class="rounded-full bg-brand-500 px-4 py-1.5 text-[13px] font-medium text-white" @click="submitSearch">搜索</button>
      </div>
    </div>

    <div v-if="justUnlocked" class="mx-4 mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
      ✅ 已解锁，为你重新生成完整回答
    </div>

    <!-- ① AI 摘要 -->
    <template v-if="hasAnswer">
      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card">
        <div class="mb-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>🤖 AI 摘要</span>
          <span v-if="session?.paywalled" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">部分内容需购买解锁</span>
          <span v-else class="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">已解锁完整回答</span>
        </div>
        <p class="text-[14px] leading-relaxed text-slate-700">{{ session?.answerText }}</p>

        <div v-if="session?.paywalled" class="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-600">
          <span>✓</span><span>免费已含：趋势方向与公开摘要</span>
        </div>

        <div v-if="session?.paywalled" class="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <div class="text-[12px] font-medium text-slate-500">🔒 需解锁 · 付费数据的精确口径</div>
          <div class="mt-0.5 text-[11px] text-slate-400">精确数值、完整图表、区域 / 车型细分，以及以下追问</div>
          <div v-if="session?.lockedFollowUps?.length" class="mt-2 space-y-1">
            <div v-for="f in session.lockedFollowUps" :key="f" class="flex items-center gap-1.5 text-[12px] text-slate-400">
              <span>🔒</span>
              <span>{{ f }}</span>
            </div>
          </div>
          <button v-if="canUnlock" class="mt-3 w-full rounded-full bg-brand-500 py-2 text-[13px] font-medium text-white" @click="goCheckout">
            {{ primarySourceProduct?.memberIncluded ? '开通会员解锁完整回答' : '购买解锁完整回答' }}
          </button>
          <button v-else-if="primarySourceProduct" class="mt-3 w-full rounded-full bg-brand-500 py-2 text-[13px] font-medium text-white" @click="goCheckout">
            查看商品详情 ›
          </button>
        </div>

        <div class="mt-3 border-t border-slate-50 pt-2.5">
          <div class="mb-1.5 text-[11px] text-slate-400">来源</div>
          <div class="space-y-1">
            <button
              v-for="s in session?.sources"
              :key="s.title"
              class="flex w-full items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-left text-[12px] text-slate-600"
              @click="s.productId && router.push(`/app/product/${s.productId}`)"
            >
              <span>{{ s.locked ? '🔒' : '📄' }} {{ s.title }}</span>
              <span class="text-slate-300">›</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ② 全文搜索结果列表（AI 无结论时不显示提示块，直接给结果） -->
    <div class="mx-4 mt-4">
      <div class="mb-1.5 flex items-center justify-between">
        <div class="text-[11px] font-medium text-slate-400">🔍 全文搜索结果 · 共 {{ fullResults.length }} 个</div>
        <button class="text-[11px] text-brand-600" @click="router.push({ path: '/app/search', query: { q: question } })">高级筛选 ›</button>
      </div>

      <div v-if="fullResults.length" class="space-y-2.5">
        <ProductCard v-for="p in fullResults" :key="p.id" :product="p" />
      </div>

      <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center">
        <div class="text-[13px] font-medium text-slate-600">没有匹配的商品</div>
        <div class="mt-1 text-[12px] text-slate-400">换个关键词试试，或提交需求由运营跟进</div>
        <button
          class="mt-3 w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white"
          @click="router.push({ path: '/app/demand', query: { q: question } })"
        >
          提交需求
        </button>
      </div>
    </div>
  </div>
</template>
