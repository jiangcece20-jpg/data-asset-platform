<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAiV104Store } from '@/stores/aiV104'
import { IconHistory, IconPlus } from '@arco-design/web-vue/es/icon'
import type { PrimaryAction, SupplyStatus } from '@/types/aiChatV104'
import { listActionLabelByKey } from '@/domain/productAccess'

const store = useAiV104Store()
const router = useRouter()
const input = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const analysisExpanded = ref(false)

// V104 原型入口：每次进入都重置为新会话（两端共用 store 单例，需避免状态泄露）
onMounted(() => {
  store.resetConversation()
  store.startConversation()
})

// ── 示例问题（覆盖 PRD 样本） ──
const exampleQuestions = [
  { text: '找 2025 年榆林到天津港的煤炭公路运价，按月查看', scene: '样本3·直接搜索' },
  { text: '找煤炭运价和货运路线数据，两项都看华北地区', scene: '样本4·多需求+共享条件' },
  { text: '找煤炭运价和货运路线，其中一个要按港口筛选', scene: '样本5·归属歧义→澄清' },
  { text: '关于青岛公司清算的案例', scene: '样本2·部分匹配' },
  { text: '找青岛胶洲区企业破产清算判决书案卷', scene: '兜底·无匹配→放宽建议' },
]

// 商品元数据映射（原型阶段从 store 里的 v104ProductMeta 拿）
// 这里简化：把 productId 映射成可读名称
const productNameMap: Record<string, { name: string; type: string; price: string; desc: string }> = {
  'mock-coal-freight-dataset': { name: '煤炭公路运价明细数据集', type: '数据集', price: '¥ 2,800', desc: '煤炭公路运输起讫点、车型、运价月度明细' },
  'mock-coal-freight-report': { name: '煤炭运价与运输市场季报', type: '报告', price: '¥ 980', desc: '煤炭运输市场供需、运价走势、区域对比分析' },
  'mock-coal-freight-api': { name: '煤炭运价查询 API', type: 'API', price: '待报价', desc: '按线路、车型、时间查询煤炭运价接口' },
  'mock-freight-route-dataset': { name: '货运路线与运力分布数据集', type: '数据集', price: '¥ 3,200', desc: '全国货运起讫路线、运力规模、路线明细' },
  'mock-freight-route-api': { name: '货运路线查询 API', type: 'API', price: '待报价', desc: '按起讫点、港口查询货运路线与运力' },
  'mock-enterprise-bankruptcy-report': { name: '企业破产清算司法案例汇编', type: '报告', price: '¥ 1,680', desc: '全国范围内企业破产清算司法案例汇编与要点摘要' },
  'mock-qingdao-enterprise-dataset': { name: '青岛企业状态与司法信息数据集', type: '数据集', price: '¥ 1,200', desc: '青岛地区企业经营状态、司法案件、清算信息' },
  'mock-freight-dataset': { name: '货运价格历史明细数据集', type: '数据集', price: '待报价', desc: '分线路、分车型的货运价格历史明细' },
  'mock-freight-report': { name: '货运价格趋势月报', type: '报告', price: '会员专享', desc: '全国货运价格月度走势与区域对比' },
}

function productMeta(id: string) {
  return productNameMap[id] ?? { name: id, type: '未知', price: '—', desc: '' }
}

// ── 事件处理 ──
function handleSend() {
  const text = input.value.trim()
  if (!text || store.isSearching) return
  store.sendQuestion(text)
  input.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

function autosize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

function handleExample(text: string) {
  if (store.pendingClarify) return
  store.sendQuestion(text)
}

function handleClarify(option: string) { store.answerClarify(option) }
function handleRelax() { store.applyRelaxSuggestion() }
function handleCollect() { store.requestCollection() }
function handleConfirmCollect() { store.confirmAndSubmitCollection() }
function handleRestore() { store.restoreOriginalConditions() }
function handleRetry() { store.retrySearch() }
function handleReset() { store.resetConversation(); store.startConversation() }
function toggleVersion(vid: string) { store.toggleVersionExpand(vid) }

watch(() => store.messages.length, async () => {
  await nextTick()
  const el = scrollRef.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
})

// ── 模板 helpers ──
const statusLabel: Record<SupplyStatus, string> = { suitable: '合适', partial: '部分匹配', none: '无合适' }
const statusColor: Record<SupplyStatus, string> = {
  suitable: 'bg-green-50 text-green-700 border-green-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200',
}
function actionLabel(a: PrimaryAction): string {
  // 优先取覆写文案，否则用 1.0.2 详情页统一文案（提交试用申请/查看订单/继续支付 等）
  return a.label ?? listActionLabelByKey[a.key] ?? '查看详情'
}
function actionClass(a: PrimaryAction): string {
  if (a.disabled || a.key === 'unavailable') return 'bg-slate-100 text-slate-400 cursor-not-allowed'
  // 强转化类主操作：紫渐变实心
  if (['view', 'free_view', 'item_purchase', 'dataset_purchase', 'member_purchase', 'continue_payment'].includes(a.key)) {
    return 'bg-gradient-to-r from-[#3B6FF7] to-[#7B5CF6] text-white'
  }
  // 进度查询/咨询类：紫描边
  if (['delivery_progress', 'intent_progress', 'listing_progress', 'submit_space_intent', 'request_listing'].includes(a.key)) {
    return 'bg-white border border-violet-300 text-violet-700 hover:bg-violet-50'
  }
  return 'bg-slate-100 text-slate-700 hover:bg-slate-200'
}

/** 商品名/查看商品 → 跳详情 */
function goProduct(productId: string) {
  router.push(`/portal/product/${productId}`)
}

/** 收藏切换 */
function toggleFav(productId: string, e: MouseEvent) {
  e.stopPropagation()
  store.toggleFavorite(productId)
}

const hasMessages = computed(() => store.messages.length > 1)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
</script>

<template>
  <!-- 渐变背景 + 装饰层（与 PortalAiChat 同源） -->
  <div
    class="relative -mx-6 -mt-5 px-6 pb-8 pt-5"
    style="background-image: linear-gradient(180deg, rgba(247,248,250,0) 0%, rgba(247,248,250,0.92) 760px, #F7F8FA 1250px), linear-gradient(135deg, #EAF0FF 0%, #F3F1FF 35%, #FAF3FF 100%);"
  >
    <!-- 装饰层 -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
      <div class="absolute -right-24 -top-36 h-96 w-96 rounded-full bg-violet-400/25 blur-3xl"></div>
      <div class="absolute right-1/3 top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl"></div>
      <div class="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl"></div>
      <div class="absolute inset-0 opacity-70" style="background-image: linear-gradient(rgba(123,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(123,92,246,0.08) 1px, transparent 1px); background-size: 26px 26px; -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 88%); mask-image: linear-gradient(to bottom, #000 0%, transparent 88%);"></div>
      <svg class="absolute right-10 top-7 h-36 w-36 text-violet-400/30" viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="54" stroke="currentColor" stroke-width="1"/><circle cx="60" cy="60" r="6" fill="currentColor"/></svg>
      <svg class="ring-spin absolute right-10 top-7 h-36 w-36 text-violet-400/45" viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="38" stroke="currentColor" stroke-width="1" stroke-dasharray="3 5"/><circle cx="60" cy="22" r="3" fill="currentColor"/></svg>
    </div>

    <div class="relative mx-auto max-w-5xl" ref="scrollRef">
      <!-- 头部 -->
      <header class="flex items-start justify-between px-2 pb-5 pt-6">
        <div class="flex items-center gap-3.5">
          <div class="relative shrink-0">
            <div class="absolute inset-1 rounded-full bg-violet-400/30 blur-xl"></div>
            <svg class="relative h-14 w-14" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="aiHelmV104" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#5AA0FF" />
                  <stop offset=".5" stop-color="#3B6FF7" />
                  <stop offset="1" stop-color="#7B5CF6" />
                </linearGradient>
              </defs>
              <path d="M22 8V4.5" stroke="#9FB4FF" stroke-width="2" stroke-linecap="round" />
              <circle cx="22" cy="3.6" r="1.7" fill="#9FB4FF" />
              <circle cx="7.5" cy="25" r="4" fill="#3B6FF7" />
              <circle cx="36.5" cy="25" r="4" fill="#7B5CF6" />
              <rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelmV104)" />
              <ellipse cx="18.5" cy="13.5" rx="6.5" ry="2.6" fill="#FFFFFF" opacity=".28" />
              <rect x="13" y="17.5" width="18" height="11" rx="5.5" fill="#10244D" />
              <rect x="17" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
              <rect x="24" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-[20px] font-bold text-ink-900">AI 找数助手</h1>
              <span class="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-violet-600 ring-1 ring-violet-100">V1.0.4 原型</span>
            </div>
            <p class="mt-0.5 text-[13px] text-ink-500">明确找数场景：整批澄清 → 统一搜索 → 证据优先结果</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button class="flex h-8 w-8 items-center justify-center rounded-md text-ink-600 hover:bg-white/70" title="历史对话"><IconHistory /></button>
          <button
            class="flex h-8 items-center gap-1 rounded-md px-3 text-[13px] text-ink-600 transition hover:bg-white/70"
            @click="handleReset"
          >
            <IconPlus />新对话
          </button>
        </div>
      </header>

      <!-- 欢迎屏 -->
      <div v-if="!hasMessages" class="px-2 pb-2 pt-4 text-center">
        <h2 class="text-[22px] font-bold text-ink-900">{{ greeting }}，我是 AI 找数助手</h2>
        <p class="mt-1.5 text-[13px] text-ink-500">描述你要找的数据，我来拆分需求、澄清歧义、匹配商品并解释推荐理由</p>

        <div class="mt-8 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="ex in exampleQuestions"
            :key="ex.text"
            class="group rounded-lg border border-ink-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-card-hover-violet cursor-pointer"
            @click="handleExample(ex.text)"
          >
            <div class="text-[13px] text-ink-400">{{ ex.scene }}</div>
            <div class="mt-1.5 text-[14px] font-medium text-ink-800 group-hover:text-violet-700 leading-relaxed">{{ ex.text }}</div>
          </div>
        </div>
      </div>

      <!-- 主内容流 -->
      <div v-else class="space-y-5">
        <!-- 消息列表 -->
        <div v-for="msg in store.messages" :key="msg.id">
          <!-- 用户消息 -->
          <div v-if="msg.role === 'user'" class="flex justify-end">
            <div class="max-w-[72%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#3B6FF7] to-[#7B5CF6] px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-[0_2px_10px_rgba(59,111,247,0.25)]">
              {{ msg.text }}
            </div>
          </div>

          <!-- AI 消息 -->
          <div v-else class="flex gap-3">
            <div class="relative h-8 w-8 shrink-0">
              <div class="absolute inset-0 rounded-full bg-violet-400/25 blur-md"></div>
              <svg class="relative h-8 w-8" viewBox="0 0 44 44" fill="none">
                <rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelmV104)" />
                <ellipse cx="18.5" cy="13.5" rx="6.5" ry="2.6" fill="#FFFFFF" opacity=".28" />
                <rect x="13" y="17.5" width="18" height="11" rx="5.5" fill="#10244D" />
                <rect x="17" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
                <rect x="24" y="21" width="3" height="4.6" rx="1.5" fill="#37E0FF" />
              </svg>
            </div>

            <div class="min-w-0 flex-1 space-y-3">
              <!-- 过程步骤 -->
              <div v-if="msg.aiContent?.steps?.length" class="bg-violet-50/60 rounded-lg px-3 py-2 border border-violet-100">
                <div class="flex flex-wrap items-center gap-3">
                  <div v-for="s in msg.aiContent.steps" :key="s.label" class="flex items-center gap-1.5 text-[12px]">
                    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                          :class="s.done ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'">
                      {{ s.done ? '✓' : '…' }}
                    </span>
                    <span :class="s.done ? 'text-ink-600' : 'text-ink-400'">{{ s.label }}</span>
                    <span v-if="s.detail" class="text-ink-400">{{ s.detail }}</span>
                  </div>
                </div>
              </div>

              <!-- 正文 -->
              <div v-if="msg.text" class="rounded-lg border border-ink-200 bg-white p-4 text-[14px] text-ink-700 leading-relaxed shadow-card whitespace-pre-wrap">{{ msg.text }}</div>

              <!-- 澄清问题 -->
              <div v-if="msg.aiContent?.clarifyQuestion" class="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                <div class="text-[13px] font-medium text-amber-900">需要确认一个关键问题</div>
                <div class="mt-2 text-[14px] text-amber-800">{{ msg.aiContent.clarifyQuestion.question }}</div>
                <div class="mt-1 text-[12px] text-amber-600">{{ msg.aiContent.clarifyQuestion.context }}</div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-for="opt in (msg.aiContent.clarifyQuestion.options || [])"
                    :key="opt"
                    class="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[12px] text-amber-800 transition hover:bg-amber-100"
                    @click="handleClarify(opt)"
                  >{{ opt }}</button>
                </div>
              </div>

              <!-- 结果摘要徽章 -->
              <div v-if="msg.aiContent?.resultSummary" class="inline-flex flex-wrap items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-1.5">
                <span class="text-[11px] font-medium text-violet-700">搜索完成</span>
                <span v-if="msg.aiContent.resultSummary.suitableCount > 0" class="rounded bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">✓ {{ msg.aiContent.resultSummary.suitableCount }} 合适</span>
                <span v-if="msg.aiContent.resultSummary.partialCount > 0" class="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">△ {{ msg.aiContent.resultSummary.partialCount }} 部分匹配</span>
                <span v-if="msg.aiContent.resultSummary.noneCount > 0" class="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">✗ {{ msg.aiContent.resultSummary.noneCount }} 无合适</span>
              </div>

              <!-- 放宽建议卡 -->
              <div v-if="msg.aiContent?.relaxSuggestion" class="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
                <div class="flex items-center gap-1.5 text-[13px] font-medium text-blue-900">
                  <span>💡</span> 放宽建议
                </div>
                <div class="mt-2 flex items-center gap-2 text-[14px]">
                  <span class="rounded bg-white px-2 py-0.5 text-[12px] text-slate-500 line-through">{{ msg.aiContent.relaxSuggestion.originalCondition }}</span>
                  <span class="text-blue-500">→</span>
                  <span class="rounded bg-blue-100 px-2 py-0.5 text-[12px] font-medium text-blue-800">{{ msg.aiContent.relaxSuggestion.suggestedCondition }}</span>
                </div>
                <div class="mt-2 text-[12px] text-blue-800 leading-relaxed">
                  <span class="font-medium">原因：</span>{{ msg.aiContent.relaxSuggestion.reason }}
                </div>
                <div class="text-[12px] text-blue-700 leading-relaxed">
                  <span class="font-medium">可能影响：</span>{{ msg.aiContent.relaxSuggestion.precisionLoss }}
                </div>
                <div v-if="msg.aiContent.relaxSuggestion.estimatedNewCount !== undefined" class="text-[12px] text-blue-700">
                  <span class="font-medium">预计新增：</span>{{ msg.aiContent.relaxSuggestion.estimatedNewCount }} 款候选
                </div>
                <div class="mt-3 flex gap-2">
                  <button class="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] text-white hover:bg-blue-700" @click="handleRelax">好的，放宽重搜</button>
                  <button class="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-[12px] text-blue-700 hover:bg-blue-100" @click="handleCollect">提交采数</button>
                </div>
              </div>

              <!-- 采数提示 -->
              <div v-if="msg.aiContent?.collectButton && !msg.aiContent?.relaxSuggestion" class="rounded-lg border border-ink-200 bg-ink-50/50 p-3 flex items-center justify-between gap-3">
                <div class="text-[12px] text-ink-600">{{ msg.aiContent.collectButton.reason }}</div>
                <button class="shrink-0 rounded-md bg-violet-600 px-3 py-1.5 text-[12px] text-white hover:bg-violet-700" @click="handleCollect">提交采数需求</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索中 -->
        <div v-if="store.isSearching" class="flex gap-3">
          <div class="relative h-8 w-8 shrink-0">
            <div class="absolute inset-0 rounded-full bg-violet-400/25 blur-md"></div>
            <svg class="relative h-8 w-8" viewBox="0 0 44 44" fill="none"><rect x="9" y="8" width="26" height="29" rx="12.5" fill="url(#aiHelmV104)"/></svg>
          </div>
          <div class="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-3 shadow-card">
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 0ms" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 150ms" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 300ms" />
            <span class="ml-1 text-[12px] text-ink-400">正在搜索…</span>
          </div>
        </div>

        <!-- ════════════════ 结果展示区（PC 端主视觉） ════════════════ -->
        <div v-if="store.currentVersion && !store.isSearching && store.currentVersion.tasks.length > 0">

          <!-- 放宽标注条 -->
          <div v-if="store.currentVersion.relaxApplied" class="mb-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-2.5 flex items-center justify-between gap-3">
            <div class="text-[12px] text-blue-800 flex items-center gap-1.5">
              <span class="text-blue-500">↻</span>
              <span class="font-medium">已放宽条件：</span>{{ store.currentVersion.relaxNote }}
            </div>
            <button
              v-if="store.currentVersion.originalConditionsSnapshot"
              class="shrink-0 rounded-md border border-blue-300 bg-white px-3 py-1 text-[12px] text-blue-700 transition hover:bg-blue-100"
              @click="handleRestore"
            >回到原条件</button>
          </div>

          <!-- ══ 条件持续展示栏（浅灰底工具条，与商品卡明确分层） ══ -->
          <div class="mb-3 rounded-lg border border-slate-200/70 bg-slate-50/60 px-4 py-2.5">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 shrink-0">
                <svg class="h-3.5 w-3.5 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
                <span class="text-[12px] font-medium text-ink-500">搜索条件</span>
                <span class="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-ink-500">v{{ store.currentVersion.versionNo }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5 items-center">
                <span
                  v-for="(slot, i) in store.currentVersion.sharedConditions"
                  :key="i"
                  class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px]"
                  :class="slot.strength === 'must' ? 'bg-violet-100/70 text-violet-700' : 'bg-white text-ink-600 border border-slate-200'"
                >
                  {{ slot.original }}
                  <span v-if="slot.strength === 'must'" class="text-[9px] font-medium text-violet-500">必须</span>
                </span>
                <span v-if="store.currentVersion.sharedConditions.length === 0" class="text-[11px] text-ink-400">（所有需求按各自条件搜索）</span>
              </div>
            </div>
          </div>

          <!-- ══ 搜索分析折叠面板（逐需求结果，默认折叠） ══ -->
          <div class="mb-3 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50/50">
            <button
              class="flex w-full items-center justify-between px-4 py-2 text-left transition hover:bg-slate-100/60"
              @click="analysisExpanded = !analysisExpanded"
            >
              <div class="flex items-center gap-2">
                <svg class="h-3.5 w-3.5 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span class="text-[12px] font-medium text-ink-500">搜索分析</span>
                <span class="text-[11px] text-ink-400">{{ store.currentVersion.tasks.length }} 项需求</span>
                <template v-if="store.currentVersion.tasks.some(t => t.supplyStatus === 'suitable')">
                  <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">✓ {{ store.currentVersion.tasks.filter(t => t.supplyStatus === 'suitable').length }} 合适</span>
                </template>
                <template v-if="store.currentVersion.tasks.some(t => t.supplyStatus === 'partial')">
                  <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">△ {{ store.currentVersion.tasks.filter(t => t.supplyStatus === 'partial').length }} 部分匹配</span>
                </template>
                <template v-if="store.currentVersion.tasks.some(t => t.supplyStatus === 'none')">
                  <span class="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">✗ {{ store.currentVersion.tasks.filter(t => t.supplyStatus === 'none').length }} 无合适</span>
                </template>
              </div>
              <svg class="h-3.5 w-3.5 text-ink-400 transition-transform" :class="{ 'rotate-180': analysisExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="analysisExpanded" class="border-t border-slate-200/70 bg-white/70 px-4 py-3">
              <div class="space-y-2">
                <div
                  v-for="(task, i) in store.currentVersion.tasks"
                  :key="task.id"
                  class="flex items-start gap-2 py-1.5"
                >
                  <span class="shrink-0 w-5 h-5 rounded bg-violet-100 text-[10px] font-semibold text-violet-700 flex items-center justify-center">{{ i + 1 }}</span>
                  <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span class="text-[13px] text-ink-700 leading-relaxed">{{ task.standardQuestion }}</span>
                    <span class="rounded-full border px-2 py-0.5 text-[11px]" :class="statusColor[task.supplyStatus || 'partial']">
                      {{ statusLabel[task.supplyStatus || 'partial'] }}
                    </span>
                    <template v-if="task.bestMatchProductId">
                      <span class="text-[11px] text-ink-400">最佳：</span>
                      <span class="text-[11px] text-violet-600 font-medium">{{ productMeta(task.bestMatchProductId).name }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ 候选商品（主视觉，全宽） ══ -->
          <div>
            <div class="flex items-center justify-between mb-3 px-1">
              <span class="text-[13px] font-semibold text-ink-800">推荐商品 <span class="text-[12px] font-normal text-ink-400">（{{ store.resultCards.length }}）</span></span>
              <span class="text-[11px] text-ink-400">按证据匹配度排序</span>
            </div>

            <div v-if="store.resultCards.length > 0" class="space-y-3">
              <div
                v-for="card in store.resultCards"
                :key="card.id"
                class="group rounded-lg border border-ink-200 bg-white p-4 shadow-card transition hover:border-violet-200 hover:shadow-card-hover-violet cursor-pointer"
              >
                <!-- 头部：名称 + 最佳匹配徽章 + 价格 + 收藏 -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <span class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 shadow-[0_0_10px_rgba(123,92,246,0.18)] group-hover:shadow-[0_0_16px_rgba(123,92,246,0.35)]">
                      <svg class="relative z-10 h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" /><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" />
                      </svg>
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <button
                          class="text-[15px] font-semibold text-ink-900 transition hover:text-violet-700 hover:underline underline-offset-2 cursor-pointer text-left"
                          @click.stop="goProduct(card.productId)"
                        >{{ productMeta(card.productId).name }}</button>
                        <span class="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">{{ productMeta(card.productId).type }}</span>
                        <span v-if="card.isBestMatchOfTaskIds.length > 0" class="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 border border-violet-200">
                          ⭐ 最佳匹配{{ card.isBestMatchOfTaskIds.length > 1 ? `×${card.isBestMatchOfTaskIds.length}` : '' }}
                        </span>
                      </div>
                      <div class="mt-0.5 text-[12px] text-ink-500 truncate">{{ productMeta(card.productId).desc }}</div>
                    </div>
                  </div>
                  <!-- 右侧：价格 + 收藏星标 -->
                  <div class="shrink-0 flex flex-col items-end gap-1.5">
                    <div class="text-[17px] font-bold leading-none tabular-nums text-violet-600">{{ productMeta(card.productId).price }}</div>
                    <button
                      class="p-1 -mr-1 rounded transition hover:bg-violet-50"
                      :aria-label="store.isFavorite(card.productId) ? '取消收藏' : '收藏'"
                      @click="toggleFav(card.productId, $event)"
                    >
                      <svg v-if="store.isFavorite(card.productId)" class="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
                      <svg v-else class="h-4 w-4 text-ink-300 hover:text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
                    </button>
                  </div>
                </div>

                <!-- 匹配证据 -->
                <div class="mt-3 rounded-md bg-ink-50/70 border border-ink-100 p-3 space-y-1.5">
                  <div class="text-[11px] font-medium text-ink-500 mb-1">匹配证据</div>
                  <div v-for="(ev, i) in card.evidences" :key="i" class="flex items-start gap-2 text-[12px]">
                    <span class="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                          :class="{
                            'bg-green-100 text-green-600': ev.status === 'covered',
                            'bg-amber-100 text-amber-600': ev.status === 'partial',
                            'bg-red-100 text-red-500': ev.status === 'gap',
                            'bg-slate-100 text-slate-500': ev.status === 'pending_verify',
                          }">
                      {{ ev.status === 'covered' ? '✓' : ev.status === 'partial' ? '△' : ev.status === 'gap' ? '✗' : '?' }}
                      </span>
                      <span class="text-ink-600 leading-relaxed">{{ ev.reason }}</span>
                    </div>
                  </div>

                  <!-- 风险 / 待核实 / 缺口 -->
                  <template v-if="card.confirmedGaps.length > 0 || card.pendingVerifications.length > 0 || card.risks.length > 0">
                    <div class="mt-2 space-y-1">
                      <div v-for="(gap, i) in card.confirmedGaps" :key="`g-${i}`" class="text-[12px] text-red-600">✗ 缺口：{{ gap }}</div>
                      <div v-for="(pend, i) in card.pendingVerifications" :key="`p-${i}`" class="text-[12px] text-amber-600">? 待核实：{{ pend }}</div>
                      <div v-for="(risk, i) in card.risks" :key="`r-${i}`" class="text-[12px]"
                           :class="risk.level === 'warning' ? 'text-amber-600' : risk.level === 'blocker' ? 'text-red-600' : 'text-blue-600'">
                        ⚠ {{ risk.description }}
                      </div>
                    </div>
                  </template>

                  <!-- 操作条 -->
                  <div class="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between">
                    <button
                      class="text-[11px] text-ink-500 hover:text-violet-600 transition flex items-center gap-1"
                      @click.stop="goProduct(card.productId)"
                    >
                      查看商品
                      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <div class="flex items-center gap-2">
                      <button
                        class="rounded-md px-4 py-1.5 text-[12px] font-medium transition hover:opacity-90"
                        :class="actionClass(card.primaryAction)"
                        :disabled="card.primaryAction.disabled"
                        @click.stop
                      >
                        {{ actionLabel(card.primaryAction) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 无候选 -->
              <div v-else class="rounded-lg border border-dashed border-ink-300 bg-ink-50/50 p-8 text-center">
                <div class="text-[14px] text-ink-500">本次搜索未找到合适商品</div>
                <div class="mt-3 flex justify-center gap-2">
                  <button class="rounded-md border border-ink-300 bg-white px-4 py-1.5 text-[12px] text-ink-700 hover:bg-ink-100" @click="handleRetry">重试搜索</button>
                  <button class="rounded-md bg-violet-600 px-4 py-1.5 text-[12px] text-white hover:bg-violet-700" @click="handleCollect">提交采数需求</button>
                </div>
              </div>
            </div>

          <!-- 历史版本折叠 -->
          <div v-if="store.conversation && store.conversation.versions.length > 1" class="mt-4 rounded-lg border border-ink-200 bg-white shadow-card overflow-hidden">
            <div class="px-4 py-2.5 text-[12px] font-medium text-ink-500 border-b border-ink-100">历史版本</div>
            <div class="divide-y divide-ink-100">
              <button
                v-for="v in store.conversation.versions"
                :key="v.id"
                class="w-full px-4 py-2 flex items-center justify-between text-[12px] text-ink-600 transition hover:bg-violet-50/50"
                :class="{ 'bg-violet-50/60': v.isLatest }"
                @click="toggleVersion(v.id)"
              >
                <span class="flex items-center gap-2">
                  <span class="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">v{{ v.versionNo }}</span>
                  <span>搜索 · {{ v.tasks.length }} 项需求 · {{ v.resultCards.length }} 款候选</span>
                  <span v-if="v.relaxApplied" class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">已放宽条件</span>
                </span>
                <span class="text-ink-400">{{ v.isLatest ? '当前版本' : (v.expanded ? '收起' : '展开') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="sticky bottom-3 z-20 mt-6">
        <div class="rounded-xl border border-ink-200 bg-white p-3 shadow-card transition focus-within:border-violet-300 focus-within:shadow-card-hover-violet">
          <div class="flex items-end gap-2">
            <textarea
              v-model="input"
              rows="1"
              placeholder="说说你想找什么数据，比如'找 2025 年榆林到天津港的煤炭运价'…"
              class="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] text-ink-800 outline-none placeholder:text-ink-400"
              :disabled="store.isSearching"
              @keydown="handleKeyDown"
              @input="autosize"
            />
            <button
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#3B6FF7] to-[#7B5CF6] text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              :disabled="!input.trim() || store.isSearching"
              @click="handleSend"
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
@keyframes icon-sheen {
  0% { transform: translateX(-140%) skewX(-18deg); }
  55%, 100% { transform: translateX(260%) skewX(-18deg); }
}
.ring-spin { animation: ring-spin 26s linear infinite; }
@keyframes ring-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ring-spin { animation: none; } }
</style>
