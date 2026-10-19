import { defineStore } from 'pinia'
import type { DemandLead } from '@/types/domain'
import { now } from '@/utils/id'

export type DispatchOutcome = 'success' | 'failure' | 'unknown' | 'unresolved'
export interface CollectionDispatch {
  leadId: string
  status: 'pending' | 'failed' | 'sent' | 'unknown'
  payload: { id: string; title: string; budget?: number; client: string; description: string }
  attempts: number
  attemptedAt?: string
  sentAt?: string
  error?: string
  mappingError?: string
  shortened: boolean
}

function shorten(value: string, limit: number): string {
  const chars = Array.from(value)
  return chars.length <= limit ? value : chars.slice(0, limit - 1).join('') + '…'
}

export const useCollectionDispatchStore = defineStore('collectionDispatch', {
  state: () => ({
    records: [] as CollectionDispatch[],
    // Simulated receiver is separate so an unacknowledged creation can be reconciled.
    commissions: [] as Array<{ leadId: string; id: string; status?: string }>
  }),
  getters: {
    byLead: (state) => (id: string) => state.records.find((record) => record.leadId === id),
    commissionStatusByLead: (state) => (id: string) => {
      const status = state.commissions.find((commission) => commission.leadId === id)?.status
      return status?.trim() ? status : '未处理'
    }
  },
  actions: {
    create(lead: DemandLead, outcome: DispatchOutcome = 'success') {
      const existing = this.byLead(lead.id)
      if (existing?.status === 'sent') return existing
      if (lead.status !== 'new' && lead.status !== 'custom_required') throw new Error('仅待处理的定制线索可创建委托')
      // A repeated processing action first reconciles the original creation.
      if (existing && (existing.status === 'unknown' || this.commissions.some((item) => item.leadId === lead.id))) {
        this.send(lead.id, outcome)
        return existing
      }
      const title = lead.question || lead.objectDesc || '需求单'
      const description = lead.scenario || title
      const name = lead.contactName?.trim() || ''
      const company = lead.enterpriseName && lead.enterpriseName !== '个人' ? lead.enterpriseName : ''
      const client = company ? `${name}（${shorten(company, Math.max(1, 48 - Array.from(name).length))}）` : name
      const rawBudget = lead.priceRange?.trim()
      const prices = rawBudget ? rawBudget.split('-').map((part) => part.trim() ? Number(part.trim()) : NaN) : undefined
      const budget = prices?.length && prices.every((value) => Number.isFinite(value) && value >= 0)
        ? Math.max(...prices) : undefined
      const mappingError = !name || Array.from(client).length > 50 ? '联系人缺失或姓名超长，请核对后重试' :
        lead.priceRange?.trim() && budget === undefined ? '预算格式无法识别，请核对后重试' : undefined
      const record: CollectionDispatch = {
        leadId: lead.id, status: 'pending', attempts: 0, mappingError,
        payload: {
          // Prototype receiver accepts a generated ID; the source ID remains the deduplication key.
          id: existing?.payload.id || crypto.randomUUID().replaceAll('-', ''), title: shorten(title, 50), budget,
          client, description: shorten(description, 200)
        },
        shortened: Array.from(title).length > 50 || Array.from(description).length > 200 || client !== (company ? `${name}（${company}）` : name)
      }
      if (existing) {
        existing.payload = record.payload
        existing.mappingError = record.mappingError
        existing.shortened = record.shortened
      } else {
        this.records.push(record)
      }
      this.send(lead.id, outcome)
      return this.byLead(lead.id)!
    },
    send(leadId: string, outcome: DispatchOutcome = 'success') {
      const record = this.byLead(leadId)
      if (!record || record.status === 'sent') return
      record.attempts += 1
      record.attemptedAt = now()
      const existing = this.commissions.find((item) => item.leadId === leadId)
      if (existing) {
        record.status = 'sent'
        record.error = undefined
        record.sentAt = record.attemptedAt
        return
      }
      if (record.mappingError || outcome === 'failure') {
        record.status = 'failed'
        record.error = record.mappingError || '采数据暂不可达，委托创建失败，请重试'
        return
      }
      if (outcome !== 'unresolved') this.commissions.push({ leadId, id: record.payload.id, status: '未承接' })
      record.status = outcome === 'unknown' || outcome === 'unresolved' ? 'unknown' : 'sent'
      record.error = record.status === 'unknown' ? '处理暂未完成，请稍后重试' : undefined
      record.sentAt = outcome === 'success' ? record.attemptedAt : undefined
    }
  }
})
