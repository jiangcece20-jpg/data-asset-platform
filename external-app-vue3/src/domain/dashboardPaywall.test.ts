import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import {
  canConfigureDashboardPaywall,
  emptyPaywallSelection,
  fieldConfigurable,
  fieldEffectivelyMasked,
  FREIGHT_PAYWALL_CATALOG,
  setButtonFreeAttempts,
  syncedPaywallCatalogOf,
  toggleButton,
  toggleField,
  toggleModule
} from './dashboardPaywall'

function product(patch: Partial<Product> = {}): Product {
  return {
    id: 'prod-freight-index',
    type: 'dashboard',
    origin: 'app_content',
    dealChannel: 'app_payment',
    acquisitions: ['item_purchase'],
    typeDetail: {},
    ...patch
  } as Product
}

describe('canConfigureDashboardPaywall', () => {
  it('allows owned paid dashboards only', () => {
    expect(canConfigureDashboardPaywall(product())).toBe(true)
    expect(canConfigureDashboardPaywall(product({ acquisitions: ['free'] }))).toBe(false)
    expect(canConfigureDashboardPaywall(product({ origin: 'trusted_space', dealChannel: 'space_purchase' }))).toBe(false)
    expect(canConfigureDashboardPaywall(product({ origin: 'seller_market' }))).toBe(false)
    expect(canConfigureDashboardPaywall(product({ type: 'report' }))).toBe(false)
  })
})

describe('paywall selection', () => {
  const catalog = FREIGHT_PAYWALL_CATALOG

  it('starts with nothing masked', () => {
    expect(emptyPaywallSelection()).toEqual({
      maskedModuleIds: [],
      maskedFieldKeys: [],
      maskedButtons: []
    })
  })

  it('masks a whole module and treats its fields as not separately configurable', () => {
    const next = toggleModule(emptyPaywallSelection(), 'freight-index')
    expect(next.maskedModuleIds).toEqual(['freight-index'])
    expect(fieldConfigurable(next, 'freight-index')).toBe(false)
    expect(fieldEffectivelyMasked(next, 'freight-index', 'index')).toBe(true)
    expect(fieldConfigurable(next, 'freight-trend')).toBe(true)
  })

  it('ignores field and button toggles while the module is masked', () => {
    const moduleOn = toggleModule(emptyPaywallSelection(), 'freight-index')
    expect(toggleField(moduleOn, 'freight-index', 'index')).toEqual(moduleOn)
    expect(toggleButton(moduleOn, 'freight-index', 'query')).toEqual(moduleOn)
  })

  it('masks a single field when the module is not selected', () => {
    const next = toggleField(emptyPaywallSelection(), 'freight-index', 'insight')
    expect(next.maskedFieldKeys).toEqual(['freight-index:insight'])
    expect(fieldEffectivelyMasked(next, 'freight-index', 'insight')).toBe(true)
    expect(fieldEffectivelyMasked(next, 'freight-index', 'index')).toBe(false)
  })

  it('stores free attempts on a masked button', () => {
    const masked = toggleButton(emptyPaywallSelection(), 'freight-index', 'query')
    expect(masked.maskedButtons).toEqual([{ moduleId: 'freight-index', buttonId: 'query', freeAttempts: 0 }])
    const withQuota = setButtonFreeAttempts(masked, 'freight-index', 'query', 3)
    expect(withQuota.maskedButtons[0]?.freeAttempts).toBe(3)
    expect(setButtonFreeAttempts(emptyPaywallSelection(), 'freight-index', 'query', 3).maskedButtons).toEqual([])
  })

  it('uses the synced freight catalog in the prototype', () => {
    const modules = syncedPaywallCatalogOf(product(), catalog)
    expect(modules.map((item) => item.label)).toEqual(['运价指数', '运价走势', '分层表现'])
    expect(modules[0]?.fields.map((item) => item.label)).toEqual(['指数', '较上期', '解读'])
    expect(modules[0]?.buttons.map((item) => item.label)).toEqual(['查询'])
  })

  it('derives module-scoped fields from dashboard panels and metrics', () => {
    const modules = syncedPaywallCatalogOf(
      product({
        id: 'prod-highway-index',
        typeDetail: {
          dashboard: {
            metrics: [
              { name: '景气指数', definition: '', formula: '', dimensions: [], preview: 'visible' },
              { name: '运力供需比', definition: '', formula: '', dimensions: [], preview: 'masked' },
              { name: '重点线路运价', definition: '', formula: '', dimensions: [], preview: 'masked' }
            ],
            panels: [
              { id: 'panel-trend', title: '景气指数走势', chartType: 'line', preview: 'visible', summary: '' },
              { id: 'panel-region', title: '区域运力供需对比', chartType: 'bar', preview: 'masked', summary: '' },
              { id: 'panel-kpi', title: '本周核心指标', chartType: 'number', preview: 'masked', summary: '' }
            ],
            timeRange: '',
            updateCycle: '',
            exportRule: ''
          }
        }
      })
    )
    expect(modules.map((item) => item.label)).toEqual(['景气指数走势', '区域运力供需对比', '本周核心指标'])
    expect(modules[0]?.fields).toEqual([{ id: 'metric-0', label: '景气指数' }])
    expect(modules[1]?.fields).toEqual([{ id: 'metric-1', label: '运力供需比' }])
    expect(modules[2]?.fields).toEqual([{ id: 'metric-2', label: '重点线路运价' }])
    expect(modules[0]?.buttons).toEqual([{ id: 'filter', label: '筛选' }])
    expect(modules[2]?.buttons).toEqual([{ id: 'query', label: '查询' }])
  })
})
