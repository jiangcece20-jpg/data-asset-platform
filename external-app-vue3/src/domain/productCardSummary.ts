import type { Product } from '@/types/domain'

export interface ProductCardSummary {
  lead: string
  facts: string[]
}

function firstSentence(value: string) {
  return value.trim().split(/(?<=[。！？])/u)[0]?.trim() || ''
}

function compact(values: Array<string | undefined>) {
  return [...new Set(values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value)))]
}

export function productCardSummary(product: Product): ProductCardSummary {
  const lead = firstSentence(product.description) || product.subtitle.trim() || '内容说明准备中'

  if (product.type === 'dataset') {
    const detail = product.typeDetail.dataset
    return {
      lead,
      facts: compact([
        product.coverage,
        detail?.granularity,
        product.updateFrequency,
        detail?.rowCount ? `${detail.rowCount.toLocaleString('zh-CN')} 条` : undefined
      ]).slice(0, 3)
    }
  }

  if (product.type === 'api') {
    const detail = product.typeDetail.api
    const result = detail?.responseFields
      .filter((field) => field.name !== 'requestId')
      .map((field) => field.description)
      .filter(Boolean)
      .slice(0, 2)
      .join('、')
    return {
      lead,
      facts: compact([
        result ? `返回${result}` : undefined,
        detail?.sla,
        detail?.rateLimit
      ]).slice(0, 3)
    }
  }

  return { lead, facts: [] }
}
