import { defineStore } from 'pinia'
import { trustedSpaceAdapter, type TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type { ApiUsageBillLine, ApiUsageBillMirror } from '@/types/trustedSpace'

export interface ApiUsageBillView {
  spaceBillId: string
  billingMonth: string
  currency: string
  rawStatus: string
  totalAmount?: number
  visibleCalls: number
  successCalls: number
  lines: ApiUsageBillLine[]
  syncedAt: string
  stale: boolean
}

type EnterpriseRole = 'admin' | 'member'

export const useApiUsageBillsStore = defineStore('api-usage-bills', {
  state: () => ({
    rawBills: [] as ApiUsageBillMirror[],
    syncing: false,
    stale: false,
    lastSuccessAt: undefined as string | undefined,
    error: '',
    currentAppEnterpriseId: undefined as string | undefined,
    currentSpaceEnterpriseId: undefined as string | undefined,
    syncToken: 0
  }),
  getters: {
    visibleBills(state) {
      return (memberId: string, role: EnterpriseRole): ApiUsageBillView[] => state.rawBills
        .filter((bill) => belongsToCurrentEnterprise(bill, state.currentAppEnterpriseId, state.currentSpaceEnterpriseId))
        .map((bill) => toBillView(bill, memberId, role, state.stale))
        .filter((bill) => role === 'admin' || bill.lines.length > 0)
    },
    billDetail(state) {
      return (spaceBillId: string, memberId: string, role: EnterpriseRole): ApiUsageBillView | undefined => {
        const bill = state.rawBills.find((item) => (
          item.spaceBillId === spaceBillId &&
          belongsToCurrentEnterprise(item, state.currentAppEnterpriseId, state.currentSpaceEnterpriseId)
        ))
        const view = bill ? toBillView(bill, memberId, role, state.stale) : undefined
        return view && (role === 'admin' || view.lines.length > 0) ? view : undefined
      }
    }
  },
  actions: {
    async syncBills(
      appEnterpriseId: string,
      spaceEnterpriseId: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter,
      now: () => string = () => new Date().toISOString()
    ): Promise<void> {
      if (this.currentAppEnterpriseId !== appEnterpriseId || this.currentSpaceEnterpriseId !== spaceEnterpriseId) {
        this.clearBills()
        this.currentAppEnterpriseId = appEnterpriseId
        this.currentSpaceEnterpriseId = spaceEnterpriseId
      }
      const syncToken = ++this.syncToken
      this.syncing = true
      this.error = ''

      try {
        const bills = await adapter.listUsageBills(spaceEnterpriseId)
        if (syncToken !== this.syncToken) return
        this.rawBills = bills
          .filter((bill) => bill.appEnterpriseId === appEnterpriseId && bill.spaceEnterpriseId === spaceEnterpriseId)
          .map(cloneBill)
        this.lastSuccessAt = now()
        this.stale = false
      } catch (error) {
        if (syncToken === this.syncToken) {
          this.stale = true
          this.error = error instanceof Error ? error.message : '空间账单同步失败'
        }
        throw error
      } finally {
        if (syncToken === this.syncToken) this.syncing = false
      }
    },
    async download(
      spaceBillId: string,
      _memberId: string,
      role: EnterpriseRole,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<string | undefined> {
      if (role !== 'admin' || !this.billDetail(spaceBillId, _memberId, role)) return undefined
      return adapter.createBillDownloadLink(spaceBillId)
    },
    async support(
      spaceBillId: string,
      memberId: string,
      role: EnterpriseRole,
      returnUrl: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<string | undefined> {
      if (!this.billDetail(spaceBillId, memberId, role)) return undefined
      return adapter.createBillSupportLink(spaceBillId, returnUrl)
    },
    clearBills() {
      this.syncToken += 1
      this.rawBills = []
      this.syncing = false
      this.stale = false
      this.lastSuccessAt = undefined
      this.error = ''
      this.currentAppEnterpriseId = undefined
      this.currentSpaceEnterpriseId = undefined
    }
  }
})

function belongsToCurrentEnterprise(
  bill: ApiUsageBillMirror,
  appEnterpriseId: string | undefined,
  spaceEnterpriseId: string | undefined
) {
  return bill.appEnterpriseId === appEnterpriseId && bill.spaceEnterpriseId === spaceEnterpriseId
}

function toBillView(
  bill: ApiUsageBillMirror,
  memberId: string,
  role: EnterpriseRole,
  stale: boolean
): ApiUsageBillView {
  const lines = role === 'admin'
    ? bill.lines.map((line) => ({ ...line }))
    : bill.lines.filter((line) => line.ownerMemberId === memberId).map((line) => ({ ...line }))

  return {
    spaceBillId: bill.spaceBillId,
    billingMonth: bill.billingMonth,
    currency: bill.currency,
    rawStatus: bill.rawStatus,
    ...(role === 'admin' ? { totalAmount: bill.totalAmount } : {}),
    visibleCalls: role === 'admin' ? bill.totalCalls : sum(lines, 'calls'),
    successCalls: role === 'admin' ? bill.successCalls : sum(lines, 'successCalls'),
    lines,
    syncedAt: bill.syncedAt,
    stale
  }
}

function sum(lines: ApiUsageBillLine[], key: 'calls' | 'successCalls') {
  return lines.reduce((total, line) => total + line[key], 0)
}

function cloneBill(bill: ApiUsageBillMirror): ApiUsageBillMirror {
  return { ...bill, lines: bill.lines.map((line) => ({ ...line })) }
}
