<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAiV104Store } from '@/stores/aiV104'
import { IconHistory } from '@arco-design/web-vue/es/icon'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import type { SearchVersionV104, ResultCardV104, SupplyStatus, PrimaryAction } from '@/types/aiChatV104'
import { listActionLabelByKey } from '@/domain/productAccess'

const store = useAiV104Store()
const router = useRouter()
const input = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const analysisExpanded = ref(false)
const versionExpandMap = ref<Record<string, boolean>>({})

// V104 原型入口：每次进入都重置为新会话（两端共用 store 单例，需避免状态泄露）
onMounted(() => {
  store.resetConversation()
  store.startConversation()
})

// 示例问题 —— 覆盖 PRD 样本
const exampleQuestions = [
  { text: '找 2025 年榆林到天津港的煤炭公路运价，按月查看', scene: '样本3·直接搜索' },
  { text: '找煤炭运价和货运路线数据，两项都看华北地区', scene: '样本4·多需求+共享条件' },
  { text: '找煤炭运价和货运路线，其中一个要按港口筛选', scene: '样本5·归属歧义→澄清' },
  { text: '关于青岛公司清算的案例', scene: '样本2·部分匹配' },
  { text: '找青岛胶洲区企业破产清算判决书案卷', scene: '兜底·无匹配→放宽建议' },
]

function handleSend() {
  const text = input.value.trim()
  if (!text || store.isSearching) return
  store.sendQuestion(text)
  input.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSelectExample(text: string) {
  if (store.pendingClarify) return
  store.sendQuestion(text)
}

function handleClarifyOption(option: string) {
  store.answerClarify(option)
}

function handleRelax() {
  store.applyRelaxSuggestion()
}

function handleCollect() {
  store.requestCollection()
}

function handleConfirmCollect() {
  store.confirmAndSubmitCollection()
}

function handleRestore() {
  store.restoreOriginalConditions()
}

function handleRetry() {
  store.retrySearch()
}

function handleReset() {
  store.resetConversation()
  store.startConversation()
}

function toggleVersion(versionId: string) {
  store.toggleVersionExpand(versionId)
}

watch(
  () => store.messages.length,
  async () => {
    await nextTick()
    const el = scrollRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }
)

// ── 模板中用到的 helpers ──
const statusLabel: Record<SupplyStatus, string> = {
  suitable: '合适',
  partial: '部分匹配',
  none: '无合适商品',
}
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
  if (a.disabled || a.key === 'unavailable') return 'bg-slate-100 text-slate-400'
  if (['view', 'free_view', 'item_purchase', 'dataset_purchase', 'member_purchase', 'continue_payment'].includes(a.key)) {
    return 'bg-violet-600 text-white'
  }
  if (['delivery_progress', 'intent_progress', 'listing_progress', 'submit_space_intent', 'request_listing'].includes(a.key)) {
    return 'bg-white border border-violet-300 text-violet-700'
  }
  return 'bg-slate-100 text-slate-700'
}

/** 商品名/查看商品 → 跳详情 */
function goProduct(productId: string) {
  router.push(`/app/product/${productId}`)
}

/** 收藏切换 */
function toggleFav(productId: string, e: MouseEvent) {
  e.stopPropagation()
  store.toggleFavorite(productId)
}

// 商品元数据映射（与 PC 端 PortalAiChatV104 保持一致）
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

function evidenceStatusLabel(s: string): string {
  return { covered: '✓ 覆盖', partial: '△ 部分', gap: '✗ 缺口', pending_verify: '? 待核实' }[s as 'covered'] || s
}
function evidenceStatusClass(s: string): string {
  return {
    covered: 'text-green-600',
    partial: 'text-amber-600',
    gap: 'text-red-500',
    pending_verify: 'text-slate-500',
  }[s as 'covered'] || 'text-slate-500'
}
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50">
    <!-- 顶部导航 -->
    <MobileHeader title="AI 找数 V1.0.4" />

    <!-- 主内容区 -->
    <div ref="scrollRef" class="flex-1 overflow-y-auto pb-24">
      <!-- 欢迎屏：初始状态 + 历史消息为空 -->
      <div v-if="store.messages.length <= 1" class="flex flex-col items-center gap-4 px-6 pt-10 pb-8">
        <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-2xl">🤖</div>
        <div class="text-lg font-semibold text-slate-800">说一下你想找什么数据</div>
        <div class="text-sm text-slate-500 text-center leading-relaxed">
          描述业务场景或具体需求，我帮你匹配平台上的数据商品。<br/>
          支持多需求同时搜索，有歧义时只问你一个关键问题。
        </div>
        <div class="mt-4 w-full space-y-2">
          <div class="text-xs text-slate-400 px-1 mb-1">试试这些：</div>
          <button
            v-for="ex in exampleQuestions"
            :key="ex.text"
            class="w-full text-left px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all"
            @click="handleSelectExample(ex.text)"
          >
            <div class="text-sm text-slate-800">{{ ex.text }}</div>
            <div class="text-[11px] text-slate-400 mt-1">→ {{ ex.scene }}</div>
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-else class="space-y-4 px-4 pt-4">
        <div v-for="msg in store.messages" :key="msg.id" class="flex gap-2" :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
          <!-- 头像 -->
          <div class="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm"
               :class="msg.role === 'user' ? 'bg-violet-500' : 'bg-gradient-to-br from-violet-500 to-blue-500'">
            {{ msg.role === 'user' ? '我' : 'AI' }}
          </div>

          <!-- 消息内容 -->
          <div class="max-w-[82%] space-y-2">
            <!-- 用户消息 -->
            <div v-if="msg.role === 'user'" class="bg-violet-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm">
              {{ msg.text }}
            </div>

            <!-- AI 消息 -->
            <div v-else class="space-y-3">
              <!-- 纯文本 -->
              <div v-if="msg.text" class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 border border-slate-100">
                {{ msg.text }}
              </div>

              <!-- 过程步骤（可折叠） -->
              <div v-if="msg.aiContent?.steps" class="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  <span>过程步骤</span>
                </div>
                <div class="mt-2 space-y-1.5">
                  <div v-for="(step, i) in msg.aiContent.steps" :key="i" class="flex items-center gap-2 text-xs">
                    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                          :class="step.done ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'">
                      {{ step.done ? '✓' : '…' }}
                    </span>
                    <span class="text-slate-600">{{ step.label }}</span>
                    <span v-if="step.detail" class="text-slate-400">{{ step.detail }}</span>
                  </div>
                </div>
              </div>

              <!-- 澄清问题 -->
              <div v-if="msg.aiContent?.clarifyQuestion" class="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div class="text-sm font-medium text-amber-900">需要确认一个问题</div>
                <div class="text-sm text-amber-800 mt-2">{{ msg.aiContent.clarifyQuestion.question }}</div>
                <div class="text-xs text-amber-600 mt-1">{{ msg.aiContent.clarifyQuestion.context }}</div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-for="opt in (msg.aiContent.clarifyQuestion.options || [])"
                    :key="opt"
                    class="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                    @click="handleClarifyOption(opt)"
                  >{{ opt }}</button>
                </div>
              </div>

              <!-- 结果摘要 -->
              <div v-if="msg.aiContent?.resultSummary" class="bg-violet-50 rounded-xl p-3 border border-violet-100">
                <div class="flex items-center gap-2 text-xs">
                  <span class="font-medium text-violet-900">搜索完成</span>
                  <span v-if="msg.aiContent.resultSummary.completenessStatus === 'complete'" class="text-green-600">✓ 检索完整</span>
                  <span v-else-if="msg.aiContent.resultSummary.completenessStatus === 'partial'" class="text-amber-600">⚠ 部分失败</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span v-if="msg.aiContent.resultSummary.suitableCount > 0" class="px-2 py-0.5 bg-green-100 text-green-700 rounded">{{ msg.aiContent.resultSummary.suitableCount }} 合适</span>
                  <span v-if="msg.aiContent.resultSummary.partialCount > 0" class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{{ msg.aiContent.resultSummary.partialCount }} 部分匹配</span>
                  <span v-if="msg.aiContent.resultSummary.noneCount > 0" class="px-2 py-0.5 bg-slate-200 text-slate-700 rounded">{{ msg.aiContent.resultSummary.noneCount }} 无合适</span>
                </div>
              </div>

              <!-- 放宽建议 -->
              <div v-if="msg.aiContent?.relaxSuggestion" class="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div class="text-sm font-medium text-blue-900">💡 放宽建议</div>
                <div class="text-sm text-blue-800 mt-2">
                  <span class="line-through text-blue-400">{{ msg.aiContent.relaxSuggestion.originalCondition }}</span>
                  <span class="mx-2">→</span>
                  <span class="font-medium">{{ msg.aiContent.relaxSuggestion.suggestedCondition }}</span>
                </div>
                <div class="text-xs text-blue-700 mt-2">
                  <span class="text-blue-900 font-medium">原因：</span>{{ msg.aiContent.relaxSuggestion.reason }}
                </div>
                <div class="text-xs text-blue-700 mt-1">
                  <span class="text-blue-900 font-medium">可能影响：</span>{{ msg.aiContent.relaxSuggestion.precisionLoss }}
                </div>
                <div v-if="msg.aiContent.relaxSuggestion.estimatedNewCount !== undefined" class="text-xs text-blue-700 mt-1">
                  <span class="text-blue-900 font-medium">预计新增：</span>{{ msg.aiContent.relaxSuggestion.estimatedNewCount }} 款候选
                </div>
                <div class="mt-3 flex gap-2">
                  <button class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white" @click="handleRelax">好的，放宽重搜</button>
                  <button class="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700" @click="handleCollect">提交采数</button>
                </div>
              </div>

              <!-- 采数按钮 -->
              <div v-if="msg.aiContent?.collectButton && !msg.aiContent?.relaxSuggestion" class="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div class="text-xs text-slate-600">{{ msg.aiContent.collectButton.reason }}</div>
                <button class="mt-2 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white" @click="handleCollect">提交采数需求</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索结果区块（混合布局的核心） -->
      <div v-if="store.currentVersion" class="mt-4 px-4">
        <!-- 搜索中状态 -->
        <div v-if="store.isSearching" class="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3">
          <div class="h-6 w-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
          <span class="text-sm text-slate-600">正在搜索商品，请稍候……</span>
        </div>

        <template v-else-if="store.currentVersion.tasks.length > 0">
          <!-- 放宽标注条（PRD 7.20：标注放宽了哪个限定 + 一键回到原条件） -->
          <div v-if="store.currentVersion.relaxApplied" class="mb-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 flex items-center justify-between gap-2">
            <div class="text-[11px] text-blue-800 flex items-center gap-1">
              <span class="text-blue-500">↻</span>
              {{ store.currentVersion.relaxNote }}
            </div>
            <button class="text-[10px] px-2 py-0.5 rounded bg-white border border-blue-300 text-blue-700 shrink-0 hover:bg-blue-100" @click="handleRestore">回到原条件</button>
          </div>

          <!-- ══ 搜索条件（浅灰工具条，PRD 4.1） ══ -->
          <div class="rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2 mb-2">
            <div class="flex items-center gap-2 mb-1.5">
              <svg class="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              <span class="text-[11px] font-medium text-slate-500">搜索条件</span>
              <span class="rounded bg-slate-200/70 px-1 py-0 text-[9px] text-slate-500">v{{ store.currentVersion.versionNo }}</span>
            </div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(slot, i) in store.currentVersion.sharedConditions" :key="i"
                    class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
                    :class="slot.strength === 'must' ? 'bg-violet-100/70 text-violet-700' : 'bg-white text-slate-600 border border-slate-200'">
                {{ slot.original }}
                <span v-if="slot.strength === 'must'" class="text-[8px] text-violet-500">必须</span>
              </span>
              <span v-if="store.currentVersion.sharedConditions.length === 0" class="text-[10px] text-slate-400">（按各自条件搜索）</span>
            </div>
          </div>

          <!-- ══ 搜索分析折叠面板（逐需求结果，默认折叠） ══ -->
          <div class="mb-2 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50/50">
            <button
              class="flex w-full items-center justify-between px-3 py-1.5 text-left active:bg-slate-100/60"
              @click="analysisExpanded = !analysisExpanded"
            >
              <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
                <svg class="h-3 w-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span class="text-[11px] font-medium text-slate-500 shrink-0">搜索分析</span>
                <span class="text-[10px] text-slate-400 shrink-0">{{ store.currentVersion.tasks.length }} 项需求</span>
                <span v-if="store.currentVersion.tasks.some(t => t.supplyStatus === 'suitable')"
                      class="rounded bg-green-100 px-1 py-0 text-[9px] font-medium text-green-700 shrink-0">✓{{ store.currentVersion.tasks.filter(t => t.supplyStatus === 'suitable').length }}</span>
                <span v-if="store.currentVersion.tasks.some(t => t.supplyStatus === 'partial')"
                      class="rounded bg-amber-100 px-1 py-0 text-[9px] font-medium text-amber-700 shrink-0">△{{ store.currentVersion.tasks.filter(t => t.supplyStatus === 'partial').length }}</span>
                <span v-if="store.currentVersion.tasks.some(t => t.supplyStatus === 'none')"
                      class="rounded bg-slate-200 px-1 py-0 text-[9px] font-medium text-slate-700 shrink-0">✗{{ store.currentVersion.tasks.filter(t => t.supplyStatus === 'none').length }}</span>
              </div>
              <svg class="h-3 w-3 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': analysisExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="analysisExpanded" class="border-t border-slate-200/70 bg-white/70 px-3 py-2">
              <div class="space-y-1.5">
                <div v-for="(task, i) in store.currentVersion.tasks" :key="task.id"
                     class="flex items-start gap-1.5 py-1">
                  <span class="shrink-0 w-4 h-4 rounded bg-violet-100 text-[9px] font-semibold text-violet-700 flex items-center justify-center">{{ i + 1 }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-[12px] text-slate-700 leading-snug">{{ task.standardQuestion }}</div>
                    <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span class="text-[10px] px-1.5 py-0 rounded-full border" :class="statusColor[task.supplyStatus || 'partial']">
                        {{ statusLabel[task.supplyStatus || 'partial'] }}
                      </span>
                      <template v-if="task.bestMatchProductId">
                        <span class="text-[10px] text-slate-400">最佳：</span>
                        <span class="text-[10px] text-violet-600 truncate">{{ task.bestMatchProductId }}</span>
                      </template>
                      <span v-else-if="task.supplyStatus === 'none'" class="text-[10px] text-slate-400">本次未找到</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 全局去重商品卡片列表（PRD 4.4，主视觉） -->
          <div v-if="store.resultCards.length > 0">
            <div class="flex items-center justify-between mb-2 px-0.5">
              <span class="text-[13px] font-semibold text-slate-800">推荐商品 <span class="text-[11px] font-normal text-slate-400">（{{ store.resultCards.length }}）</span></span>
              <span class="text-[10px] text-slate-400">按证据匹配度排序</span>
            </div>
            <div class="space-y-3">
              <div v-for="card in store.resultCards" :key="card.id"
                   class="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:border-violet-200 transition-colors">
                <!-- 商品头部：图标 + 名称（可点） + 收藏 -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-2 flex-1 min-w-0">
                    <span class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100">
                      <svg class="h-4 w-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" /><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" />
                      </svg>
                    </span>
                    <div class="flex-1 min-w-0">
                      <button
                        class="text-[13px] font-semibold text-slate-900 text-left leading-snug hover:text-violet-700 hover:underline underline-offset-2"
                        @click.stop="goProduct(card.productId)"
                      >{{ productMeta(card.productId).name }}</button>
                      <div class="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span class="text-[10px] px-1.5 py-0 rounded bg-slate-100 text-slate-500">{{ productMeta(card.productId).type }}</span>
                        <span v-if="card.isBestMatchOfTaskIds.length > 0"
                              class="text-[10px] px-1.5 py-0 rounded-full bg-violet-100 text-violet-700">
                          ⭐ 最佳匹配{{ card.isBestMatchOfTaskIds.length > 1 ? `×${card.isBestMatchOfTaskIds.length}` : '' }}
                        </span>
                      </div>
                      <div class="mt-1 text-[15px] font-bold tabular-nums text-violet-600 leading-none">{{ productMeta(card.productId).price }}</div>
                    </div>
                  </div>
                  <!-- 收藏星标 -->
                  <button
                    class="shrink-0 p-1 -mr-1 -mt-0.5 rounded"
                    :aria-label="store.isFavorite(card.productId) ? '取消收藏' : '收藏'"
                    @click="toggleFav(card.productId, $event)"
                  >
                    <svg v-if="store.isFavorite(card.productId)" class="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
                    <svg v-else class="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
                  </button>
                </div>

                <!-- 逐需求匹配证据 -->
                <div class="bg-slate-50 rounded-lg p-2 space-y-1.5">
                  <div class="text-[10px] text-slate-500 mb-1">匹配证据</div>
                  <div v-for="(ev, i) in card.evidences" :key="i" class="text-[11px] flex items-start gap-1.5">
                    <span :class="evidenceStatusClass(ev.status)" class="shrink-0">
                      {{ evidenceStatusLabel(ev.status) }}
                    </span>
                    <span class="text-slate-600 leading-relaxed">{{ ev.reason }}</span>
                  </div>
                </div>

                <!-- 数据适用风险 / 待核实 / 缺口 -->
                <template v-if="card.risks.length > 0 || card.pendingVerifications.length > 0 || card.confirmedGaps.length > 0">
                  <div class="space-y-1">
                    <div v-for="(gap, i) in card.confirmedGaps" :key="`g-${i}`" class="text-[11px] text-red-600">
                      ✗ 缺口：{{ gap }}
                    </div>
                    <div v-for="(pend, i) in card.pendingVerifications" :key="`p-${i}`" class="text-[11px] text-slate-500">
                      ? 待核实：{{ pend }}
                    </div>
                    <div v-for="(risk, i) in card.risks" :key="`r-${i}`" class="text-[11px]"
                         :class="risk.level === 'warning' ? 'text-amber-600' : risk.level === 'blocker' ? 'text-red-600' : 'text-blue-600'">
                      ⚠ {{ risk.description }}
                    </div>
                  </div>
                </template>

                <!-- 操作条：查看商品 + 主操作 -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    class="text-[11px] text-slate-500 hover:text-violet-600 transition flex items-center gap-0.5"
                    @click.stop="goProduct(card.productId)"
                  >
                    查看商品
                    <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <button
                    class="text-xs px-3 py-1.5 rounded-lg font-medium"
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

          <!-- 无商品结果时的重试入口 -->
          <div v-else class="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div class="text-sm text-slate-600">本次搜索未找到合适商品</div>
            <div class="mt-3 flex justify-center gap-2">
              <button v-if="!store.pendingClarify" class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700" @click="handleRetry">重试搜索</button>
              <button class="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white" @click="handleCollect">提交采数</button>
            </div>
          </div>
        </template>
      </div>

      <!-- 历史版本折叠区域 -->
      <div v-if="store.conversation && store.conversation.versions.length > 1" class="mt-4 px-4">
        <div class="text-xs text-slate-500 mb-2">历史版本</div>
        <div class="space-y-2">
          <div v-for="v in store.conversation.versions" :key="v.id"
               class="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <button class="w-full px-3 py-2 flex items-center justify-between text-xs"
                    @click="toggleVersion(v.id)">
              <span class="text-slate-600">搜索 v{{ v.versionNo }}</span>
              <span :class="v.isLatest ? 'text-violet-600' : 'text-slate-400'">{{ v.isLatest ? '当前' : v.expanded ? '收起' : '展开' }}</span>
            </button>
            <div v-if="v.expanded" class="px-3 pb-2 text-[11px] text-slate-500 border-t border-slate-100">
              {{ v.tasks.length }} 项任务 · {{ v.resultCards.length }} 款候选
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入区 -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 z-10">
      <div class="max-w-xl mx-auto flex items-end gap-2">
        <div class="flex-1 flex items-end gap-2 bg-slate-50 rounded-2xl px-3 py-2">
          <textarea
            v-model="input"
            rows="1"
            class="flex-1 bg-transparent resize-none text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-24"
            placeholder="描述你要找的数据，如'找 2025 年煤炭运价'"
            :disabled="store.isSearching"
            @keydown="handleKeyDown"
          />
        </div>
        <button
          class="h-9 w-9 rounded-full flex items-center justify-center text-white transition-colors shrink-0"
          :class="store.isSearching ? 'bg-slate-300' : 'bg-violet-600 hover:bg-violet-700'"
          :disabled="store.isSearching"
          @click="handleSend"
        >
          →
        </button>
      </div>
    </div>
  </div>
</template>
