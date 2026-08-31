import type { Product } from '@/types/domain'

/** 找数页固定样例：覆盖不同数据来源与详情页形态，不受全局推荐位排序影响。 */
export const DISCOVER_SHOWCASE_PRODUCT_IDS = [
  'prod-freight-index',
  'prod-qualification-api',
  'prod-logistics-monthly',
  'prod-personal-waybill-dataset',
  'prod-enterprise-activity',
  'prod-truck-trajectory'
] as const

export type DiscoverShowcaseProductId = (typeof DISCOVER_SHOWCASE_PRODUCT_IDS)[number]

export function discoverShowcaseProducts(products: Product[]): Product[] {
  return DISCOVER_SHOWCASE_PRODUCT_IDS
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item) && item.availability === 'published')
}
