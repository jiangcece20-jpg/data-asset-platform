import type { ResourceOrigin } from '@/types/resource'

export const resourceManagementOrigins = { app_content: '自营产品', trusted_space: '可信空间' }

export function resourceManagementOrigin(origin: ResourceOrigin) {
  return origin === 'seller_market' ? undefined : origin === 'trusted_space' ? 'trusted_space' : 'app_content'
}

export const PRODUCT_NAME_MAX = 50

export function truncateProductName(name: string): string {
  return Array.from(name).slice(0, PRODUCT_NAME_MAX).join('')
}
