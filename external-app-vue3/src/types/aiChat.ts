/**
 * AI 聊天类型系统
 * 从 React 工程迁移：统一输入、意图识别、答案与商品混排、找数场景表达
 */

/** 意图类型 — 决定 AI 回复的内容结构 */
export type ChatIntent = 'answer' | 'search' | 'metric_query' | 'compare' | 'unknown'

/** 找数三路由（与 domain/discoverRouting 对齐） */
export type ChatDiscoverRoute = 'known_lookup' | 'processing_query' | 'external_exploration'

/** 表格内容块 — 行情/对比等结构化数据 */
export interface TablePayload {
  title?: string
  columns: string[]
  rows: string[][]
}

/** 消息内容块 — 答案与商品混排 */
export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'product-card'; productId: string; reason?: string }
  | { type: 'product-compare'; productIds: string[] }
  | { type: 'table' } & TablePayload
  | { type: 'metric'; label: string; value: string; change?: string; dir?: 'up' | 'down'; period?: string }
  | { type: 'route-badge'; route: ChatDiscoverRoute; label: string; confidence?: number }
  | {
      type: 'external-zone'
      summary: string
      sources: { title: string; url: string }[]
    }

/** 回答过程步骤 — 可折叠时间线 */
export interface ChatStep {
  label: string
  detail?: string
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  blocks: MessageBlock[]
  steps?: ChatStep[]
  intent?: ChatIntent
  route?: ChatDiscoverRoute
  createdAt: string
}

/** 引导问题 — 空状态时展示的场景化入口 */
export interface GuideQuestion {
  icon: string
  text: string
  intent: ChatIntent
}

/** 欢迎屏场景卡（PC 全页工作台三场景：找数据 / 问行情 / 比商品） */
export interface GuideScenario {
  key: 'find' | 'market' | 'compare'
  label: string
  tagline: string
  questions: GuideQuestion[]
}
