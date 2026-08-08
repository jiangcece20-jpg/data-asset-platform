import type { LocationQuery, LocationQueryValue } from 'vue-router'

export type MineMenu = 'orders' | 'data' | 'vip' | 'messages' | 'favorites' | 'profile'
export type OrderTab = 'vip' | 'buy' | 'view'
export type DataTab = 'purchased' | 'produced'
export type MineSubject = 'personal' | 'enterprise'

export interface MineQueryState {
  menu: MineMenu
  orderTab: OrderTab
  dataTab: DataTab
  subject?: MineSubject
}

const MENUS: MineMenu[] = ['orders', 'data', 'vip', 'messages', 'favorites', 'profile']
const ORDER_TABS: OrderTab[] = ['vip', 'buy', 'view']
const DATA_TABS: DataTab[] = ['purchased', 'produced']

function first(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '')
  return value == null ? '' : String(value)
}

function asMenu(value: string): MineMenu | undefined {
  return MENUS.includes(value as MineMenu) ? (value as MineMenu) : undefined
}

function asOrderTab(value: string): OrderTab | undefined {
  return ORDER_TABS.includes(value as OrderTab) ? (value as OrderTab) : undefined
}

function asDataTab(value: string): DataTab | undefined {
  return DATA_TABS.includes(value as DataTab) ? (value as DataTab) : undefined
}

export function parseMineQuery(query: LocationQuery): MineQueryState {
  const menuFromQuery = asMenu(first(query.menu))
  const legacyTab = first(query.tab)
  let menu: MineMenu = menuFromQuery ?? 'orders'
  if (!menuFromQuery) {
    if (legacyTab === 'data' || legacyTab === '我的数据') menu = 'data'
    else if (legacyTab === '求上架') menu = 'favorites' // 显式落到占位入口，避免静默当 orders
    else menu = 'orders'
  }

  const orderTab = asOrderTab(first(query.orderTab)) ?? 'buy'
  const dataTab = asDataTab(first(query.dataTab)) ?? 'purchased'
  const subjectRaw = first(query.subject)
  const subject = subjectRaw === 'personal' || subjectRaw === 'enterprise' ? subjectRaw : undefined

  return { menu, orderTab, dataTab, subject }
}

export function mineQueryPatch(
  next: Partial<MineQueryState>,
  currentQuery: LocationQuery
): Record<string, string | undefined> {
  const current = parseMineQuery(currentQuery)
  const merged: MineQueryState = {
    menu: next.menu ?? current.menu,
    orderTab: next.orderTab ?? current.orderTab,
    dataTab: next.dataTab ?? current.dataTab,
    subject: next.subject !== undefined ? next.subject : current.subject
  }

  const patch: Record<string, string | undefined> = {
    ...Object.fromEntries(
      Object.entries(currentQuery).map(([k, v]) => [k, Array.isArray(v) ? String(v[0] ?? '') : v == null ? undefined : String(v)])
    ),
    menu: merged.menu,
    orderTab: merged.menu === 'orders' ? merged.orderTab : undefined,
    dataTab: merged.menu === 'data' ? merged.dataTab : undefined,
    tab: undefined,
    subject: merged.subject
  }
  return patch
}
