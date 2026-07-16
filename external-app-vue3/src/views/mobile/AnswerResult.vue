<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

function runAsk() {
  const session = ai.ask(question.value, mode.value)
  sessionId.value = session.id
}

onMounted(runAsk)

const session = computed(() => ai.byId(sessionId.value))
const hasAnswer = computed(() => !!session.value?.answerText)
const candidateProducts = computed(() =>
  (session.value?.sources || []).map((s) => (s.productId ? catalog.byId(s.productId) : undefined)).filter(Boolean)
)

const primarySourceProduct = computed(() => {
  const pid = session.value?.unlockedProductId || session.value?.sources[0]?.productId
  return pid ? catalog.byId(pid) : undefined
})

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
    <MobileHeader title="问答案" />

    <div class="px-4 pt-3">
      <div class="rounded-2xl bg-white p-3.5 shadow-card">
        <div class="text-[11px] text-slate-400">你的问题</div>
        <div class="mt-0.5 text-[15px] font-medium text-slate-900">{{ question }}</div>
      </div>
    </div>

    <div v-if="justUnlocked" class="mx-4 mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
      ✅ 已解锁，为你重新生成完整回答
    </div>

    <template v-if="hasAnswer">
      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card">
        <div class="mb-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>🤖 AI 回答</span>
          <span v-if="session?.paywalled" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">部分内容需购买解锁</span>
          <span v-else class="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">已解锁完整回答</span>
        </div>
        <p class="text-[14px] leading-relaxed text-slate-700">{{ session?.answerText }}</p>

        <div v-if="session?.paywalled" class="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <div class="text-[12px] text-slate-400">🔒 精确数值、完整图表与细分维度已锁定</div>
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

    <template v-else>
      <div class="mx-4 mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center">
        <div class="text-3xl">🤔</div>
        <div class="mt-2 text-[13px] font-medium text-slate-600">暂无可靠依据生成结论</div>
        <div class="mt-1 text-[12px] leading-relaxed text-slate-400">未拼凑答案，为你推荐相关商品，或提交需求由运营跟进</div>
      </div>

      <div v-if="candidateProducts.length" class="mx-4 mt-3 space-y-2.5">
        <ProductCard v-for="p in candidateProducts" :key="p!.id" :product="p!" />
      </div>

      <div class="mx-4 mt-3">
        <button
          class="w-full rounded-full border border-brand-500 py-2.5 text-[13px] font-medium text-brand-600"
          @click="router.push({ path: '/app/demand', query: { q: question } })"
        >
          没找到？提交需求
        </button>
      </div>
    </template>

    <div class="mx-4 mt-3">
      <button
        class="w-full rounded-full bg-slate-100 py-2.5 text-[13px] font-medium text-slate-600"
        @click="router.push({ path: '/app/search', query: { q: question } })"
      >
        🔍 切换到"找数据"看更多商品
      </button>
    </div>
  </div>
</template>
