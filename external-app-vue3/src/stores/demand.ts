import { defineStore } from 'pinia'
import { seedDemands } from '@/data/seed'
import type { DemandLead, DemandStatus } from '@/types/domain'
import { genId, now } from '@/utils/id'

export interface DemandSubmitPayload {
  question: string
  filters: string[]
  browsedProductIds: string[]
  objectDesc: string
  region: string
  timeRange: string
  updateFreq: string
  scenario: string
  expectedDelivery: string
}

export const useDemandStore = defineStore('demand', {
  state: () => ({
    list: seedDemands.map((d) => ({ ...d })) as DemandLead[]
  }),
  actions: {
    submit(payload: DemandSubmitPayload) {
      const lead: DemandLead = {
        id: genId('demand'),
        ...payload,
        status: 'new',
        recommendedProductIds: [],
        feedbackMessage: '',
        createdAt: now()
      }
      this.list.push(lead)
      return lead
    },
    updateStatus(id: string, status: DemandStatus, feedbackMessage?: string, recommendedProductIds?: string[]) {
      const lead = this.list.find((x) => x.id === id)
      if (!lead) return
      lead.status = status
      if (feedbackMessage !== undefined) lead.feedbackMessage = feedbackMessage
      if (recommendedProductIds) lead.recommendedProductIds = recommendedProductIds
    }
  }
})
