import type {
  DashboardPaywallButton,
  DashboardPaywallField,
  DashboardPaywallModule,
  DashboardPaywallSelection,
  Product
} from '@/types/domain'

export type {
  DashboardPaywallButton,
  DashboardPaywallButtonMask,
  DashboardPaywallField,
  DashboardPaywallModule,
  DashboardPaywallSelection
} from '@/types/domain'

export const FREIGHT_PAYWALL_CATALOG: DashboardPaywallModule[] = [
  {
    id: 'freight-index',
    label: '运价指数',
    fields: [
      { id: 'index', label: '指数' },
      { id: 'wow', label: '较上期' },
      { id: 'insight', label: '解读' }
    ],
    buttons: [{ id: 'query', label: '查询' }]
  },
  {
    id: 'freight-trend',
    label: '运价走势',
    fields: [
      { id: 'series', label: '走势值' },
      { id: 'peak', label: '峰值' }
    ],
    buttons: [{ id: 'filter', label: '筛选' }]
  },
  {
    id: 'tier-perf',
    label: '分层表现',
    fields: [
      { id: 'tier', label: '分层' },
      { id: 'gap', label: '差距' }
    ],
    buttons: []
  }
]

export function emptyPaywallSelection(): DashboardPaywallSelection {
  return { maskedModuleIds: [], maskedFieldKeys: [], maskedButtons: [] }
}

export function canConfigureDashboardPaywall(product: Product | undefined, isFree?: boolean): boolean {
  if (!product || product.type !== 'dashboard') return false
  if (product.origin !== 'app_content') return false
  if (product.dealChannel !== 'app_payment') return false
  const free = isFree ?? product.acquisitions.includes('free')
  return !free
}

export function fieldKey(moduleId: string, fieldId: string): string {
  return `${moduleId}:${fieldId}`
}

export function moduleMasked(selection: DashboardPaywallSelection, moduleId: string): boolean {
  return selection.maskedModuleIds.includes(moduleId)
}

export function fieldConfigurable(selection: DashboardPaywallSelection, moduleId: string): boolean {
  return !moduleMasked(selection, moduleId)
}

export function fieldEffectivelyMasked(
  selection: DashboardPaywallSelection,
  moduleId: string,
  fieldId: string
): boolean {
  return moduleMasked(selection, moduleId) || selection.maskedFieldKeys.includes(fieldKey(moduleId, fieldId))
}

export function buttonMasked(
  selection: DashboardPaywallSelection,
  moduleId: string,
  buttonId: string
): boolean {
  if (moduleMasked(selection, moduleId)) return true
  return selection.maskedButtons.some((item) => item.moduleId === moduleId && item.buttonId === buttonId)
}

export function buttonFreeAttempts(
  selection: DashboardPaywallSelection,
  moduleId: string,
  buttonId: string
): number {
  return selection.maskedButtons.find((item) => item.moduleId === moduleId && item.buttonId === buttonId)?.freeAttempts ?? 0
}

export function toggleModule(selection: DashboardPaywallSelection, moduleId: string): DashboardPaywallSelection {
  const on = moduleMasked(selection, moduleId)
  return {
    ...selection,
    maskedModuleIds: on
      ? selection.maskedModuleIds.filter((id) => id !== moduleId)
      : [...selection.maskedModuleIds, moduleId]
  }
}

export function toggleField(
  selection: DashboardPaywallSelection,
  moduleId: string,
  fieldId: string
): DashboardPaywallSelection {
  if (!fieldConfigurable(selection, moduleId)) return selection
  const key = fieldKey(moduleId, fieldId)
  const on = selection.maskedFieldKeys.includes(key)
  return {
    ...selection,
    maskedFieldKeys: on
      ? selection.maskedFieldKeys.filter((item) => item !== key)
      : [...selection.maskedFieldKeys, key]
  }
}

export function toggleButton(
  selection: DashboardPaywallSelection,
  moduleId: string,
  buttonId: string
): DashboardPaywallSelection {
  if (!fieldConfigurable(selection, moduleId)) return selection
  const on = selection.maskedButtons.some((item) => item.moduleId === moduleId && item.buttonId === buttonId)
  return {
    ...selection,
    maskedButtons: on
      ? selection.maskedButtons.filter((item) => !(item.moduleId === moduleId && item.buttonId === buttonId))
      : [...selection.maskedButtons, { moduleId, buttonId, freeAttempts: 0 }]
  }
}

export function setButtonFreeAttempts(
  selection: DashboardPaywallSelection,
  moduleId: string,
  buttonId: string,
  freeAttempts: number
): DashboardPaywallSelection {
  const quota = Number.isFinite(freeAttempts) ? Math.max(0, Math.floor(freeAttempts)) : 0
  if (!selection.maskedButtons.some((item) => item.moduleId === moduleId && item.buttonId === buttonId)) {
    return selection
  }
  return {
    ...selection,
    maskedButtons: selection.maskedButtons.map((item) =>
      item.moduleId === moduleId && item.buttonId === buttonId ? { ...item, freeAttempts: quota } : item
    )
  }
}

export function syncedPaywallCatalogOf(
  product: Product,
  fallback: DashboardPaywallModule[] = FREIGHT_PAYWALL_CATALOG
): DashboardPaywallModule[] {
  const stored = product.typeDetail.dashboard?.paywallCatalog
  if (stored?.length) return stored
  if (product.id === 'prod-freight-index') return fallback
  return (product.typeDetail.dashboard?.panels ?? []).map((panel) => ({
    id: panel.id,
    label: panel.title,
    fields: [],
    buttons: []
  }))
}
