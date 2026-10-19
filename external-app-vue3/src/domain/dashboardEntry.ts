import type { Product } from '@/types/domain'

export function dashboardEntryPath(product: Product, surface: 'app' | 'portal'): string {
  if (product.type === 'dashboard') {
    const detail = product.typeDetail.dashboard
    const path = surface === 'app' ? detail?.mobileEntryPath : detail?.pcEntryPath
    const prefix = surface === 'app' ? '/app/bi/dashboard/' : '/portal/bi/dashboard/'
    if (detail?.boundAssetId && path === `${prefix}${detail.boundAssetId}`) return path
  }
  return `/${surface}/view/${product.id}`
}

export function findDashboardByAssetId(products: Product[], assetId: string): Product | undefined {
  return products.find((product) => product.type === 'dashboard' && product.typeDetail.dashboard?.boundAssetId === assetId)
}
