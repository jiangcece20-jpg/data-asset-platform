/**
 * AI 找数三路由意图决策 — 双入口 + 路由 1/2/3
 * 纯函数，无 store 依赖。
 */

import type { Product } from '@/types/domain'

export type DiscoverRoute = 'known_lookup' | 'processing_query' | 'external_exploration'
export type DiscoverEntry = 'keyword' | 'ai'

export type RouteDecisionPath =
  | 'entry_keyword'
  | 'entry_ai_default'
  | 'low_confidence_upgrade'
  | 'low_completeness_upgrade'
  | 'external_direct'

export type SceneType = 'known' | 'processing' | 'external'

export interface RetrievalHit {
  id: string
  kind: 'product' | 'internal_view'
  title: string
  score: number
  matchedFields: string[]
}

export interface RouteDecision {
  route: DiscoverRoute
  scene: SceneType
  confidence: number
  path: RouteDecisionPath
  reasons: string[]
}

export interface RouteDecisionInput {
  entry: DiscoverEntry
  query: string
  retrievalHits: RetrievalHit[]
  dataCompleteness: number
}

export const CONFIDENCE_THRESHOLD = 0.6
export const COMPLETENESS_THRESHOLD = 0.4

const EXTERNAL_PATTERNS = /政策|限产|期货|暴涨|宏观|供应链变化|外部|新闻|原因|市场变化/

export const ROUTE_META: Record<
  DiscoverRoute,
  { label: string; shortLabel: string; description: string }
> = {
  known_lookup: {
    label: '已知型查找',
    shortLabel: '路由 1',
    description: '关键词匹配，直接返回结构化结果'
  },
  processing_query: {
    label: '加工型询问',
    shortLabel: '路由 2',
    description: '平台内检索 + AI 组织答案'
  },
  external_exploration: {
    label: '外延型探索',
    shortLabel: '路由 3',
    description: '平台数据不足，补充外网信息（出域）'
  }
}

/** 检索命中与 query 的语义匹配置信度（0–1，原型用字段重叠估算） */
export function computeConfidence(query: string, hits: RetrievalHit[]): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  if (!hits.length) return 0
  const top = hits[0]!
  // 高相关命中直接视为可加工
  if (top.score >= 0.68) return Math.max(CONFIDENCE_THRESHOLD, top.score)
  const title = top.title.toLowerCase()
  if (title.includes(q) || q.includes(title.slice(0, Math.min(6, title.length)))) return Math.max(top.score, 0.85)
  const grams = new Set<string>()
  for (let i = 0; i + 2 <= q.length; i++) grams.add(q.slice(i, i + 3))
  let overlap = 0
  for (const gram of grams) {
    if (title.includes(gram)) overlap += 1
  }
  const gramScore = grams.size ? overlap / grams.size : 0
  return Math.min(1, top.score * 0.6 + gramScore * 0.4)
}

/** 平台内数据覆盖度：有结构化/高相关命中则高，仅元数据则低 */
export function computeCompleteness(hits: RetrievalHit[]): number {
  if (!hits.length) return 0
  const top = hits[0]!
  if (top.score >= 0.75 && top.matchedFields.some((f) => f.includes('名称') || f.includes('标签'))) return 0.55
  if (top.score >= 0.5) return 0.45
  return 0.25
}

export function isExternalSceneQuery(query: string): boolean {
  return EXTERNAL_PATTERNS.test(query.trim())
}

export function decideRoute(input: RouteDecisionInput): RouteDecision {
  const { entry, query, retrievalHits, dataCompleteness } = input
  const confidence = computeConfidence(query, retrievalHits)

  if (entry === 'keyword') {
    return {
      route: 'known_lookup',
      scene: 'known',
      confidence,
      path: 'entry_keyword',
      reasons: ['用户从关键词搜索入口进入']
    }
  }

  if (isExternalSceneQuery(query)) {
    return {
      route: 'external_exploration',
      scene: 'external',
      confidence,
      path: 'external_direct',
      reasons: ['问题涉及政策、市场或宏观等外延场景']
    }
  }

  if (confidence >= CONFIDENCE_THRESHOLD && dataCompleteness >= COMPLETENESS_THRESHOLD) {
    return {
      route: 'processing_query',
      scene: 'processing',
      confidence,
      path: 'entry_ai_default',
      reasons: ['平台数据覆盖充足且检索匹配置信度达标']
    }
  }

  const reasons: string[] = []
  if (confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(`检索置信度 ${confidence.toFixed(2)} 低于 ${CONFIDENCE_THRESHOLD}`)
  }
  if (dataCompleteness < COMPLETENESS_THRESHOLD) {
    reasons.push(`平台数据完整性 ${dataCompleteness.toFixed(2)} 低于 ${COMPLETENESS_THRESHOLD}`)
  }

  return {
    route: 'external_exploration',
    scene: 'external',
    confidence,
    path: confidence < CONFIDENCE_THRESHOLD ? 'low_confidence_upgrade' : 'low_completeness_upgrade',
    reasons
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: '名称',
  subtitle: '副标题',
  description: '描述',
  recommendText: '推荐语',
  provider: '提供方',
  sellerName: '卖家',
  tags: '标签',
  scenarios: '场景'
}

/** 为路由 1 生成可解释的命中说明 */
export function explainProductMatch(product: Product, query: string): Pick<RetrievalHit, 'score' | 'matchedFields'> {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0.5, matchedFields: ['综合排序'] }

  const checks: Array<{ key: keyof Product | 'tags' | 'scenarios'; label: string; value: string }> = [
    { key: 'name', label: FIELD_LABELS.name, value: product.name },
    { key: 'subtitle', label: FIELD_LABELS.subtitle, value: product.subtitle },
    { key: 'description', label: FIELD_LABELS.description, value: product.description },
    { key: 'recommendText', label: FIELD_LABELS.recommendText, value: product.recommendText || '' },
    { key: 'provider', label: FIELD_LABELS.provider, value: product.provider },
    { key: 'sellerName', label: FIELD_LABELS.sellerName, value: product.sellerName || '' }
  ]

  const matchedFields: string[] = []
  let bestScore = 0

  for (const item of checks) {
    const hay = item.value.toLowerCase()
    if (!hay) continue
    if (hay.includes(q)) {
      matchedFields.push(item.label)
      bestScore = Math.max(bestScore, 0.95)
      continue
    }
    for (let i = 0; i + 3 <= q.length; i++) {
      const gram = q.slice(i, i + 3)
      if (/\s/.test(gram)) continue
      if (hay.includes(gram)) {
        matchedFields.push(item.label)
        bestScore = Math.max(bestScore, 0.72)
        break
      }
    }
  }

  for (const tag of product.tags) {
    if (q.includes(tag.toLowerCase()) || tag.toLowerCase().includes(q.slice(0, 3))) {
      matchedFields.push(FIELD_LABELS.tags)
      bestScore = Math.max(bestScore, 0.68)
    }
  }

  if (!matchedFields.length) {
    return { score: 0.42, matchedFields: ['模糊匹配'] }
  }

  return { score: Math.min(1, bestScore), matchedFields: [...new Set(matchedFields)] }
}

export function buildRetrievalHits(products: Product[], query: string): RetrievalHit[] {
  return products
    .map((product) => {
      const { score, matchedFields } = explainProductMatch(product, query)
      return {
        id: product.id,
        kind: 'product' as const,
        title: product.name,
        score,
        matchedFields
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function formatMatchExplain(hit: Pick<RetrievalHit, 'score' | 'matchedFields'>): string {
  const fields = hit.matchedFields.join('、')
  return `命中 ${fields} · 相关度 ${(hit.score * 100).toFixed(0)}%`
}

/** 路由 3 原型：外网整合答案 mock（Phase 1 占位，Phase 3 接真实 adapter） */
export function mockExternalAnswer(query: string): { summary: string; sources: { title: string; url: string }[] } {
  return {
    summary: `基于公开外网信息对「${query}」的整理：相关政策与市场动态仍在变化，以下结论仅供辅助参考，采购决策请以平台内可验证数据为准。`,
    sources: [
      { title: '行业政策速递（外网）', url: 'https://example.com/policy' },
      { title: '市场资讯摘要（外网）', url: 'https://example.com/market' }
    ]
  }
}
