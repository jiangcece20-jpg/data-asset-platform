/**
 * AI找数 V1.0.4 Store
 * 基于 PRD：/Users/jiangpangzi/Documents/13、笔记软件/都是精华/产品/AI找数/PRD/V1.0.4-AI找数需求材料/2026-10-21-AI找数V1.0.4-版本需求.md
 *
 * 完整流程：用户提问 → 意图识别 → 多需求拆分 → 整批单问澄清 → 统一搜索 → 逐需求结果展示
 *
 * Mock 场景覆盖 PRD 样本 1-6：
 * 1. 案例型单项："关于青岛胶洲公司破产清算的案例"
 * 2. 案例型单项："关于青岛公司 清算的案例"
 * 3. 单项含角色方向："找 2025 年榆林到天津港的煤炭公路运价，按月查看。"
 * 4. 多需求+共享条件："找煤炭运价和货运路线数据，两项都看华北地区。"
 * 5. 多需求+归属歧义 → 澄清："找煤炭运价和货运路线，其中一个要按港口筛选。"
 * 6. 直接问数值 → 兜底："2025 年榆林到天津港的煤炭公路运价是多少？"
 */

import { defineStore } from 'pinia'
import { genId, now } from '@/utils/id'
import type {
  ConversationV104,
  ChatMessageV104,
  SearchTaskV104,
  SearchVersionV104,
  ResultCardV104,
  ConditionSlot,
  ClarifyQuestionV104,
  IntentV104,
  SupplyStatus,
  ConversationPhaseV104,
  AiMessageContentV104,
  StepItem,
  PrimaryAction,
  MatchEvidence,
  DataRisk,
  RelaxSuggestion,
} from '@/types/aiChatV104'

// ── Mock 辅助 ────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── 搜索条件工厂 ──────────────────────────────────────────
function makeSlot(
  partial: Partial<ConditionSlot> & { type: ConditionSlot['type']; original: string }
): ConditionSlot {
  return {
    strength: 'must',
    scope: 'shared',
    ...partial,
  }
}

function makeTask(originalQuery: string, standardQuestion: string, localConditions: ConditionSlot[]): SearchTaskV104 {
  return {
    id: genId('task'),
    originalQuery,
    standardQuestion,
    localConditions,
  }
}

// ── 商品 Mock 覆盖层（扩展 catalog 商品以适配 V104 需求） ──
// key = 商品 ID → V104 视角下的支持能力描述
interface V104ProductMeta {
  /** 商品 ID */
  id: string
  /** 商品名称 */
  name: string
  /** 商品类型 */
  type: 'dataset' | 'report' | 'api' | 'dashboard'
  /** 价格标签 */
  priceLabel: string
  /** 商品描述 */
  description: string
  /** 该商品支持的业务维度（用于 PRD 4.4 匹配判断） */
  supportedDimensions: string[]
  /** 支持的地区范围 */
  supportedRegions: string[]
  /** 支持的时间范围 */
  supportedTimeRange: string
  /** 支持的拆分粒度 */
  supportedGranularity: string[]
  /** 更新频率 */
  updateFrequency: string
  /** 数据对象（该商品描述什么） */
  dataObjects: string[]
  /** 指标（该商品提供什么指标） */
  metrics: string[]
  /** 是否有现货权益 */
  hasEntitlement: boolean
  /** 是否支持在线购买 */
  forSale: boolean
  /** 需要线下洽谈 */
  needsConsult: boolean
}

/** V104 原型专用商品元数据 — 覆盖 PRD 样本涉及的品类 */
const v104ProductMeta: Record<string, V104ProductMeta> = {
  // ── 煤炭运价相关（样本 3-5） ──
  'mock-coal-freight-dataset': {
    id: 'mock-coal-freight-dataset',
    name: '煤炭公路运价明细数据集',
    type: 'dataset',
    priceLabel: '¥ 2,800',
    description: '煤炭公路运输起讫点、车型、运价月度明细',
    supportedDimensions: ['货类', '起运地', '目的地', '车型'],
    supportedRegions: ['华北', '榆林', '鄂尔多斯', '天津港', '北方港口'],
    supportedTimeRange: '2023-01 ~ 2026-12',
    supportedGranularity: ['月', '日', '线路'],
    updateFrequency: '每月更新',
    dataObjects: ['煤炭', '公路运输', '起讫线路'],
    metrics: ['运价', '运量', '运输成本'],
    hasEntitlement: false,
    forSale: true,
    needsConsult: false,
  },
  'mock-coal-freight-report': {
    id: 'mock-coal-freight-report',
    name: '煤炭运价与运输市场季报',
    type: 'report',
    priceLabel: '¥ 980',
    description: '煤炭运输市场供需、运价走势、区域对比分析报告',
    supportedDimensions: ['货类', '起运地', '目的地'],
    supportedRegions: ['华北', '全国主要煤炭运输通道'],
    supportedTimeRange: '2024Q1 ~ 2026Q4',
    supportedGranularity: ['季度', '月'],
    updateFrequency: '每季度更新',
    dataObjects: ['煤炭', '公路运输', '运输市场'],
    metrics: ['运价指数', '运量', '运力供需比'],
    hasEntitlement: false,
    forSale: true,
    needsConsult: false,
  },
  'mock-coal-freight-api': {
    id: 'mock-coal-freight-api',
    name: '煤炭运价查询 API',
    type: 'api',
    priceLabel: '待报价',
    description: '按线路、车型、时间查询煤炭运价数据接口',
    supportedDimensions: ['起运地', '目的地', '车型'],
    supportedRegions: ['全国主要煤炭运输通道'],
    supportedTimeRange: '2024-01 ~ 至今',
    supportedGranularity: ['日', '线路'],
    updateFrequency: '每日更新',
    dataObjects: ['煤炭', '公路运输起讫线路'],
    metrics: ['运价'],
    hasEntitlement: false,
    forSale: false,
    needsConsult: true,
  },

  // ── 货运路线相关（样本 4-5） ──
  'mock-freight-route-dataset': {
    id: 'mock-freight-route-dataset',
    name: '货运路线与运力分布数据集',
    type: 'dataset',
    priceLabel: '¥ 3,200',
    description: '全国货运起讫路线、运力规模、路线明细',
    supportedDimensions: ['起运地', '目的地', '车型', '港口'],
    supportedRegions: ['华北', '全国'],
    supportedTimeRange: '2024-01 ~ 2026-12',
    supportedGranularity: ['月', '日', '港口'],
    updateFrequency: '每月更新',
    dataObjects: ['货运路线', '运力', '港口'],
    metrics: ['运量', '路线数', '运力规模'],
    hasEntitlement: false,
    forSale: true,
    needsConsult: false,
  },
  'mock-freight-route-api': {
    id: 'mock-freight-route-api',
    name: '货运路线查询 API',
    type: 'api',
    priceLabel: '待报价',
    description: '按起讫点、港口查询货运路线与运力信息',
    supportedDimensions: ['起运地', '目的地', '港口', '车型'],
    supportedRegions: ['全国'],
    supportedTimeRange: '2024-01 ~ 至今',
    supportedGranularity: ['日', '港口'],
    updateFrequency: '每日更新',
    dataObjects: ['货运路线', '港口'],
    metrics: ['运量', '运力'],
    hasEntitlement: false,
    forSale: false,
    needsConsult: true,
  },

  // ── 清算案例相关（样本 1-2）—— 无直接匹配，仅部分匹配 ──
  'mock-enterprise-bankruptcy-report': {
    id: 'mock-enterprise-bankruptcy-report',
    name: '企业破产清算司法案例汇编',
    type: 'report',
    priceLabel: '¥ 1,680',
    description: '全国范围内企业破产清算司法案例汇编与要点摘要',
    supportedDimensions: ['企业', '法院', '清算类型'],
    supportedRegions: ['全国'],
    supportedTimeRange: '2020 ~ 2026',
    supportedGranularity: ['企业', '案例'],
    updateFrequency: '每半年更新',
    dataObjects: ['企业破产', '清算案例', '司法案例'],
    metrics: ['案例数'],
    hasEntitlement: false,
    forSale: true,
    needsConsult: false,
  },
  'mock-qingdao-enterprise-dataset': {
    id: 'mock-qingdao-enterprise-dataset',
    name: '青岛企业状态与司法信息数据集',
    type: 'dataset',
    priceLabel: '¥ 1,200',
    description: '青岛地区企业经营状态、司法案件、清算信息',
    supportedDimensions: ['企业', '状态', '司法案件'],
    supportedRegions: ['青岛'],
    supportedTimeRange: '2021 ~ 至今',
    supportedGranularity: ['企业'],
    updateFrequency: '每周更新',
    dataObjects: ['青岛企业', '司法案件', '经营状态'],
    metrics: ['清算企业数'],
    hasEntitlement: false,
    forSale: true,
    needsConsult: false,
  },

  // ── 现有 catalog 商品（补充元数据） ──
  'mock-freight-dataset': {
    id: 'mock-freight-dataset',
    name: '货运价格历史明细数据集',
    type: 'dataset',
    priceLabel: '待报价',
    description: '分线路、分车型的货运价格历史明细',
    supportedDimensions: ['起运地', '目的地', '车型'],
    supportedRegions: ['全国'],
    supportedTimeRange: '2024-01 ~ 2026-06',
    supportedGranularity: ['日', '线路'],
    updateFrequency: '每日更新',
    dataObjects: ['货运', '公路运输'],
    metrics: ['运价'],
    hasEntitlement: false,
    forSale: false,
    needsConsult: true,
  },
  'mock-freight-report': {
    id: 'mock-freight-report',
    name: '货运价格趋势月报',
    type: 'report',
    priceLabel: '会员专享',
    description: '全国货运价格月度走势与区域对比',
    supportedDimensions: ['区域', '车型'],
    supportedRegions: ['全国'],
    supportedTimeRange: '2024-01 ~ 2026-06',
    supportedGranularity: ['月', '区域'],
    updateFrequency: '每月更新',
    dataObjects: ['货运', '价格趋势'],
    metrics: ['价格指数'],
    hasEntitlement: true,
    forSale: false,
    needsConsult: false,
  },
}

// ── 意图识别 ──────────────────────────────────────────────
function recognizeIntentV104(text: string): IntentV104 {
  const q = text.toLowerCase().trim()
  // 闲聊
  if (/^(你好|hi|hello|嗨|在吗|您好)/.test(q)) return 'chat'
  // 直接问数值或结论（兜底场景 6）
  if (/(是多少|多少钱|几月份|什么时候|多少吨|什么价格|多少钱一吨|指数量)/.test(q)
    && !/(找|搜索|推荐|可以提供|有没有|需要|想要|数据集|api|看板|报告)/.test(q)) {
    return 'direct_answer'
  }
  // 咨询已有商品
  if (/(这个|该|刚才|上一个|上一条).*(包含|有|多少钱|价格|怎么用|使用)/.test(q)) return 'product_consult'
  // 平台 FAQ
  if (/(怎么买|怎么购买|如何购买|价格|售后|退款|会员)/.test(q)) return 'platform_faq'
  // 默认找数
  return 'find_data'
}

// ── Mock 搜索引擎：根据条件槽位匹配商品 ────────────────────
interface ScenarioMatch {
  taskIds: string[]
  productIds: string[]
  /** 全局去重的卡片结果 */
  cards: ResultCardV104[]
  /** 运行状态 */
  runStatus: SearchVersionV104['runStatus']
  /** 放宽建议（无合适商品时） */
  relaxSuggestion?: RelaxSuggestion
  /** 无合适商品且没有可靠放宽建议 — PRD 7.21 */
  noReliableRelax?: boolean
}

function evaluatePrimaryAction(meta: V104ProductMeta): PrimaryAction {
  if (meta.hasEntitlement) return { type: 'use_now' }
  if (meta.forSale) return { type: 'buy_now' }
  if (meta.needsConsult) return { type: 'consult' }
  return { type: 'view_detail' }
}

/**
 * 根据 PRD 样本匹配商品 — 原型阶段直接按 query 内容路由到预设场景
 */
function mockSearchEngine(
  query: string,
  tasks: SearchTaskV104[],
  sharedConditions: ConditionSlot[]
): ScenarioMatch {
  const q = query.toLowerCase()

  // ── 场景 5：归属歧义 → 在 store 中触发澄清，这里不应被调用 ──
  // ── 场景 3：单项含角色方向（煤炭运价 榆林→天津港 按月） ──
  if (/榆林.*天津|天津.*榆林/.test(q) && /煤炭/.test(q) && /运价/.test(q)) {
    const productIds = ['mock-coal-freight-dataset', 'mock-coal-freight-report', 'mock-coal-freight-api']
    const taskId = tasks[0]?.id || genId('task')

    const task1 = tasks.find((t) => t.standardQuestion.includes('煤炭运价'))
      || makeTask('找 2025 年榆林到天津港的煤炭公路运价，按月查看',
        '从平台找 2025 年榆林到天津港的煤炭公路运价数据，按月拆分', [])
    taskId

    // 给 task 分配 bestMatch
    if (task1) task1.bestMatchProductId = 'mock-coal-freight-dataset'
    if (task1) task1.supplyStatus = 'suitable'

    // 构造 3 张卡片
    const cards: ResultCardV104[] = productIds.map((pid, idx) => {
      const meta = v104ProductMeta[pid]
      if (!meta) return null as unknown as ResultCardV104

      let evidenceStatus: MatchEvidence['status'] = 'covered'
      let evidenceReason = '数据对象、指标和时间范围全部匹配'
      let risks: DataRisk[] = []
      let gaps: string[] = []
      let pendings: string[] = []

      if (pid === 'mock-coal-freight-dataset') {
        evidenceStatus = 'covered'
        evidenceReason = '完整覆盖：煤炭运价 + 榆林到天津港线路 + 2025 年 + 月度拆分'
        risks = [{ description: '历史数据覆盖至 2025-12，2026 年更新数据需确认', level: 'info' }]
      } else if (pid === 'mock-coal-freight-report') {
        evidenceStatus = 'partial'
        evidenceReason = '覆盖煤炭运价主题，但仅到季度粒度，月度数据需从数据集获取'
        pendings = ['是否包含榆林到天津港专线的运价明细']
        gaps = ['月度拆分粒度（仅提供季度汇总）']
        risks = [{ description: '季报更新频率，时效性低于需求', level: 'warning' }]
      } else if (pid === 'mock-coal-freight-api') {
        evidenceStatus = 'partial'
        evidenceReason = '支持起讫点筛选，但煤炭货类筛选需 API 参数确认'
        pendings = ['是否支持货类=煤炭的独立筛选']
      }

      const suitable = pid === 'mock-coal-freight-dataset'
      return {
        id: genId('card'),
        productId: pid,
        evidences: [{ taskId: taskId || task1.id, status: evidenceStatus, reason: evidenceReason }],
        isBestMatchOfTaskIds: suitable ? [taskId || task1.id] : [],
        risks: risks || [],
        pendingVerifications: pendings,
        confirmedGaps: gaps,
        primaryAction: evaluatePrimaryAction(meta),
        budgetHint: undefined,
      }
    }).filter(Boolean)

    return {
      taskIds: [taskId || task1.id],
      productIds,
      cards,
      runStatus: 'complete',
    }
  }

  // ── 场景 4：多需求+共享条件（煤炭运价 + 货运路线，共享华北） ──
  if (/运价.*路线|路线.*运价/.test(q) && /华北/.test(q)) {
    const freightIds = ['mock-coal-freight-dataset', 'mock-coal-freight-report']
    const routeIds = ['mock-freight-route-dataset', 'mock-freight-route-api']
    const allIds = [...new Set([...freightIds, ...routeIds])]

    const taskFreight = tasks.find((t) => t.standardQuestion.includes('煤炭运价'))
      || makeTask('煤炭运价', '从平台找华北地区的煤炭运价数据', [])
    const taskRoute = tasks.find((t) => t.standardQuestion.includes('货运路线'))
      || makeTask('货运路线', '从平台找华北地区的货运路线数据', [])

    taskFreight.supplyStatus = 'suitable'
    taskFreight.bestMatchProductId = 'mock-coal-freight-dataset'
    taskRoute.supplyStatus = 'partial'
    taskRoute.bestMatchProductId = 'mock-freight-route-dataset'

    const cards: ResultCardV104[] = []
    for (const pid of allIds) {
      const meta = v104ProductMeta[pid]
      if (!meta) continue

      const evidences: MatchEvidence[] = []
      let isBestMatchOf: string[] = []

      // 运价任务匹配
      if (freightIds.includes(pid)) {
        evidences.push({
          taskId: taskFreight.id,
          status: 'covered',
          reason: pid === 'mock-coal-freight-dataset'
            ? '完整覆盖：煤炭运价 + 华北地区 + 月度拆分'
            : '覆盖煤炭运价主题，华北地区数据在内',
        })
        if (pid === 'mock-coal-freight-dataset') isBestMatchOf.push(taskFreight.id)
      } else {
        evidences.push({ taskId: taskFreight.id, status: 'gap', reason: '不提供运价指标' })
      }

      // 路线任务匹配
      if (routeIds.includes(pid)) {
        const routeEv = { taskId: taskRoute.id, status: 'covered', reason: pid === 'mock-freight-route-dataset'
          ? '完整覆盖：货运路线 + 华北地区 + 港口筛选'
          : '支持华北地区货运路线查询' } as MatchEvidence
        evidences.push(routeEv)
        if (pid === 'mock-freight-route-dataset') isBestMatchOf.push(taskRoute.id)
      } else {
        evidences.push({ taskId: taskRoute.id, status: 'gap', reason: '不包含货运路线明细' })
      }

      cards.push({
        id: genId('card'),
        productId: pid,
        evidences,
        isBestMatchOfTaskIds: isBestMatchOf,
        risks: [],
        pendingVerifications: [],
        confirmedGaps: [],
        primaryAction: evaluatePrimaryAction(meta),
      })
    }

    return {
      taskIds: [taskFreight.id, taskRoute.id],
      productIds: allIds,
      cards,
      runStatus: 'complete',
    }
  }

  // ── 场景 1-0：具体司法文书类（判决书/案卷）—— 无匹配，触发放宽建议 ──
  // 这类需求比普通清算案例更具体，平台暂无直接对应商品
  if (/判决书|案卷|具体.*案例|案例.*明细|司法.*文书|破产.*文书/.test(q)
    && (/(青岛|胶洲)/.test(q) || /破产清算/.test(q))) {
    const taskId = tasks[0]?.id || genId('task')
    if (tasks[0]) tasks[0].supplyStatus = 'none'

    return {
      taskIds: [taskId],
      productIds: [],
      cards: [],
      runStatus: 'complete',
      relaxSuggestion: {
        conditionType: 'data_object' as const,
        originalCondition: '青岛胶洲区企业破产清算判决书',
        suggestedCondition: '放宽为"青岛胶洲企业破产清算案例汇编"（含案例要点摘要）',
        reason: '判决书/案卷明细这类司法文书平台暂未上架；改为找"清算案例汇编"或"企业清算信息数据集"更可能有匹配',
        precisionLoss: '从原始判决书降级为案例要点摘要；如需完整案卷需走采数流程由法务/数据团队对接',
        estimatedNewCount: 2,
      },
    }
  }

  // ── 场景 1-2：案例型找数（青岛清算案例）—— 部分匹配 ──
  // 正则收窄：不带具体司法文书关键词的普通清算 query
  if (/青岛.*清算|清算.*青岛/.test(q) || /胶洲.*清算|清算.*胶洲/.test(q)
    || (/破产清算/.test(q) && !/判决书|案卷|文书|明细案例|具体案例/.test(q))) {
    const productIds = ['mock-enterprise-bankruptcy-report', 'mock-qingdao-enterprise-dataset']
    const taskId = tasks[0]?.id || genId('task')

    const cards: ResultCardV104[] = []
    for (const pid of productIds) {
      const meta = v104ProductMeta[pid]
      if (!meta) continue

      if (pid === 'mock-enterprise-bankruptcy-report') {
        cards.push({
          id: genId('card'),
          productId: pid,
          evidences: [{
            taskId,
            status: 'partial',
            reason: '覆盖企业破产清算主题，但未说明是否包含案例明细',
          }],
          isBestMatchOfTaskIds: [],
          risks: [{ description: '全国范围数据，青岛地区数据量占比需确认', level: 'info' } as unknown as DataRisk],
          pendingVerifications: ['是否包含具体清算案例明细（非仅统计数据）', '青岛胶洲企业案例数量'],
          confirmedGaps: [],
          primaryAction: evaluatePrimaryAction(meta),
        })
      } else if (pid === 'mock-qingdao-enterprise-dataset') {
        cards.push({
          id: genId('card'),
          productId: pid,
          evidences: [{
            taskId,
            status: 'partial',
            reason: '青岛地区企业信息覆盖，但清算案例细节需确认',
          }],
          isBestMatchOfTaskIds: [],
          risks: [],
          pendingVerifications: ['是否包含破产/清算案例的详细司法文书要点'],
          confirmedGaps: [],
          primaryAction: evaluatePrimaryAction(meta),
        })
      }
    }

    // 设置任务状态
    if (tasks[0]) tasks[0].supplyStatus = 'partial'

    return {
      taskIds: [taskId],
      productIds,
      cards,
      runStatus: 'complete',
    }
  }

  // ── 兜底：无匹配 ──
  const taskId = tasks[0]?.id || genId('task')
  if (tasks[0]) tasks[0].supplyStatus = 'none'

  // PRD 7.19-7.21：有可靠依据时才给建议，否则如实说明
  // 原型阶段：地区放宽通常有效，更新频率放宽风险大，这里按条件类型区分
  const hasReliableRelaxSuggestion = true // 兜底场景给建议；真实需看候选分布
  const relaxSuggestion = hasReliableRelaxSuggestion
    ? {
        conditionType: 'region' as const,
        originalCondition: '青岛胶洲',
        suggestedCondition: '放宽到青岛全市',
        reason: '地区范围过窄可能是无匹配的主要原因；平台上青岛全市范围的清算相关商品候选量远大于胶洲单区域',
        precisionLoss: '需接受非胶洲地区的企业清算信息，后续可通过商品详情中的地区筛选进一步缩小',
        estimatedNewCount: 2,
      }
    : undefined

  return {
    taskIds: [taskId],
    productIds: [],
    cards: [],
    runStatus: 'complete',
    relaxSuggestion,
    // 无可靠建议时返回 noReliableRelax: true，UI 展示不同文案
    noReliableRelax: !hasReliableRelaxSuggestion,
  }
}

// ── Mock 澄清引擎 ────────────────────────────────────────
function shouldClarify(query: string, tasks: SearchTaskV104[]): ClarifyQuestionV104 | null {
  const q = query.toLowerCase()

  // 场景 5：归属歧义 —— "其中一个"指代不清
  if (/运价.*路线|路线.*运价/.test(q) && /其中.*港口|其中.*筛选/.test(q)) {
    return {
      question: '请问"其中一个要按港口筛选"指的是煤炭运价数据还是货运路线数据？',
      context: '你提到了两个需求（煤炭运价 + 货运路线），"按港口筛选"的归属会影响最终搜索结果',
      affectsTaskIds: tasks.map((t) => t.id),
      options: ['煤炭运价按港口筛选', '货运路线按港口筛选', '两个都按港口筛选'],
    }
  }

  return null
}

// ── Store ────────────────────────────────────────────────
interface V104State {
  conversation: ConversationV104 | null
  currentPhase: ConversationPhaseV104
  /** 澄清中的问题（整批单问） */
  pendingClarify: ClarifyQuestionV104 | null
  /** 搜索中标记 */
  isSearching: boolean
  /** 正在展示结果的版本 ID */
  activeResultVersionId: string
}

export const useAiV104Store = defineStore('aiV104', {
  state: (): V104State => ({
    conversation: null,
    currentPhase: 'greeting',
    pendingClarify: null,
    isSearching: false,
    activeResultVersionId: '',
  }),

  getters: {
    messages(state): ChatMessageV104[] {
      return state.conversation?.messages ?? []
    },
    tasks(state): SearchTaskV104[] {
      return state.conversation?.versions.find((v) => v.id === state.activeResultVersionId)?.tasks ?? []
    },
    currentVersion(state): SearchVersionV104 | null {
      if (!state.conversation) return null
      return state.conversation.versions.find((v) => v.id === state.activeResultVersionId) ?? null
    },
    sharedConditions(state): ConditionSlot[] {
      return this.currentVersion?.sharedConditions ?? []
    },
    resultCards(state): ResultCardV104[] {
      return this.currentVersion?.resultCards ?? []
    },
  },

  actions: {
    startConversation(ownerMemberId: string = 'demo-user') {
      if (this.conversation) return
      const id = genId('conversation-v104')
      this.conversation = {
        id,
        title: '新对话',
        ownerMemberId,
        phase: 'greeting',
        messages: [
          {
            id: genId('msg'),
            role: 'ai',
            text: '你好，我可以帮你找平台上的数据商品。直接说你想找什么就行，比如"找 2025 年榆林到天津港的煤炭公路运价"。',
            createdAt: now(),
          },
        ],
        activeVersionId: '',
        versions: [],
        createdAt: now(),
        updatedAt: now(),
      }
      this.currentPhase = 'greeting'
      this.pendingClarify = null
    },

    /**
     * 用户发送问题 — 入口方法
     */
    async sendQuestion(text: string) {
      if (!this.conversation) this.startConversation()
      const question = text.trim()
      if (!question || this.isSearching || this.pendingClarify) return

      // 1. 添加用户消息
      const userMsg: ChatMessageV104 = {
        id: genId('msg'),
        role: 'user',
        text: question,
        createdAt: now(),
      }
      this.conversation!.messages.push(userMsg)
      this.conversation!.updatedAt = now()
      this.conversation!.title = this.conversation!.title === '新对话' ? question.slice(0, 30) : this.conversation!.title

      // 2. 意图识别
      const intent = recognizeIntentV104(question)

      // 3. 路由：非找数意图走兜底
      if (intent !== 'find_data') {
        await this._handleNonFindIntent(intent, question)
        return
      }

      // 4. 找数意图：拆分任务 → 检查澄清 → 统一搜索
      this.isSearching = true
      this.currentPhase = 'searching'

      await sleep(800) // 模拟拆分耗时

      // 拆分多需求 — 原型按是否有多个独立对象来判断
      const tasks = this._splitTasks(question)
      const sharedConditions = this._extractSharedConditions(question, tasks)

      // 先检查是否需要澄清
      const clarify = shouldClarify(question, tasks)
      if (clarify) {
        await sleep(400)
        this.pendingClarify = clarify
        this.currentPhase = 'clarifying'
        this._addAiMessage({
          steps: [
            { label: '解析需求', done: true },
            { label: '拆分多需求', detail: `${tasks.length} 项`, done: true },
            { label: '检查是否需要澄清', done: false },
          ],
          clarifyQuestion: clarify,
          text: '我识别到了两个需求，但有一处归属不太清楚，只问你一个关键问题：',
        })
        this.isSearching = false
        return
      }

      // 直接进入搜索
      await this._executeSearch(question, tasks, sharedConditions)
    },

    /**
     * 回复澄清问题
     */
    async answerClarify(answer: string) {
      if (!this.pendingClarify) return
      const question = this.conversation!.messages.filter((m) => m.role === 'user').slice(-1)[0]?.text ?? ''

      // 记录用户澄清回复
      this.conversation!.messages.push({
        id: genId('msg'),
        role: 'user',
        text: answer,
        createdAt: now(),
      })
      this.conversation!.updatedAt = now()

      const tasks = this._splitTasks(question)
      const sharedConditions = this._extractSharedConditions(question, tasks)

      // 把澄清答案作为条件补充
      sharedConditions.push(makeSlot({
        type: 'other',
        original: `澄清确认：${answer}`,
        strength: 'must',
      }))

      this.pendingClarify = null
      this.isSearching = true
      await sleep(600)
      await this._executeSearch(question, tasks, sharedConditions)
    },

    /**
     * 删除某项不清晰的需求 — PRD 4.2
     */
    removeTask(taskId: string) {
      if (!this.currentVersion) return
      this.currentVersion.tasks = this.currentVersion.tasks.filter((t) => t.id !== taskId)
      this._recomputeResults()
    },

    /**
     * 申请采数 — 先展示前置确认面板（PRD 4.9 + 7.21）
     * 用户确认后调 confirmAndSubmitCollection
     */
    requestCollection() {
      const preflight = this.getCollectPreflight()
      if (!preflight) return

      const tasksText = preflight.tasks.map((t) => `- ${t.standardQuestion}`).join('\n')
      const condText = preflight.conditions.map((c) => `- ${c.original}（${c.strength === 'must' ? '必须' : c.strength === 'prefer' ? '偏好' : '未明确'}）`).join('\n')
      const gapsText = preflight.knownGaps.length > 0
        ? `\n\n**已知缺口/限制（人工对接时确认）：**\n${preflight.knownGaps.map((g) => `- ${g}`).join('\n')}`
        : ''

      this._addAiMessage({
        text: `确认提交采数申请前，请核对以下内容：\n\n**需求：**\n${tasksText}\n\n**当前条件：**\n${condText}${gapsText}\n\n确认无误后点击提交，我们会在 3 个工作日内联系你。`,
        steps: [
          { label: '核对需求', done: true },
          { label: '请用户确认提交' },
        ],
      })
    },

    /**
     * 应用放宽建议 — PRD 4.9
     */
    async applyRelaxSuggestion() {
      if (!this.currentVersion?.relaxSuggestion) return
      const suggestion = this.currentVersion.relaxSuggestion

      this._addAiMessage({
        text: `好的，我把"${suggestion.originalCondition}"放宽为"${suggestion.suggestedCondition}"，重新搜索一下……`,
        steps: [
          { label: '修改条件', done: true },
          { label: '重新搜索' },
        ],
      })

      this.currentVersion.relaxSuggestion = undefined
      this.isSearching = true
      await sleep(1200)

      // 放宽后假设找到部分匹配
      this._applyRelaxResult(suggestion)
      this.isSearching = false
    },

    /**
     * 重试当前搜索
     */
    async retrySearch() {
      if (!this.currentVersion) return
      this._addAiMessage({ text: '好的，按原条件重新搜索……' })
      this.isSearching = true
      this.currentVersion.runStatus = 'running'
      await sleep(1500)
      this.currentVersion.runStatus = 'complete'
      this.isSearching = false
      this._addAiMessage({ text: '搜索完成，结果与上次一致。你可以修改条件或提交采数。' })
    },

    // ── 内部方法 ──────────────────────────────────────────

    _splitTasks(query: string): SearchTaskV104[] {
      const q = query.toLowerCase()
      // 多需求判断：有明确的两个独立对象
      const tasks: SearchTaskV104[] = []

      // 简化的需求拆分 — 原型阶段按关键词匹配
      const patterns = [
        { obj: '煤炭运价', task: '煤炭运价' },
        { obj: '货运路线', task: '货运路线' },
        { obj: '港口吞吐量', task: '港口吞吐量' },
        { obj: '清算案例', task: '清算案例' },
      ]

      let foundAny = false
      for (const p of patterns) {
        if (q.includes(p.obj)) {
          foundAny = true
          tasks.push(makeTask(
            query,
            `从平台找与「${p.obj}」相关的数据`,
            []
          ))
        }
      }

      // 兜底：识别不到明确对象时按整个 query 作为一个任务
      if (!foundAny) {
        tasks.push(makeTask(query, `从平台找：${query}`, []))
      }

      return tasks
    },

    _extractSharedConditions(query: string, _tasks: SearchTaskV104[]): ConditionSlot[] {
      const q = query.toLowerCase()
      const slots: ConditionSlot[] = []

      // 时间条件
      if (/202[0-9]/.test(q)) {
        const year = q.match(/202[0-9]/)![0]
        slots.push(makeSlot({ type: 'time', original: year, value: year, strength: 'must' }))
      }
      if (/按月|按月份|月.*查看/.test(q)) {
        slots.push(makeSlot({ type: 'granularity', original: '按月查看', value: '月', strength: 'must' }))
      }

      // 地区条件
      if (/华北/.test(q)) slots.push(makeSlot({ type: 'region', original: '华北地区', value: '华北', strength: 'must' }))
      if (/榆林/.test(q)) slots.push(makeSlot({ type: 'region', original: '榆林', value: '榆林', strength: 'must' }))
      if (/天津港/.test(q)) slots.push(makeSlot({ type: 'region', original: '天津港', value: '天津港', strength: 'must' }))
      if (/青岛/.test(q)) slots.push(makeSlot({ type: 'region', original: '青岛', value: '青岛', strength: 'must' }))
      if (/胶洲/.test(q)) slots.push(makeSlot({ type: 'region', original: '青岛胶洲', value: '青岛胶洲', strength: 'must' }))

      // 商品类型偏好
      if (/(只要|仅|只找).*(数据集|报告|api|看板)/.test(q)) {
        let type = 'unknown'
        if (/数据集/.test(q)) type = 'dataset'
        else if (/api/.test(q)) type = 'api'
        else if (/报告/.test(q)) type = 'report'
        slots.push(makeSlot({ type: 'product_type', original: query, value: type, strength: 'must' }))
      }

      return slots
    },

    async _executeSearch(query: string, tasks: SearchTaskV104[], sharedConditions: ConditionSlot[]) {
      await sleep(1000) // 模拟检索耗时

      // 执行 mock 搜索
      const scenario = mockSearchEngine(query, tasks, sharedConditions)

      // 生成新版本
      const existingVersions = this.conversation!.versions.length
      const version: SearchVersionV104 = {
        id: genId('version'),
        versionNo: existingVersions + 1,
        sharedConditions,
        tasks,
        resultCards: scenario.cards,
        runStatus: scenario.runStatus,
        isLatest: true,
        expanded: true,
        relaxSuggestion: scenario.relaxSuggestion,
        createdAt: now(),
      }

      // 将旧版本标记为非最新、折叠
      this.conversation!.versions.forEach((v) => { v.isLatest = false; v.expanded = false })
      this.conversation!.versions.push(version)
      this.activeResultVersionId = version.id

      // 统计
      const suitableCount = tasks.filter((t) => t.supplyStatus === 'suitable').length
      const partialCount = tasks.filter((t) => t.supplyStatus === 'partial').length
      const noneCount = tasks.filter((t) => t.supplyStatus === 'none').length

      const resultSummary = {
        totalTasks: tasks.length,
        suitableCount,
        partialCount,
        noneCount,
        completenessStatus: scenario.runStatus === 'complete' ? 'complete' : 'partial',
      } as AiMessageContentV104['resultSummary']

      // 构造步骤
      const steps: StepItem[] = [
        { label: '解析需求', done: true },
        { label: '拆分多需求', detail: `${tasks.length} 项`, done: true },
        { label: '统一搜索商品', detail: `检索 ${scenario.productIds.length} 款候选`, done: true },
        { label: '证据核对与匹配判断', done: true },
      ]

      // 构造 AI 消息
      let aiContent: AiMessageContentV104 = {
        steps,
        resultSummary,
      }

      // 主回答文本
      const parts: string[] = []
      if (suitableCount > 0) parts.push(`找到了 **${suitableCount} 项**合适的商品`)
      if (partialCount > 0) parts.push(`**${partialCount} 项**部分匹配（有条件缺口或待核实）`)
      if (noneCount > 0) parts.push(`**${noneCount} 项**未找到合适商品`)

      aiContent.text = parts.join('，') + '，详情见下方商品卡片。'

      // 无合适商品时：区分"有可靠建议" vs "无可靠建议"（PRD 7.19-7.21）
      if (noneCount > 0 && scenario.noReliableRelax) {
        // PRD 7.21：如实说明，不强行生成建议
        aiContent.text += '\n\n本次搜索未找到符合当前要求的商品，暂时没有可靠的条件调整建议。你可以主动修改需求，或直接提交采数需求。'
        aiContent.collectButton = { taskIds: tasks.filter((t) => t.supplyStatus === 'none').map((t) => t.id), reason: '本次未找到合适商品，可主动修改需求或提交采数' }
      } else if (noneCount > 0 && scenario.relaxSuggestion) {
        // PRD 7.19：有可靠建议时才展示放宽卡
        aiContent.relaxSuggestion = scenario.relaxSuggestion
        aiContent.collectButton = { taskIds: tasks.filter((t) => t.supplyStatus === 'none').map((t) => t.id), reason: '本次未找到合适商品，可放宽条件后重试或提交采数需求' }
      } else if (partialCount > 0 && noneCount > 0) {
        // 部分匹配 + 部分无合适：提示用户可按缺口主动修改
        aiContent.text += '\n\n有缺口的需求可主动调整条件后重试，或提交采数需求。'
      }

      this._addAiMessage(aiContent)
      this.currentPhase = 'showing_results'
      this.isSearching = false
      this.conversation!.updatedAt = now()
    },

    async _handleNonFindIntent(intent: IntentV104, question: string) {
      const responses: Record<IntentV104, string> = {
        chat: '你好，我主要帮你在平台上找数据商品。说一下你想找什么样的数据吧？',
        direct_answer: '抱歉，我暂不能直接回答具体数值问题。不过我可以帮你找平台上相关的数据商品，比如"找 2025 年榆林到天津港的煤炭运价数据"。需要帮你搜一下吗？',
        product_consult: `关于"${question}"，你可以从下方商品卡片进入详情页查看具体内容和价格。如果不知道是哪件商品，能告诉我商品名称吗？`,
        platform_faq: '购买和价格相关的问题，建议查看[帮助中心]或联系[在线客服]。如果你想找特定数据商品，我可以帮你搜一下。',
        find_data: '', // 不会走到这里
      }

      this._addAiMessage({ text: responses[intent] })
    },

    _addAiMessage(content: AiMessageContentV104) {
      if (!this.conversation) return
      this.conversation.messages.push({
        id: genId('msg'),
        role: 'ai',
        aiContent: content,
        createdAt: now(),
      })
      this.conversation.updatedAt = now()
    },

    _recomputeResults() {
      // 简化：删除任务后直接重建卡片（原型阶段）
      const version = this.currentVersion
      if (!version) return
      version.tasks = version.tasks.filter((t) => version.resultCards.some((c) =>
        c.evidences.some((e) => e.taskId === t.id)))
    },

    _applyRelaxResult(suggestion: RelaxSuggestion) {
      const version = this.currentVersion
      if (!version) return

      // PRD 7.20：标注放宽了哪个限定，并保存原条件用于一键回退
      const originalConditionsSnapshot = version.sharedConditions.map((c) => ({ ...c }))

      // 构造放宽后假设找到的卡片
      const cards: ResultCardV104[] = [{
        id: genId('card'),
        productId: 'mock-enterprise-bankruptcy-report',
        evidences: [{
          taskId: version.tasks[0]?.id ?? genId('task'),
          status: 'partial',
          reason: `放宽条件"${suggestion.suggestedCondition}"后，找到相关商品覆盖清算主题`,
        }],
        isBestMatchOfTaskIds: version.tasks.length > 0 ? [version.tasks[0]!.id] : [],
        risks: [],
        pendingVerifications: ['是否包含具体清算案例明细'],
        confirmedGaps: [],
        primaryAction: { type: 'buy_now' },
      }]

      version.resultCards = cards
      version.tasks.forEach((t) => { t.supplyStatus = 'partial'; t.bestMatchProductId = 'mock-enterprise-bankruptcy-report' })
      version.runStatus = 'complete'
      version.relaxApplied = true
      version.relaxNote = `已将"${suggestion.originalCondition}"放宽为"${suggestion.suggestedCondition}"`
      version.originalConditionsSnapshot = originalConditionsSnapshot

      this._addAiMessage({
        text: `放宽条件后，找到 ${cards.length} 款部分匹配的商品。你可以查看详情或继续放宽，也可以直接提交采数需求。`,
        resultSummary: {
          totalTasks: version.tasks.length,
          suitableCount: 0,
          partialCount: version.tasks.length,
          noneCount: 0,
          completenessStatus: 'complete',
        },
      })
    },

    /**
     * 一键回到放宽前的条件（PRD 7.20）
     */
    async restoreOriginalConditions() {
      const version = this.currentVersion
      if (!version || !version.originalConditionsSnapshot) return

      this._addAiMessage({ text: '好的，已恢复到放宽前的条件，重新搜索……' })
      this.isSearching = true
      await sleep(1000)

      version.sharedConditions = version.originalConditionsSnapshot.map((c) => ({ ...c }))
      version.relaxApplied = undefined
      version.relaxNote = undefined
      version.originalConditionsSnapshot = undefined

      await this._executeSearch(
        this.conversation!.messages.filter((m) => m.role === 'user').slice(0, 1)[0]?.text ?? '',
        version.tasks,
        version.sharedConditions
      )
      this.isSearching = false
    },

    /**
     * 获取采数前置确认数据（PRD 4.9 + 7.21）
     */
    getCollectPreflight(): { tasks: { id: string; standardQuestion: string }[]; conditions: { type: ConditionSlot['type']; original: string; strength: ConditionSlot['strength'] }[]; knownGaps: string[] } | null {
      const version = this.currentVersion
      if (!version) return null

      const knownGaps: string[] = []
      version.resultCards.forEach((card) => {
        card.confirmedGaps.forEach((g) => knownGaps.push(g))
        card.pendingVerifications.forEach((p) => knownGaps.push(p))
      })
      // 部分匹配但没有候选的任务也加缺口
      version.tasks.forEach((t) => {
        if (t.supplyStatus === 'none') knownGaps.push(`"${t.standardQuestion}"本次搜索未找到合适商品`)
      })

      return {
        tasks: version.tasks.map((t) => ({ id: t.id, standardQuestion: t.standardQuestion })),
        conditions: version.sharedConditions.map((c) => ({ type: c.type, original: c.original, strength: c.strength })),
        knownGaps: [...new Set(knownGaps)],
      }
    },

    /**
     * 确认后正式提交采数 — PRD 4.9
     */
    async confirmAndSubmitCollection() {
      const preflight = this.getCollectPreflight()
      if (!preflight) return

      this.currentPhase = 'collecting'
      this._addAiMessage({
        steps: [
          { label: '核对需求', done: true },
          { label: '生成采数申请', done: true },
          { label: '提交成功，等待人工对接', done: true },
        ],
        text: '采数申请已提交，包含以下内容：\n\n'
          + '**需求：**\n' + preflight.tasks.map((t) => `- ${t.standardQuestion}`).join('\n')
          + '\n\n**当前条件：**\n' + preflight.conditions.map((c) => `- ${c.original}（${c.strength === 'must' ? '必须' : c.strength === 'prefer' ? '偏好' : '未明确'}）`).join('\n')
          + (preflight.knownGaps.length > 0
              ? '\n\n**已知缺口/限制（人工对接时确认）：**\n' + preflight.knownGaps.map((g) => `- ${g}`).join('\n')
              : '')
          + '\n\n我们会在 3 个工作日内联系你确认采数方案。',
      })
    },

    resetConversation() {
      this.conversation = null
      this.currentPhase = 'greeting'
      this.pendingClarify = null
      this.isSearching = false
      this.activeResultVersionId = ''
    },

    toggleVersionExpand(versionId: string) {
      const v = this.conversation?.versions.find((x) => x.id === versionId)
      if (v) v.expanded = !v.expanded
    },

    selectVersion(versionId: string) {
      const v = this.conversation?.versions.find((x) => x.id === versionId)
      if (!v) return
      this.conversation!.versions.forEach((x) => x.expanded = (x.id === versionId))
      this.activeResultVersionId = versionId
    },
  },
})
