import type { Product, ProductType } from '@/types/domain'
import { typeMeta } from '@/utils/productMeta'

/** 列表页三槽：类型 + 成交位置 + 运营标签。事实不当标签存，芯片由字段派生。 */
export type ProductListVenue = { kind: 'space' | 'seller'; name: string }

export type ProductListOps =
  | { kind: 'status'; label: '可申请上架' | '准备中' | '暂停销售' | '已下架' }
  | { kind: 'campaign'; label: '合规首选' | '热门' }

export interface ProductListChips {
  type: ProductType
  typeLabel: string
  venue: ProductListVenue | null
  ops: ProductListOps | null
}

const FACT_OR_CAMPAIGN_TAGS = new Set([
  '空间商品',
  '数据集',
  'API',
  '入驻商家',
  '资产平台',
  '热门',
  '热门数据集',
  '会员免费',
  '免费',
  '暂停新购',
  '筹备中',
  '每日更新',
  '用数模块可用',
  '变更监控',
  '合规首选'
])

export function productListChips(product: Product): ProductListChips {
  return {
    type: product.type,
    typeLabel: typeMeta[product.type].label,
    venue: venueOf(product),
    ops: opsOf(product)
  }
}

export function productTrialChips(product: Product): string[] {
  if (product.type === 'dataset' && product.hasSampleData) return ['有样例']
  if (product.type === 'api' && product.hasTrialApi) return ['有试用接口']
  return []
}

export function productTopicTags(product: Product): string[] {
  return product.tags.filter((tag) => !FACT_OR_CAMPAIGN_TAGS.has(tag))
}

export const PLATFORM_VENUE_KEY = 'platform'

export interface ProductVenueFilter {
  key: string
  label: string
}

export function productVenueFilters(products: Product[]): ProductVenueFilter[] {
  const spaces: string[] = []
  const sellers: string[] = []
  let hasPlatform = false
  for (const product of products) {
    const venue = venueOf(product)
    if (!venue) {
      hasPlatform = true
      continue
    }
    if (venue.kind === 'space' && !spaces.includes(venue.name)) spaces.push(venue.name)
    if (venue.kind === 'seller' && !sellers.includes(venue.name)) sellers.push(venue.name)
  }
  return [
    ...(hasPlatform ? [{ key: PLATFORM_VENUE_KEY, label: '本平台' }] : []),
    ...spaces.map((name) => ({ key: `space:${name}`, label: name })),
    ...sellers.map((name) => ({ key: `seller:${name}`, label: name })),
    ...(sellers.length ? [{ key: 'seller', label: '入驻商家' }] : [])
  ]
}

export function productOpsFilters(products: Product[]): Array<'合规首选' | '热门'> {
  const found = new Set<'合规首选' | '热门'>()
  for (const product of products) {
    const ops = opsOf(product)
    if (ops?.kind === 'campaign') found.add(ops.label)
  }
  return (['合规首选', '热门'] as const).filter((label) => found.has(label))
}

export function matchesVenueFilter(product: Product, key: string): boolean {
  if (!key) return true
  const venue = venueOf(product)
  if (key === PLATFORM_VENUE_KEY) return venue === null
  if (key === 'seller') return venue?.kind === 'seller'
  if (key.startsWith('space:')) return venue?.kind === 'space' && venue.name === key.slice('space:'.length)
  if (key.startsWith('seller:')) return venue?.kind === 'seller' && venue.name === key.slice('seller:'.length)
  return true
}

export function matchesOpsFilter(product: Product, label: string): boolean {
  if (!label) return true
  return opsOf(product)?.label === label
}

function venueOf(product: Product): ProductListVenue | null {
  if (product.dealChannel === 'space_purchase') {
    const name = product.spaceName?.trim()
    return name ? { kind: 'space', name } : null
  }
  if (product.origin === 'seller_market') {
    const name = product.sellerName?.trim()
    return name ? { kind: 'seller', name } : null
  }
  return null
}

function opsOf(product: Product): ProductListOps | null {
  if (product.availability === 'candidate') return { kind: 'status', label: '可申请上架' }
  if (product.availability === 'preparing') return { kind: 'status', label: '准备中' }
  if (product.availability === 'paused') return { kind: 'status', label: '暂停销售' }
  if (product.availability === 'delisted') return { kind: 'status', label: '已下架' }
  if (product.tags.includes('合规首选')) return { kind: 'campaign', label: '合规首选' }
  if (product.recommendSlot || product.tags.includes('热门') || product.tags.includes('热门数据集')) {
    return { kind: 'campaign', label: '热门' }
  }
  return null
}
