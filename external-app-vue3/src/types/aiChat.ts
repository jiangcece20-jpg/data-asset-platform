/**
 * AI 聊天类型系统
 * 从 React 工程迁移：统一输入、意图识别、答案与商品混排、找数场景表达
 */

/** 意图类型 — 决定 AI 回复的内容结构 */
export type ChatIntent = 'answer' | 'search' | 'metric_query' | 'unknown'

/** 找数三路由（与 domain/discoverRouting 对齐） */
export type ChatDiscoverRoute = 'known_lookup' | 'processing_query' | 'external_exploration'

/** 消息内容块 — 答案与商品混排 */
export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'product-card'; productId: string; reason?: string }
  | { type: 'metric'; label: string; value: string; change?: string; dir?: 'up' | 'down'; period?: string }
  | { type: 'route-badge'; route: ChatDiscoverRoute; label: string; confidence?: number }
  | {
      type: 'external-zone'
      summary: string
      sources: { title: string; url: string }[]
    }

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  blocks: MessageBlock[]
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
