import type { Product } from '@/types/domain'
import type { Resource } from '@/types/resource'

export function publicDatasetEntry(product: Product, client: 'app' | 'portal') {
  return {
    path: `/${client}/data-prepare/datasets/public`,
    query: { category: 'public', resource: product.resourceId, product: product.id }
  }
}

export function isPublicDatasetEntry(product: Product, resource?: Resource): boolean {
  // Source metadata survives cancellation of the mutable public flag.
  return product.type === 'dataset' && (product.publicDataset === true
    || resource?.publicDatasetMetadata !== undefined
    || (product.price.model === 'member_free' && resource?.sourcePublicDataset !== undefined))
}

export function publicDatasetUseIssue(product: Product | undefined, resource: Resource | undefined, identity: {
  loggedIn: boolean
  enterpriseAuthenticated: boolean
  activeEnterpriseMember: boolean
  hasTeamMembership: boolean
}): string | undefined {
  if (!product || product.type !== 'dataset' || product.origin !== 'asset_platform'
    || !resource || resource.type !== 'dataset' || resource.origin !== 'asset_platform'
    || resource.id !== product.resourceId) return '公开数据集不可用：未找到对应源数据集。'
  if (resource.sourcePublicDataset !== true) return '公开数据集不可用：源端已取消公开。'
  if (resource.sourceDatasetAvailable !== true) return '公开数据集不可用：源端数据暂不可用。'
  if (product.availability !== 'published' || product.status !== 'published') return '公开数据集不可用：商品尚未发布或已下架。'
  if (product.serviceStatus === 'suspended' || product.serviceStatus === 'terminated') return '公开数据集不可用：服务已暂停或终止。'
  if (!identity.loggedIn || !identity.enterpriseAuthenticated || !identity.activeEnterpriseMember) {
    return '当前身份不可用：请以当前企业的有效成员身份登录。'
  }
  if (!identity.hasTeamMembership) return '当前身份不可用：需要有效的企业会员。'
  return undefined
}

export function isPurchasedDataset(product: Product): boolean {
  return product.type === 'dataset' && !product.publicDataset
    && product.dealChannel !== 'space_purchase'
    && ['asset_platform', 'app_content', 'seller_market'].includes(product.origin)
}

export function purchasedDatasetRetentionNotice(product: Product, updateServiceExpired: boolean): string | undefined {
  if (!isPurchasedDataset(product) || ['suspended', 'terminated'].includes(product.serviceStatus)) return undefined
  if (updateServiceExpired) return '更新服务已到期，保留服务期内最后一次成功交付的快照，按原授权继续使用，不再更新。'
  if (product.availability === 'delisted' || product.status === 'delisted') {
    return '商品已下架，已交付数据仍可按原授权使用；是否继续更新按商品约定及实际履约情况判断。'
  }
  if (product.serviceStatus === 'degraded') return '后续更新异常，保留最近成功交付的数据，按原授权继续使用。'
  return undefined
}

export function purchasedDatasetEntry(productId: string, client: 'app' | 'portal', orderId?: string) {
  return { path: `/${client}/data-prepare/datasets`, query: { tab: 'purchased', product: productId, ...(orderId ? { order: orderId } : {}) } }
}
