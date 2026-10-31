import type { EvidencePreview } from './prototypeScenes'

/** Frontend demo copy assembled only from the current confirmed facts. */
export function matchSummary(evidence: EvidencePreview[]): string {
  const met = evidence.filter(e => e.state === 'met')
  const groups = new Map<string, EvidencePreview[]>()
  for (const fact of met) {
    const key = fact.demand || ''
    groups.set(key, [...(groups.get(key) || []), fact])
  }
  return [...groups].map(([demand, facts]) => {
    const clean = (value: string) => value.trim().replace(/[。；，]+$/, '')
    const content = facts.find(e => e.label === '数据内容')
    const time = facts.find(e => e.label === '时间范围')
    const route = facts.find(e => e.label === '线路方向')
    const used = new Set<EvidencePreview>()
    const parts: string[] = []
    if (content && /^包含/.test(content.fact)) {
      const topic = clean(content.fact).replace(/^包含\s*/, '').replace(/指标$/, '')
      const year = time && /^覆盖/.test(time.fact) ? clean(time.fact).replace(/^覆盖\s*/, '') : ''
      const direction = route ? clean(route.fact).replace(/^支持\s*/, '').replace(/\s*→\s*/g, '至') : ''
      parts.push(`包含 ${year || ''}${direction ? direction + '的' : ''}${topic}`)
      used.add(content)
      if (year && time) used.add(time)
      if (direction && route) used.add(route)
    }
    parts.push(...facts.filter(e => !used.has(e)).map(e => clean(e.fact)))
    return `${demand ? demand + '：' : ''}${[...new Set(parts)].join('，')}`
  }).join('；') + (met.length ? '。' : '')
}
