/**
 * AI找数 V1.0.4 类型系统
 * 基于 PRD：/Users/jiangpangzi/Documents/13、笔记软件/都是精华/产品/AI找数/PRD/V1.0.4-AI找数需求材料/2026-10-21-AI找数V1.0.4-版本需求.md
 *
 * 核心流程：用户提问 → 意图识别 → 多需求拆分 → 整批单问澄清 → 统一搜索 → 逐需求结果展示
 */

// ── 意图分类（PRD 3.1） ─────────────────────────────
export type IntentV104 =
  | 'find_data'      // 明确找数（本期核心）
  | 'direct_answer'  // 直接问数值或结论（兜底：说明暂不能直接回答，问是否改为找商品）
  | 'product_consult' // 咨询已有商品
  | 'platform_faq'   // 平台能力咨询 / 购买 FAQ
  | 'chat'           // 闲聊

// ── 条件槽位（PRD 4.1） ─────────────────────────────
// 条件必要程度
export type ConditionStrength = 'must' | 'prefer' | 'unclear'

// 条件关系
export type ConditionRelation = 'all' | 'any' | 'exclude'

// 单类条件
export interface ConditionSlot {
  /** 槽位类型 */
  type:
    | 'data_object'       // 数据描述的对象（如：煤炭、汽车、企业清算案例）
    | 'metric'            // 指标（如：运价、销量、景气指数）
    | 'theme'             // 分析主题（如：运输成本、市场行情、清算）
    | 'business_dimension' // 业务维度（随行业变化，如：品牌、车型、渠道、企业规模）
    | 'region'            // 地区
    | 'time'              // 时间
    | 'granularity'       // 拆分粒度（地区/时间）
    | 'record_level'      // 记录明细层级
    | 'update_frequency'  // 更新频率
    | 'product_type'      // 商品类型限制/偏好（数据集/报告/API）
    | 'budget'            // 价格预算
    | 'other'             // 无法归类的原话约束
  /** 用户原始表达 */
  original: string
  /** 标准化值（可选） */
  value?: string
  /** 必要程度 */
  strength: ConditionStrength
  /** 同类条件多值关系（可选） */
  relation?: ConditionRelation
  /** 归属：shared=共享条件，local=某任务局部条件 */
  scope: 'shared' | 'local'
  /** 归属到的任务 ID（scope=local 时有值） */
  taskId?: string
}

// ── 搜索任务（PRD 4.1 + 4.7） ──────────────────────
export interface SearchTaskV104 {
  id: string
  /** 用户原话中对应此任务的片段 */
  originalQuery: string
  /** 标准找数问题 */
  standardQuestion: string
  /** 本任务的条件（不含共享条件） */
  localConditions: ConditionSlot[]
  /** 本任务的最佳匹配商品 ID（可能为空） */
  bestMatchProductId?: string
  /** 本任务的供给状态 */
  supplyStatus?: SupplyStatus
}

// ── 供给状态（PRD 4.5） ─────────────────────────────
export type SupplyStatus = 'suitable' | 'partial' | 'none'

// ── 动态主操作（PRD 4.8） ───────────────────────────
// 与 1.0.2 详情页 ProductActionKey 对齐，按钮文案从 @/domain/productAccess 的
// listActionLabelByKey 取（提交试用申请 / 查看订单 / 继续支付 / 购买数据集 等）
import type { ProductActionKey } from '@/domain/productAccess'

export interface PrimaryAction {
  /** 动作 key，对应 1.0.2 详情页 ProductActionKey */
  key: ProductActionKey
  /** 可选：覆写按钮文案（默认取 listActionLabelByKey[key]） */
  label?: string
  /** 是否禁用 */
  disabled?: boolean
}

// ── 商品匹配证据（PRD 4.4） ──────────────────────────
export interface MatchEvidence {
  /** 命中的任务 ID */
  taskId: string
  /** 覆盖状态 */
  status: 'covered' | 'partial' | 'gap' | 'pending_verify'
  /** 推荐理由 / 缺口说明 */
  reason: string
}

// ── 数据适用风险（PRD 4.4） ─────────────────────────
export interface DataRisk {
  /** 风险描述 */
  description: string
  /** 风险等级 */
  level: 'info' | 'warning' | 'blocker'
}

// ── 结果卡片（PRD 4.4 + 4.7） ───────────────────────
export interface ResultCardV104 {
  id: string
  /** 关联的真实商品 ID（catalog 里的 product.id） */
  productId: string
  /** 该商品覆盖的所有任务的匹配证据 */
  evidences: MatchEvidence[]
  /** 该商品是否是某个任务的最佳匹配 */
  isBestMatchOfTaskIds: string[]
  /** 数据适用风险 */
  risks: DataRisk[]
  /** 待核实项（商品资料未说明的条件） */
  pendingVerifications: string[]
  /** 明确缺口（商品资料确认不支持的条件） */
  confirmedGaps: string[]
  /** 动态主操作 */
  primaryAction: PrimaryAction
  /** 预算提示（仅在币种/口径可比时有效） */
  budgetHint?: 'within' | 'over' | 'unknown'
}

// ── 搜索版本（PRD 4.6 多轮历史） ────────────────────
export interface SearchVersionV104 {
  id: string
  /** 版本序号（从 1 开始） */
  versionNo: number
  /** 此版本对应的共享条件快照 */
  sharedConditions: ConditionSlot[]
  /** 此版本的搜索任务快照（每个任务含局部条件） */
  tasks: SearchTaskV104[]
  /** 此版本的结果卡片（全局去重） */
  resultCards: ResultCardV104[]
  /** 搜索运行状态 */
  runStatus: 'running' | 'complete' | 'partial_fail' | 'failed'
  /** 是否当前最新版本 */
  isLatest: boolean
  /** 是否默认展开 */
  expanded: boolean
  /** 搜索完整性说明 */
  completenessNote?: string
  /** 放宽建议（如有）— 搜索阶段展示给用户 */
  relaxSuggestion?: RelaxSuggestion
  /** 此版本是否为放宽条件后生成（PRD 7.20 标注放宽限定） */
  relaxApplied?: boolean
  /** 放宽说明：如"已将地区从'青岛胶洲'放宽为'青岛全市'" */
  relaxNote?: string
  /** 原始条件快照（仅 relaxApplied=true 时有值，用于一键回退到放宽前） */
  originalConditionsSnapshot?: ConditionSlot[]
  createdAt: string
}

// ── 放宽建议（PRD 4.9 + 算法 7.19-7.21） ──────────
export interface RelaxSuggestion {
  /** 原条件文本（用于展示对比） */
  originalCondition: string
  /** 建议条件文本（用于展示对比） */
  suggestedCondition: string
  /** 条件类型 */
  conditionType: ConditionSlot['type']
  /** 为什么建议放宽这个条件 — 最可能扩大有效候选的依据 */
  reason: string
  /** 可能影响：精度/适用性损失说明（PRD 叫 precision loss） */
  precisionLoss: string
  /** 预计新增候选数量；无法可靠估算时不填（PRD 7.19-5） */
  estimatedNewCount?: number
}

// ── 采数提交前的确认数据（PRD 4.9 + 7.21） ──────
export interface CollectPreflight {
  /** 需求列表（用户原话中的每个找数目标） */
  tasks: { id: string; standardQuestion: string }[]
  /** 当前生效的条件 */
  conditions: { type: ConditionSlot['type']; original: string; strength: ConditionSlot['strength'] }[]
  /** 已识别的缺口/限制，供用户确认是否接受 */
  knownGaps: string[]
}

// ── 澄清问题（PRD 4.2） ─────────────────────────────
export interface ClarifyQuestionV104 {
  /** 要澄清的具体问题文本 */
  question: string
  /** 为什么需要澄清 */
  context: string
  /** 澄清后会影响哪些任务 */
  affectsTaskIds: string[]
  /** 可选回复 */
  options?: string[]
}

// ── 对话阶段 ────────────────────────────────────────
export type ConversationPhaseV104 =
  | 'greeting'          // 初始欢迎
  | 'clarifying'        // 整批单问澄清中
  | 'searching'         // 统一搜索中
  | 'showing_results'   // 结果展示中
  | 'collecting'        // 采数中

// ── V1.0.4 聊天消息 ──────────────────────────────────
export interface ChatMessageV104 {
  id: string
  role: 'user' | 'ai'
  /** 消息内容文本 */
  text?: string
  /** AI 消息的结构化内容（可选，优先于 text） */
  aiContent?: AiMessageContentV104
  createdAt: string
}

// ── AI 消息的结构化内容 ──────────────────────────────
export interface AiMessageContentV104 {
  /** 过程步骤（可折叠） */
  steps?: StepItem[]
  /** 结构化文本（支持轻量 markdown） */
  text?: string
  /** 澄清问题（处于澄清阶段时） */
  clarifyQuestion?: ClarifyQuestionV104
  /** 结果展示（处于结果阶段时） */
  resultSummary?: {
    totalTasks: number
    suitableCount: number
    partialCount: number
    noneCount: number
    completenessStatus: 'complete' | 'partial' | 'failed'
  }
  /** 放宽建议（无合适商品时） */
  relaxSuggestion?: RelaxSuggestion
  /** 采数入口 */
  collectButton?: {
    taskIds: string[]
    reason: string
  }
  /** 反馈入口 */
  feedback?: boolean
}

export interface StepItem {
  label: string
  detail?: string
  done?: boolean
}

// ── V1.0.4 会话 ──────────────────────────────────────
export interface ConversationV104 {
  id: string
  title: string
  ownerMemberId: string
  phase: ConversationPhaseV104
  messages: ChatMessageV104[]
  /** 当前活跃的搜索版本 ID */
  activeVersionId: string
  /** 历史版本列表 */
  versions: SearchVersionV104[]
  createdAt: string
  updatedAt: string
}
