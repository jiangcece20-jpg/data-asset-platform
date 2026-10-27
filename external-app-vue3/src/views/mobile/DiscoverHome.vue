<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProductCard from '@/components/mobile/ProductCard.vue'
import ChatInterface from '@/components/mobile/ChatInterface.vue'
import AiConversationHistory from '@/components/shared/AiConversationHistory.vue'
import { IconHistory, IconPlus } from '@arco-design/web-vue/es/icon'
import { useCatalogStore } from '@/stores/catalog'
import { useAiStore, guideQuestions } from '@/stores/ai'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { discoverShowcaseProducts } from '@/domain/discoverShowcase'
import { commerceOffersOf } from '@/domain/commerceOffers'
import { productListChips } from '@/domain/productListChips'
import { hasExpiredEnterpriseProductEntitlement } from '@/domain/v102Trade'
import { isDiscoverProductUsable } from '@/domain/discoverUsability'
import type { Product, ProductOrigin, ProductType } from '@/types/domain'

const router = useRouter()
const catalog = useCatalogStore()
const ai = useAiStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const historyOpen = ref(false)
watch(() => user.context.currentMemberId, (ownerId) => ai.activateOwner(ownerId), { immediate: true })

const query = ref('')
const activeMode = ref<'ai' | 'keyword'>('keyword')

const recommended = computed(() => discoverShowcaseProducts(catalog.products))

// ---- 类型 Tab 与筛选状态 ----
const typeTabs: Array<{ key: ProductType | ''; label: string }> = [
  { key: '', label: '全部' },
  { key: 'dataset', label: '数据集' },
  { key: 'api', label: 'API' },
  { key: 'report', label: '行业报告' },
  { key: 'dashboard', label: '自有看板' }
]
const activeType = ref<ProductType | ''>('')

type SortKey = 'recommend' | 'latest' | 'priceHigh' | 'priceLow'
const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'recommend', label: '综合' },
  { key: 'latest', label: '最新' },
  { key: 'priceHigh', label: '价格最高' },
  { key: 'priceLow', label: '价格最低' }
]
const sort = ref<SortKey>('recommend')

const originOptions: Array<{ key: ProductOrigin | ''; label: string }> = [
  { key: '', label: '全部' },
  { key: 'app_content', label: '自营产品' },
  { key: 'asset_platform', label: '资产平台' },
  { key: 'trusted_space', label: '可信空间' },
  { key: 'seller_market', label: '入驻商家' }
]
const originFilter = ref<ProductOrigin | ''>('')

const spaceOptions = computed(() => {
  const names: string[] = []
  for (const p of catalog.discoverable) {
    const venue = productListChips(p).venue
    if (venue?.kind === 'space' && !names.includes(venue.name)) names.push(venue.name)
  }
  return names
})
const spaceFilter = ref('')
const usableOnly = ref(false)

const filterOpen = ref(false)
// 抽屉草稿：打开时拷贝，确定后应用
const draft = ref({ sort: sort.value, origin: originFilter.value, space: spaceFilter.value, usable: usableOnly.value })

const activeFilterCount = computed(
  () => (sort.value !== 'recommend' ? 1 : 0) + (originFilter.value ? 1 : 0) + (spaceFilter.value ? 1 : 0) + (usableOnly.value ? 1 : 0)
)

function minPriceOf(p: Product): number {
  const offers = commerceOffersOf(p)
  if (!offers.length) return Number.POSITIVE_INFINITY
  return Math.min(...offers.map((o) => o.price))
}

const filtered = computed(() => {
  let list = catalog.discoverable.filter((p) => {
    if (activeType.value && p.type !== activeType.value) return false
    if (originFilter.value && p.origin !== originFilter.value) return false
    if (spaceFilter.value) {
      const venue = productListChips(p).venue
      if (venue?.kind !== 'space' || venue.name !== spaceFilter.value) return false
    }
    if (usableOnly.value && !isDiscoverProductUsable(p, {
      enterpriseAuthenticated: user.isEnterpriseAuthenticated,
      accessLevel: entitlements.accessLevel(p),
      serviceExpired: hasExpiredEnterpriseProductEntitlement(entitlements.list, p.id, user.context.currentEnterpriseId)
    })) return false
    return true
  })
  if (sort.value === 'latest') {
    list = [...list].sort((a, b) => (b.listedAt || '').localeCompare(a.listedAt || ''))
  } else if (sort.value === 'priceHigh') {
    list = [...list].sort((a, b) => minPriceOf(b) - minPriceOf(a))
  } else if (sort.value === 'priceLow') {
    list = [...list].sort((a, b) => minPriceOf(a) - minPriceOf(b))
  }
  return list
})

// 默认态分组：样例在前 + 全部商品
const showcaseIds = computed(() => new Set(recommended.value.map((p) => p.id)))
const isGrouped = computed(
  () => !activeType.value && !originFilter.value && !spaceFilter.value && !usableOnly.value && sort.value === 'recommend'
)
const showcaseList = computed(() => filtered.value.filter((p) => showcaseIds.value.has(p.id)))
const restList = computed(() => filtered.value.filter((p) => !showcaseIds.value.has(p.id)))

function selectType(key: ProductType | '') {
  activeType.value = key
}

function openFilter() {
  draft.value = { sort: sort.value, origin: originFilter.value, space: spaceFilter.value, usable: usableOnly.value }
  filterOpen.value = true
}
function applyFilter() {
  sort.value = draft.value.sort
  originFilter.value = draft.value.origin
  spaceFilter.value = draft.value.space
  usableOnly.value = draft.value.usable
  filterOpen.value = false
}
function resetFilter() {
  draft.value = { sort: 'recommend', origin: '', space: '', usable: false }
}

function submitKeyword(q?: string) {
  const question = (q ?? query.value).trim()
  if (!question) return
  router.push({ path: '/app/search', query: {
    q: question, entry: 'keyword', usable: usableOnly.value ? '1' : undefined,
    type: activeType.value || undefined, origin: originFilter.value || undefined,
    venue: spaceFilter.value ? `space:${spaceFilter.value}` : undefined, sort: sort.value
  } })
}

const lastQuestion = computed(() => {
  const userMsgs = ai.chatMessages.filter((m) => m.role === 'user')
  const last = userMsgs[userMsgs.length - 1]
  if (!last) return ''
  const text = last.blocks.find((b) => b.type === 'text')
  return text && text.type === 'text' ? text.content : ''
})

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
  ai.startNewConversation()
}

function openAiHistory(id: string) {
  ai.openConversation(id)
  historyOpen.value = false
}

function newAiFromHistory() {
  ai.startNewConversation()
  historyOpen.value = false
}

function handleDowngradeKeyword() {
  activeMode.value = 'keyword'
  if (lastQuestion.value.trim()) {
    query.value = lastQuestion.value.trim()
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-ink-100" data-testid="discover-home">
    <!-- 浅蓝搜索头 -->
    <div class="shrink-0 bg-gradient-to-b from-[#EDF4FF] to-[#F5F8FF] px-4 pb-3 pt-3">
      <div class="flex items-center gap-2">
        <!-- 返回 -->
        <button class="flex h-9 w-7 shrink-0 items-center justify-center text-ink-700" aria-label="返回" @click="router.back()">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <div class="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 shadow-card">
          <svg class="h-4 w-4 shrink-0 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></svg>
          <input
            v-model="query"
            type="text"
            placeholder="搜索商品名称、场景或关键词"
            class="w-full bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            @keydown.enter.prevent="submitKeyword()"
          />
        </div>
        <!-- AI 找数入口（蓝紫机器人，无底色，对齐设计稿） -->
        <button
          data-testid="discover-mode-ai"
          class="flex w-11 shrink-0 flex-col items-center"
          @click="router.push('/app/ai-find')"
        >
          <svg class="h-10 w-10" viewBox="0 0 44 44" fill="none">
            <defs>
              <linearGradient id="aiHelm" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#5AA0FF" />
                <stop offset=".5" stop-color="#3B6FF7" />
                <stop offset="1" stop-color="#7B5CF6" />
              </linearGradient>
            </defs>
            <path d="M22 8V4.5" stroke="#9FB4FF" stroke-width="2" stroke-linecap="round" />
            <circle cx="22" cy="3.6" r="1.7" fill="#9FB4FF" />
            <circle cx="7.5" cy="25" r="4" fill="#3B6FF7" />
            <circle cx="36.5" cy="25" r="4" fill="#7B5CF6" />
            <rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelm)" />
            <ellipse cx="18.5" cy="13.5" rx="6.5" ry="2.6" fill="#FFFFFF" opacity=".28" />
            <rect x="13" y="17.5" width="18" height="11" rx="5.5" fill="#10244D" />
            <rect x="17" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
            <rect x="24" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
          </svg>
          <span class="-mt-0.5 text-[10px] font-medium leading-3 text-[#7B5CF6]">AI找数</span>
        </button>
      </div>

      <!-- 类型 Tab（横滑）+ 筛选（固定右侧） -->
      <div v-if="activeMode === 'keyword'" class="mt-3 flex items-center gap-2">
        <div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            v-for="tab in typeTabs"
            :key="tab.key"
            class="shrink-0 rounded-xl px-4 py-2 text-[15px] transition"
            :class="activeType === tab.key
              ? 'bg-brand-50 font-semibold text-brand-600'
              : 'bg-white text-ink-500'"
            @click="selectType(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <button
          data-testid="discover-filter-button"
          class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white"
          :class="activeFilterCount ? 'font-medium text-brand-600' : 'text-ink-600'"
          aria-label="筛选"
          title="筛选"
          @click="openFilter"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7v5l-4 2v-7z" /></svg>
          <span v-if="activeFilterCount" data-testid="discover-filter-count" class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] text-white">{{ activeFilterCount }}</span>
        </button>
      </div>
    </div>

    <!-- 关键词模式：商品列表 -->
    <div v-if="activeMode === 'keyword'" class="flex-1 overflow-y-auto px-3 pb-6 pt-3" data-testid="discover-keyword-panel">
      <template v-if="filtered.length">
        <!-- 默认态：样例分组 -->
        <template v-if="isGrouped">
          <div class="mb-1.5 flex items-center justify-between px-1">
            <div class="text-[12px] font-medium text-ink-400">数据来源样例</div>
            <span class="text-[11px] text-ink-400">自营产品、可信空间与入驻商家</span>
          </div>
          <div class="space-y-2.5">
            <ProductCard v-for="p in showcaseList" :key="p.id" :product="p" />
          </div>

          <div class="mb-1.5 mt-5 px-1 text-[12px] font-medium text-ink-400">全部商品 · {{ catalog.discoverable.length }}</div>
          <div class="space-y-2.5">
            <ProductCard v-for="p in restList" :key="p.id" :product="p" />
          </div>
        </template>

        <!-- 筛选态：单一列表 -->
        <template v-else>
          <div class="mb-1.5 px-1 text-[12px] text-ink-400">共 {{ filtered.length }} 个商品</div>
          <div class="space-y-2.5">
            <ProductCard v-for="p in filtered" :key="p.id" :product="p" />
          </div>
        </template>
      </template>

      <div v-else class="rounded-2xl border border-dashed border-ink-200 bg-white py-12 text-center">
        <svg class="mx-auto h-9 w-9 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></svg>
        <div class="mt-2 text-[13px] text-ink-500">{{ usableOnly ? '当前企业暂无可直接使用的商品' : '没有符合筛选条件的商品' }}</div>
        <button class="mt-4 rounded-full bg-brand-500 px-6 py-2 text-[13px] font-medium text-white" @click="activeType = ''; originFilter = ''; spaceFilter = ''; usableOnly = false; sort = 'recommend'">清空筛选</button>
      </div>
    </div>

    <!-- AI 模式：对话式界面 -->
    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-1" data-testid="discover-ai-panel">
      <div class="mb-2 flex shrink-0 items-center justify-between px-1 text-sm font-medium text-ink-800">
        <span>AI 问答</span>
        <div class="flex items-center gap-1">
          <button data-testid="discover-ai-history" class="flex h-9 w-9 items-center justify-center rounded-md text-ink-600" aria-label="历史对话" title="历史对话" @click="historyOpen = true"><IconHistory /></button>
          <button data-testid="discover-ai-new" :disabled="ai.chatTyping" class="flex h-9 w-9 items-center justify-center rounded-md text-ink-600 disabled:opacity-50" aria-label="新对话" title="新对话" @click="handleAiReset"><IconPlus /></button>
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-card">
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
          @navigate-product="(id: string) => router.push(`/app/product/${id}`)"
          @downgrade-keyword="handleDowngradeKeyword"
        />
      </div>
    </div>
    <AiConversationHistory :open="historyOpen" :conversations="ai.conversationList" :active-id="ai.activeConversationId" :busy="ai.chatTyping" @close="historyOpen = false" @new="newAiFromHistory" @select="openAiHistory" />

    <!-- 更多筛选抽屉：使用范围/排序/来源/空间 + 重置/确定；类型由顶部快捷入口控制 -->
    <teleport to="body">
      <div v-if="filterOpen" class="fixed inset-0 z-[70] flex items-end justify-center">
        <div class="absolute inset-0 bg-ink-900/40" @click="filterOpen = false"></div>
        <div class="relative w-full max-w-[390px] rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <div class="relative mb-4 text-center text-[16px] font-semibold text-ink-900">
            更多筛选
            <button class="absolute right-0 top-1/2 -translate-y-1/2 text-ink-400" aria-label="关闭" @click="filterOpen = false">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div class="max-h-[60vh] space-y-5 overflow-y-auto">
            <!-- 使用范围 -->
            <div>
              <div class="mb-2 text-[14px] font-semibold text-ink-900">使用范围</div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded-full px-5 py-2 text-[13px] transition"
                  :class="!draft.usable ? 'bg-brand-50 font-medium text-brand-600' : 'bg-ink-100 text-ink-500'"
                  @click="draft.usable = false"
                >全部</button>
                <button
                  data-testid="discover-usable-only"
                  class="rounded-full px-5 py-2 text-[13px] transition"
                  :class="draft.usable ? 'bg-brand-50 font-medium text-brand-600' : 'bg-ink-100 text-ink-500'"
                  @click="draft.usable = true"
                >我可使用</button>
              </div>
            </div>

            <!-- 排序 -->
            <div>
              <div class="mb-2 text-[14px] font-semibold text-ink-900">排序</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in sortOptions"
                  :key="opt.key"
                  class="rounded-full px-5 py-2 text-[13px] transition"
                  :class="draft.sort === opt.key ? 'bg-brand-50 font-medium text-brand-600' : 'bg-ink-100 text-ink-500'"
                  @click="draft.sort = opt.key"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- 来源 -->
            <div>
              <div class="mb-2 text-[14px] font-semibold text-ink-900">来源</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in originOptions"
                  :key="opt.key"
                  class="rounded-full px-5 py-2 text-[13px] transition"
                  :class="draft.origin === opt.key ? 'bg-brand-50 font-medium text-brand-600' : 'bg-ink-100 text-ink-500'"
                  @click="draft.origin = opt.key"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- 空间 -->
            <div v-if="spaceOptions.length">
              <div class="mb-2 text-[14px] font-semibold text-ink-900">空间</div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded-full px-5 py-2 text-[13px] transition"
                  :class="!draft.space ? 'bg-brand-50 font-medium text-brand-600' : 'bg-ink-100 text-ink-500'"
                  @click="draft.space = ''"
                >全部</button>
                <button
                  v-for="name in spaceOptions"
                  :key="name"
                  class="rounded-full px-5 py-2 text-[13px] transition"
                  :class="draft.space === name ? 'bg-brand-50 font-medium text-brand-600' : 'bg-ink-100 text-ink-500'"
                  @click="draft.space = name"
                >{{ name }}</button>
              </div>
            </div>
          </div>

          <div class="mt-5 flex gap-3">
            <button class="h-11 flex-1 rounded-full border border-ink-200 text-[15px] font-medium text-ink-600" @click="resetFilter">重置</button>
            <button data-testid="discover-filter-apply" class="h-11 flex-[2] rounded-full bg-brand-500 text-[15px] font-medium text-white" @click="applyFilter">确定</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
