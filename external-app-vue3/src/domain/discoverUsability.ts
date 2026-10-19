import type { Product } from '@/types/domain'

export type DiscoverAccessLevel = 'member' | 'item' | 'enterprise' | 'none'

export function isDiscoverProductUsable(
  product: Product,
  context: { enterpriseAuthenticated: boolean; accessLevel: DiscoverAccessLevel; serviceExpired?: boolean }
): boolean {
  if (!context.enterpriseAuthenticated) return false
  if (product.availability !== 'published' || product.status !== 'published') return false
  const currentFree = product.publicDataset || (product.type === 'dashboard'
    && (product.price?.model === 'member_free' || product.acquisitions?.includes('free')))
  if (context.serviceExpired && !currentFree) return false
  return context.accessLevel === 'member' || context.accessLevel === 'enterprise'
}
