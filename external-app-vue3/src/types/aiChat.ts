/**
 * AI 聊天类型系统
 * 从 React 工程迁移：统一输入、意图识别、答案与商品混排、找数场景表达
 */

/** 意图类型 — 决定 AI 回复的内容结构 */
export type ChatIntent = 'answer' | 'search' | 'metric_query' | 'unknown'

/** 用户角色 — 场景化推荐的基础 */
export type ChatRole = '业务运营' | '产品经理' | '管理层' | '数据分析师' | '数仓开发'

/** 消息内容块 — 支持"答案与商品混排"的结构化渲染 */
export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'product-card'; productId: string; reason: string }
  | { type: 'metric'; label: string; value: string; change?: string; dir?: 'up' | 'down'; period?: string }
  | { type: 'source'; title: string; productId?: string; locked: boolean }
  | { type: 'step'; label: string; status: 'pending' | 'running' | 'done' | 'failed' }

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  blocks: MessageBlock[]
  intent?: ChatIntent
  createdAt: string
}

/** 引导问题 — 空状态时展示的场景化入口 */
export interface GuideQuestion {
  icon: string
  text: string
  intent: ChatIntent
}

/** 角色选项 */
export interface RoleOption {
  value: ChatRole
  label: string
  icon: string
}
