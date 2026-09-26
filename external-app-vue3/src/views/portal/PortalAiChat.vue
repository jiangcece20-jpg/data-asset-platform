<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAiStore, guideScenarios } from '@/stores/ai'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta } from '@/utils/productMeta'
import type { Product } from '@/types/domain'
import { productCardSummary } from '@/domain/productCardSummary'
import { productPriceSummary } from '@/domain/productPriceSummary'
import type { ChatMessage, GuideScenario } from '@/types/aiChat'

const route = useRoute()
const router = useRouter()
const ai = useAiStore()
const catalog = useCatalogStore()

const fromKeywordEmpty = computed(() => route.query.from === 'keyword_empty')
const hasMessages = computed(() => ai.chatMessages.length > 0)

// ---------- 发送 / 引导 ----------
const input = ref('')

function handleSend(text: string) {
  ai.sendQuestion(text)
  setTimeout(() => ai.flushResponse(), 600)
}

function send() {
  const text = input.value.trim()
  if (!text || ai.chatTyping) return
  input.value = ''
  handleSend(text)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function autosize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

function handleSelectFollowUp(text: string) {
  if (text === '提交需求') {
    router.push({ path: '/portal/mine', query: { menu: 'demands', submitDemand: '1' } })
    return
  }
  handleSend(text)
}

function handleReset() {
  ai.resetChat()
  if (route.query.q) {
    router.replace({ path: '/portal/ai-chat', query: { entry: 'ai' } })
  }
}

function handleDowngrade() {
  const lastUser = [...ai.chatMessages].reverse().find((m) => m.role === 'user')
  const textBlock = lastUser?.blocks.find((b) => b.type === 'text')
  const q = textBlock && textBlock.type === 'text' ? textBlock.content : ''
  router.push({
    path: '/portal/search',
    query: q ? { q, entry: 'keyword' } : { entry: 'keyword' }
  })
}

// ---------- 入口引导：URL 带 q 时自动提问 ----------
function bootstrapFromQuery() {
  const q = route.query.q
  if (typeof q !== 'string' || !q.trim()) return
  if (ai.chatMessages.length) return
  handleSend(q.trim())
}

onMounted(bootstrapFromQuery)

watch(
  () => route.query.q,
  (q, prev) => {
    if (typeof q === 'string' && q.trim() && q !== prev && !ai.chatMessages.length) {
      handleSend(q.trim())
    }
  }
)

// ---------- 滚动跟随 ----------
watch(
  () => [ai.chatMessages.length, ai.chatTyping],
  async () => {
    await nextTick()
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }
)

// ---------- 过程步骤折叠 ----------
const expandedSteps = reactive<Record<string, boolean>>({})

function toggleSteps(id: string) {
  expandedSteps[id] = !expandedSteps[id]
}

// ---------- 商品卡 ----------
function getProduct(productId: string): Product | undefined {
  return catalog.byId(productId)
}

function cardLead(p: Product): string {
  if (p.type === 'dataset' || p.type === 'api') return productCardSummary(p).lead
  return p.recommendText || p.subtitle
}

// ---------- 对比卡 ----------
const COMPARE_DIMS = ['类型', '价格', '覆盖范围', '更新频率', '供应商'] as const

function compareProducts(ids: string[]): Product[] {
  return ids.map((id) => catalog.byId(id)).filter((p): p is Product => !!p)
}

function dimValue(p: Product, dim: string): string {
  switch (dim) {
    case '类型': return typeMeta[p.type].label
    case '价格': return productPriceSummary(p).text
    case '覆盖范围': return p.coverage || '—'
    case '更新频率': return p.updateFrequency || '—'
    case '供应商': return p.provider || '—'
    default: return '—'
  }
}

// ---------- 富文本渲染（**加粗** / - 列表 / 段落） ----------
function renderRich(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink-900">$1</strong>')
  return text
    .split(/\n\n+/)
    .map((para) => {
      const lines = para.split('\n')
      if (lines.length && lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')
        return `<ul class="ml-4 list-disc space-y-1 text-ink-600 marker:text-violet-400">${items}</ul>`
      }
      return `<p class="leading-relaxed text-ink-600">${lines.map(inline).join('<br/>')}</p>`
    })
    .join('')
}

// ---------- 来源域名 ----------
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ---------- 复制 / 重新生成 ----------
const copiedId = ref('')

function messagePlainText(msg: ChatMessage): string {
  const parts: string[] = []
  for (const b of msg.blocks) {
    if (b.type === 'text') parts.push(b.content.replace(/\*\*/g, ''))
    else if (b.type === 'table') parts.push([b.columns.join('\t'), ...b.rows.map((r) => r.join('\t'))].join('\n'))
    else if (b.type === 'metric') parts.push(`${b.label} ${b.value}${b.change ? `（${b.period ?? ''}${b.change}）` : ''}`)
    else if (b.type === 'product-card') parts.push(catalog.byId(b.productId)?.name ?? '')
    else if (b.type === 'product-compare') parts.push(`对比：${b.productIds.map((id) => catalog.byId(id)?.name ?? '').join(' vs ')}`)
    else if (b.type === 'external-zone') parts.push(`${b.summary}\n${b.sources.map((s) => `${s.title} ${s.url}`).join('\n')}`)
  }
  return parts.join('\n\n')
}

async function copyAnswer(msg: ChatMessage) {
  try {
    await navigator.clipboard.writeText(messagePlainText(msg))
    copiedId.value = msg.id
    setTimeout(() => {
      if (copiedId.value === msg.id) copiedId.value = ''
    }, 1600)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

const lastAiMessage = computed(() => {
  const list = ai.chatMessages
  const last = list[list.length - 1]
  return last && last.role === 'ai' ? last : null
})

function regenerate() {
  if (ai.chatTyping) return
  if (ai.regenerateLast()) {
    setTimeout(() => ai.flushResponse(), 700)
  }
}

// ---------- 欢迎屏 ----------
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const scenarioIcon: Record<GuideScenario['key'], string> = {
  // 找数据：放大镜
  find: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  // 问行情：上扬折线
  market: 'M3 17l6-6 4 4 8-8M21 7v6h-6',
  // 比商品：双柱对比
  compare: 'M8 20V11M16 20V4M4 20h16'
}

function isLastAi(msg: ChatMessage): boolean {
  return lastAiMessage.value?.id === msg.id
}
</script>

<template>
  <!-- 通体渐变背景：与搜索页同源，往下淡出至灰白 -->
  <div
    class="relative -mx-6 -mt-5 px-6 pb-8 pt-5"
    style="background-image: linear-gradient(180deg, rgba(247,248,250,0) 0%, rgba(247,248,250,0.92) 760px, #F7F8FA 1250px), linear-gradient(135deg, #EAF0FF 0%, #F3F1FF 35%, #FAF3FF 100%);"
  >
    <!-- 页面级装饰层：光斑/网格/轨道环/星点 -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
      <div class="absolute -right-24 -top-36 h-96 w-96 rounded-full bg-violet-400/25 blur-3xl"></div>
      <div class="absolute right-1/3 top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl"></div>
      <div class="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl"></div>
      <div
        class="absolute inset-0 opacity-70"
        style="background-image: linear-gradient(rgba(123,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(123,92,246,0.08) 1px, transparent 1px); background-size: 26px 26px; -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 88%); mask-image: linear-gradient(to bottom, #000 0%, transparent 88%);"
      ></div>
      <div
        class="absolute inset-0 opacity-50"
        style="background-image: radial-gradient(circle, rgba(59,111,247,0.16) 1px, transparent 1px); background-size: 22px 22px; background-position: 11px 11px; -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 80%); mask-image: linear-gradient(to bottom, #000 0%, transparent 80%);"
      ></div>
      <svg class="absolute right-10 top-7 h-36 w-36 text-violet-400/30" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="54" stroke="currentColor" stroke-width="1" />
        <circle cx="60" cy="60" r="6" fill="currentColor" />
      </svg>
      <svg class="ring-spin absolute right-10 top-7 h-36 w-36 text-violet-400/45" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="38" stroke="currentColor" stroke-width="1" stroke-dasharray="3 5" />
        <circle cx="60" cy="22" r="3" fill="currentColor" />
      </svg>
      <svg class="icon-twinkle absolute right-56 top-12 h-3 w-3 text-violet-400" viewBox="0 0 24 24" fill="currentColor" style="animation-delay: 0.9s"><path d="M12 3l2 5.6L20 11l-6 2.4L12 19l-2-5.6L4 11l6-2.4z" /></svg>
      <svg class="icon-twinkle absolute right-16 top-[220px] h-2.5 w-2.5 text-violet-300" viewBox="0 0 24 24" fill="currentColor" style="animation-delay: 1.7s"><path d="M12 3l2 5.6L20 11l-6 2.4L12 19l-2-5.6L4 11l6-2.4z" /></svg>
    </div>

    <div class="relative mx-auto max-w-4xl" data-testid="portal-ai-chat">
      <!-- 头部：机器人 + 标题 + 操作 -->
      <header class="flex items-start justify-between px-2 pb-5 pt-6">
        <div class="flex items-center gap-3.5">
          <div class="relative shrink-0">
            <div class="absolute inset-1 rounded-full bg-violet-400/30 blur-xl"></div>
            <svg class="relative h-14 w-14" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="aiHelmPc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#5AA0FF" />
                  <stop offset=".5" stop-color="#3B6FF7" />
                  <stop offset="1" stop-color="#7B5CF6" />
                </linearGradient>
              </defs>
              <path d="M22 8V4.5" stroke="#9FB4FF" stroke-width="2" stroke-linecap="round" />
              <circle cx="22" cy="3.6" r="1.7" fill="#9FB4FF" />
              <circle cx="7.5" cy="25" r="4" fill="#3B6FF7" />
              <circle cx="36.5" cy="25" r="4" fill="#7B5CF6" />
              <rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelmPc)" />
              <ellipse cx="18.5" cy="13.5" rx="6.5" ry="2.6" fill="#FFFFFF" opacity=".28" />
              <rect x="13" y="17.5" width="18" height="11" rx="5.5" fill="#10244D" />
              <rect x="17" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
              <rect x="24" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-[20px] font-bold text-ink-900">AI 找数助手</h1>
              <span class="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-violet-600 ring-1 ring-violet-100">Beta</span>
            </div>
            <p class="mt-0.5 text-[13px] text-ink-500">找数据 · 问行情 · 比商品，一句话直达答案</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            data-testid="downgrade-keyword"
            class="h-8 rounded-lg border border-ink-200 bg-white/70 px-3 text-[13px] text-ink-600 transition hover:border-violet-200 hover:text-violet-600"
            @click="handleDowngrade"
          >
            关键词搜索
          </button>
          <button
            v-if="hasMessages"
            data-testid="reset-chat"
            class="h-8 rounded-lg px-3 text-[13px] text-ink-500 transition hover:bg-white/70 hover:text-ink-900"
            @click="handleReset"
          >
            清空对话
          </button>
        </div>
      </header>

      <div v-if="fromKeywordEmpty" data-testid="from-keyword-banner" class="mb-4 rounded-lg border border-violet-100 bg-violet-50/80 px-3.5 py-2 text-[12px] text-violet-700">
        关键词未命中，已切换到 AI 问答
      </div>

      <!-- 欢迎屏：三场景卡 -->
      <div v-if="!hasMessages" data-testid="chat-empty" class="px-2 pb-2 pt-4 text-center">
        <h2 class="text-[22px] font-bold text-ink-900">{{ greeting }}，我是 AI 找数助手</h2>
        <p class="mt-1.5 text-[13px] text-ink-500">描述你的业务问题，我来找数据、查行情、比商品</p>

        <div class="mt-8 grid gap-3 text-left sm:grid-cols-3">
          <div
            v-for="sc in guideScenarios"
            :key="sc.key"
            class="group rounded-lg border border-ink-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-card-hover-violet"
          >
            <div class="flex items-center gap-2.5">
              <span class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 shadow-[0_0_10px_rgba(123,92,246,0.18)] transition-shadow group-hover:shadow-[0_0_16px_rgba(123,92,246,0.35)]">
                <svg class="relative z-10 h-[18px] w-[18px] text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path :d="scenarioIcon[sc.key]" />
                </svg>
                <span class="icon-sheen pointer-events-none absolute inset-y-0 left-0 z-20 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"></span>
                <svg class="icon-twinkle absolute right-0.5 top-0.5 z-30 h-2 w-2 text-violet-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2 5.6L20 11l-6 2.4L12 19l-2-5.6L4 11l6-2.4z" /></svg>
              </span>
              <div class="min-w-0">
                <div class="text-[15px] font-semibold text-ink-900">{{ sc.label }}</div>
                <div class="truncate text-[11px] text-ink-400">{{ sc.tagline }}</div>
              </div>
            </div>
            <div class="mt-3 space-y-1.5">
              <button
                v-for="gq in sc.questions"
                :key="gq.text"
                class="block w-full truncate rounded-md border border-ink-200 px-2.5 py-1.5 text-left text-[12px] text-ink-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                @click="handleSend(gq.text)"
              >
                {{ gq.text }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息流 -->
      <div v-else class="space-y-6">
        <div v-for="msg in ai.chatMessages" :key="msg.id">
          <!-- 用户消息：蓝紫渐变气泡 -->
          <div v-if="msg.role === 'user'" :data-testid="msg.role === 'ai' ? 'ai-message' : 'user-message'" class="flex justify-end">
            <div class="max-w-[78%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#3B6FF7] to-[#7B5CF6] px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-[0_2px_10px_rgba(59,111,247,0.25)]">
              {{ msg.blocks.map((b) => (b.type === 'text' ? b.content : '')).join('') }}
            </div>
          </div>

          <!-- AI 消息：头像 + 白卡 -->
          <div v-else :data-testid="msg.role === 'ai' ? 'ai-message' : 'user-message'" class="flex gap-3">
            <div class="relative h-8 w-8 shrink-0">
              <div class="absolute inset-0 rounded-full bg-violet-400/25 blur-md"></div>
              <svg class="relative h-8 w-8" viewBox="0 0 44 44" fill="none">
                <defs>
                  <linearGradient id="aiHelmMsg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#5AA0FF" />
                    <stop offset=".5" stop-color="#3B6FF7" />
                    <stop offset="1" stop-color="#7B5CF6" />
                  </linearGradient>
                </defs>
                <rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelmMsg)" />
                <ellipse cx="18.5" cy="13.5" rx="6.5" ry="2.6" fill="#FFFFFF" opacity=".28" />
                <rect x="13" y="17.5" width="18" height="11" rx="5.5" fill="#10244D" />
                <rect x="17" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
                <rect x="24" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
              </svg>
            </div>

            <div class="min-w-0 flex-1">
              <!-- 过程步骤（完成后可折叠） -->
              <div v-if="msg.steps?.length">
                <button
                  class="inline-flex items-center gap-1.5 rounded-md bg-violet-50/80 px-2 py-1 text-[11px] font-medium text-violet-600 transition hover:bg-violet-100"
                  @click="toggleSteps(msg.id)"
                >
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  已完成 {{ msg.steps.length }} 步 · {{ expandedSteps[msg.id] ? '收起' : '展开' }}
                  <svg class="h-3 w-3 transition" :class="expandedSteps[msg.id] ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <div v-if="expandedSteps[msg.id]" class="mt-2 space-y-1.5 border-l border-violet-200 pl-4">
                  <div v-for="(s, si) in msg.steps" :key="si" class="relative text-[12px] text-ink-600">
                    <span class="absolute -left-[21px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-violet-400"></span>
                    {{ s.label }}<span v-if="s.detail" class="ml-1.5 text-ink-400">{{ s.detail }}</span>
                  </div>
                </div>
              </div>

              <!-- 内容白卡 -->
              <div class="mt-2 space-y-3 rounded-lg border border-ink-200 bg-white p-4 shadow-card">
                <template v-for="(block, i) in msg.blocks" :key="i">
                  <!-- 路由徽章 -->
                  <span
                    v-if="block.type === 'route-badge'"
                    data-testid="route-badge"
                    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    :class="block.route === 'external_exploration' ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-600'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="block.route === 'external_exploration' ? 'bg-amber-400' : 'bg-violet-400'"></span>
                    {{ block.label }}
                  </span>

                  <!-- 正文（轻量 markdown） -->
                  <div v-else-if="block.type === 'text'" class="space-y-1 text-[14px]" v-html="renderRich(block.content)"></div>

                  <!-- 指标卡 -->
                  <div v-else-if="block.type === 'metric'" class="flex flex-wrap gap-2">
                    <div class="inline-flex min-w-[118px] flex-col rounded-lg border border-ink-200 bg-white px-3 py-2">
                      <span class="text-[11px] text-ink-500">{{ block.label }}</span>
                      <span class="mt-0.5 flex items-baseline gap-1.5">
                        <span class="text-[20px] font-bold leading-none tabular-nums text-ink-900">{{ block.value }}</span>
                        <span v-if="block.change" class="text-[12px] font-medium" :class="block.dir === 'up' ? 'text-danger-500' : 'text-success-500'">
                          {{ block.dir === 'up' ? '↑' : '↓' }} {{ block.change }}
                        </span>
                      </span>
                      <span v-if="block.period" class="mt-0.5 text-[10px] text-ink-400">{{ block.period }}</span>
                    </div>
                  </div>

                  <!-- 数据表格 -->
                  <div v-else-if="block.type === 'table'" data-testid="ai-table" class="overflow-hidden rounded-lg border border-ink-200">
                    <div v-if="block.title" class="border-b border-ink-100 bg-ink-100/50 px-3 py-1.5 text-[12px] font-medium text-ink-600">{{ block.title }}</div>
                    <table class="w-full text-[13px]">
                      <thead>
                        <tr class="bg-violet-50/80">
                          <th v-for="c in block.columns" :key="c" class="px-3 py-2 text-left font-medium text-violet-700">{{ c }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, ri) in block.rows" :key="ri" class="border-t border-ink-100">
                          <td v-for="(cell, ci) in row" :key="ci" class="px-3 py-2" :class="ci === 0 ? 'font-medium text-ink-900' : 'tabular-nums text-ink-700'">{{ cell }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- 商品推荐卡（豆腐块同语言） -->
                  <div
                    v-else-if="block.type === 'product-card' && getProduct(block.productId)"
                    class="group flex cursor-pointer items-center gap-3 rounded-lg border border-ink-200 bg-white px-3.5 py-3 transition hover:border-violet-200 hover:shadow-card-hover-violet"
                    @click="router.push(`/portal/product/${block.productId}`)"
                  >
                    <span class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 shadow-[0_0_10px_rgba(123,92,246,0.18)] transition-shadow group-hover:shadow-[0_0_16px_rgba(123,92,246,0.35)]">
                      <svg v-if="getProduct(block.productId)!.type === 'dataset'" class="relative z-10 h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" /><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" /></svg>
                      <svg v-else-if="getProduct(block.productId)!.type === 'api'" class="relative z-10 h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m13 5-2 14" /></svg>
                      <svg v-else-if="getProduct(block.productId)!.type === 'report'" class="relative z-10 h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
                      <svg v-else class="relative z-10 h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16" /><rect x="6" y="11" width="3" height="6" rx="0.5" /><rect x="11" y="7" width="3" height="10" rx="0.5" /><rect x="16" y="13" width="3" height="4" rx="0.5" /></svg>
                      <span class="icon-sheen pointer-events-none absolute inset-y-0 left-0 z-20 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"></span>
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5">
                        <span class="truncate text-[14px] font-semibold text-ink-900 transition group-hover:text-violet-700">{{ getProduct(block.productId)!.name }}</span>
                        <span v-if="block.reason" class="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600">{{ block.reason }}</span>
                      </div>
                      <div class="mt-0.5 truncate text-[12px] text-ink-500">{{ cardLead(getProduct(block.productId)!) }}</div>
                    </div>
                    <div class="shrink-0 text-right">
                      <template v-if="productPriceSummary(getProduct(block.productId)!).kind === 'money'">
                        <div class="text-[17px] font-bold leading-none tabular-nums text-violet-600">
                          <span class="align-top text-[12px]">¥</span>{{ productPriceSummary(getProduct(block.productId)!).text.replace('¥', '') }}
                        </div>
                        <div class="mt-0.5 text-[10px] text-ink-400">{{ productPriceSummary(getProduct(block.productId)!).suffix || '起' }}</div>
                      </template>
                      <div v-else-if="productPriceSummary(getProduct(block.productId)!).kind === 'free'" class="text-[15px] font-bold leading-none text-violet-600">免费</div>
                      <div v-else class="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">{{ productPriceSummary(getProduct(block.productId)!).text }}</div>
                    </div>
                    <svg class="h-4 w-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                  </div>

                  <!-- 商品对比卡 -->
                  <div v-else-if="block.type === 'product-compare' && compareProducts(block.productIds).length === 2" data-testid="ai-compare" class="overflow-hidden rounded-lg border border-ink-200">
                    <div class="grid grid-cols-[88px_1fr_1fr]">
                      <!-- 表头：两个商品 -->
                      <div class="border-b border-ink-100 bg-ink-100/40 px-3 py-2.5 text-[11px] text-ink-400">对比维度</div>
                      <div
                        v-for="p in compareProducts(block.productIds)"
                        :key="p.id"
                        class="cursor-pointer border-b border-l border-ink-100 bg-violet-50/50 px-3 py-2.5 transition hover:bg-violet-50"
                        @click="router.push(`/portal/product/${p.id}`)"
                      >
                        <div class="flex items-center gap-2">
                          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100">
                            <svg v-if="p.type === 'api'" class="h-3.5 w-3.5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m13 5-2 14" /></svg>
                            <svg v-else class="h-3.5 w-3.5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" /></svg>
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block truncate text-[13px] font-semibold text-ink-900 transition hover:text-violet-700">{{ p.name }}</span>
                            <span class="block text-[10px] text-ink-400">{{ typeMeta[p.type].label }} · 点击查看详情</span>
                          </span>
                        </div>
                      </div>
                      <!-- 维度行 -->
                      <template v-for="dim in COMPARE_DIMS" :key="dim">
                        <div class="border-b border-ink-100 bg-ink-100/40 px-3 py-2 text-[12px] text-ink-500 last:border-b-0">{{ dim }}</div>
                        <div v-for="p in compareProducts(block.productIds)" :key="`${dim}-${p.id}`" class="border-b border-l border-ink-100 px-3 py-2 text-[12px] tabular-nums text-ink-700 last:border-b-0">
                          {{ dimValue(p, dim) }}
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- 外网分区：编号来源卡 -->
                  <div v-else-if="block.type === 'external-zone'" data-testid="external-zone" class="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
                    <div class="flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" /></svg>
                      本题结合了平台外公开信息
                    </div>
                    <p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">{{ block.summary }}</p>
                    <div class="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                      <a
                        v-for="(s, si) in block.sources"
                        :key="s.url"
                        :href="s.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="group flex items-center gap-2 rounded-md border border-ink-200 bg-white px-2.5 py-2 transition hover:border-violet-300"
                      >
                        <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-50 text-[11px] font-semibold text-violet-600">{{ si + 1 }}</span>
                        <span class="min-w-0 flex-1">
                          <span class="block truncate text-[12px] font-medium text-ink-800 transition group-hover:text-violet-700">{{ s.title }}</span>
                          <span class="block truncate text-[11px] text-ink-400">{{ domainOf(s.url) }}</span>
                        </span>
                        <svg class="h-3.5 w-3.5 shrink-0 text-ink-300 transition group-hover:text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
                      </a>
                    </div>
                  </div>
                </template>
              </div>

              <!-- 回答操作条 -->
              <div class="mt-1.5 flex items-center gap-3 px-1">
                <button
                  class="inline-flex items-center gap-1 text-[11px] text-ink-400 transition hover:text-violet-600"
                  @click="copyAnswer(msg)"
                >
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  {{ copiedId === msg.id ? '已复制' : '复制' }}
                </button>
                <button
                  v-if="isLastAi(msg) && !ai.chatTyping"
                  class="inline-flex items-center gap-1 text-[11px] text-ink-400 transition hover:text-violet-600"
                  @click="regenerate"
                >
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                  重新生成
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 追问 chips -->
        <div v-if="ai.chatFollowUps.length && !ai.chatTyping" class="flex flex-wrap gap-2 pl-11">
          <button
            v-for="fu in ai.chatFollowUps"
            :key="fu"
            class="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[12px] text-violet-600 transition hover:bg-violet-50"
            @click="handleSelectFollowUp(fu)"
          >
            {{ fu }}
          </button>
        </div>

        <!-- 思考中 -->
        <div v-if="ai.chatTyping" class="flex gap-3">
          <div class="relative h-8 w-8 shrink-0">
            <div class="absolute inset-0 rounded-full bg-violet-400/25 blur-md"></div>
            <svg class="relative h-8 w-8" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="aiHelmTyping" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#5AA0FF" />
                  <stop offset=".5" stop-color="#3B6FF7" />
                  <stop offset="1" stop-color="#7B5CF6" />
                </linearGradient>
              </defs>
              <rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelmTyping)" />
              <ellipse cx="18.5" cy="13.5" rx="6.5" ry="2.6" fill="#FFFFFF" opacity=".28" />
              <rect x="13" y="17.5" width="18" height="11" rx="5.5" fill="#10244D" />
              <rect x="17" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
              <rect x="24" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
            </svg>
          </div>
          <div class="flex w-fit items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-3 shadow-card">
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 0ms" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 150ms" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 300ms" />
            <span class="ml-1 text-[12px] text-ink-400">正在思考…</span>
          </div>
        </div>
      </div>

      <!-- 输入区（吸底） -->
      <div class="sticky bottom-3 z-20 mt-6">
        <div class="rounded-xl border border-ink-200 bg-white p-3 shadow-card transition focus-within:border-violet-300 focus-within:shadow-card-hover-violet">
          <div class="flex items-end gap-2">
            <textarea
              v-model="input"
              rows="1"
              data-testid="portal-ai-input"
              placeholder="说说你想了解的问题，或描述你需要的数据…"
              class="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] text-ink-800 outline-none placeholder:text-ink-400"
              @keydown="handleKeyDown"
              @input="autosize"
            />
            <button
              data-testid="chat-send"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#3B6FF7] to-[#7B5CF6] text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              :disabled="!input.trim() || ai.chatTyping"
              @click="send"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
            </button>
          </div>
        </div>
        <div class="mt-1.5 flex items-center justify-between px-1 text-[11px] text-ink-400">
          <span>内容由 AI 生成，请注意甄别</span>
          <span>Enter 发送 · Shift + Enter 换行</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 图标扫光：斜向高光条周期扫过 */
@keyframes icon-sheen {
  0% { transform: translateX(-140%) skewX(-18deg); }
  55%, 100% { transform: translateX(260%) skewX(-18deg); }
}
.icon-sheen {
  animation: icon-sheen 3.4s ease-in-out infinite;
  will-change: transform;
}
/* 角标星光：呼吸闪烁 */
@keyframes icon-twinkle {
  0%, 100% { opacity: 0.35; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}
.icon-twinkle {
  animation: icon-twinkle 2.4s ease-in-out infinite;
}
/* 轨道环慢转 */
@keyframes ring-spin {
  to { transform: rotate(360deg); }
}
.ring-spin {
  animation: ring-spin 26s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .icon-sheen,
  .icon-twinkle,
  .ring-spin {
    animation: none;
  }
}
</style>
