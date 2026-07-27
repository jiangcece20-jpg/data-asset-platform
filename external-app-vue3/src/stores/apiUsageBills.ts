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
    error: ''
  }),
  getters: {
    visibleBills(state) {
      return (memberId: string, role: EnterpriseRole): ApiUsageBillView[] => (
        state.rawBills.map((bill) => toBillView(bill, memberId, role, state.stale))
      )
    },
    billDetail(state) {
      return (spaceBillId: string, memberId: string, role: EnterpriseRole): ApiUsageBillView | undefined => {
        const bill = state.rawBills.find((item) => item.spaceBillId === spaceBillId)
        return bill ? toBillView(bill, memberId, role, state.stale) : undefined
      }
    }
  },
  actions: {
    async syncBills(
      appEnterpriseId: string,
      spaceEnterpriseId: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<void> {
      this.syncing = true
      this.error = ''

      try {
        const bills = await adapter.listUsageBills(spaceEnterpriseId)
        this.rawBills = bills
          .filter((bill) => bill.appEnterpriseId === appEnterpriseId && bill.spaceEnterpriseId === spaceEnterpriseId)
          .map(cloneBill)
        this.lastSuccessAt = this.rawBills.reduce<string | undefined>((latest, bill) => {
          return !latest || bill.syncedAt > latest ? bill.syncedAt : latest
        }, undefined)
        this.stale = false
      } catch (error) {
        this.stale = true
        this.error = error instanceof Error ? error.message : '空间账单同步失败'
        throw error
      } finally {
        this.syncing = false
      }
    },
    async download(
      spaceBillId: string,
      _memberId: string,
      role: EnterpriseRole,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<string | undefined> {
      if (role !== 'admin' || !this.rawBills.some((bill) => bill.spaceBillId === spaceBillId)) return undefined
      return adapter.createBillDownloadLink(spaceBillId)
    },
    async support(
      spaceBillId: string,
      returnUrl: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<string> {
      return adapter.createBillSupportLink(spaceBillId, returnUrl)
    }
  }
})

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
