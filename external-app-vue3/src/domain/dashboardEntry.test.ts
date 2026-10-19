import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import { dashboardEntryPath, findDashboardByAssetId } from './dashboardEntry'

function dashboard(id: string, assetId?: string): Product {
  return { id, type: 'dashboard', typeDetail: { dashboard: {
    timeRange: '', updateCycle: '', metrics: [], panels: [], exportRule: '',
    boundAssetId: assetId, mobileEntryPath: assetId ? `/app/bi/dashboard/${assetId}` : undefined,
    pcEntryPath: assetId ? `/portal/bi/dashboard/${assetId}` : undefined
  } } } as Product
}

describe('dashboard entry binding', () => {
  it('uses registered App and PC paths and falls back for legacy products', () => {
    const bound = dashboard('prod-1', 'board-1')
    expect(dashboardEntryPath(bound, 'app')).toBe('/app/bi/dashboard/board-1')
    expect(dashboardEntryPath(bound, 'portal')).toBe('/portal/bi/dashboard/board-1')
    expect(dashboardEntryPath(dashboard('prod-2'), 'app')).toBe('/app/view/prod-2')
  })

  it('resolves only dashboards for a bound source ID', () => {
    const bound = dashboard('prod-1', 'board-1')
    const other = { ...dashboard('prod-2', 'board-1'), type: 'report' } as Product
    expect(findDashboardByAssetId([other, bound], 'board-1')?.id).toBe('prod-1')
    expect(findDashboardByAssetId([bound], 'missing')).toBeUndefined()
  })
})
