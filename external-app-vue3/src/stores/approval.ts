import { defineStore } from 'pinia'
import { seedApprovals } from '@/data/seed'
import type { ApprovalRecord } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'

export const useApprovalStore = defineStore('approval', {
  state: () => ({
    list: seedApprovals.map((a) => ({ ...a, checklist: a.checklist.map((c) => ({ ...c })), timeline: a.timeline.map((t) => ({ ...t })) })) as ApprovalRecord[]
  }),
  getters: {
    byProduct(state) {
      return (productId: string) => state.list.find((a) => a.productId === productId)
    },
    pending(state): ApprovalRecord[] {
      return state.list.filter((a) => a.conclusion === 'pending')
    }
  },
  actions: {
    submit(productId: string, checklist: { item: string; passed: boolean | null; note: string }[]) {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      if (!product) return
      const existing = this.byProduct(productId)
      const entry = { time: now(), actor: '商品运营', action: '提交审批' }
      if (existing) {
        existing.checklist = checklist
        existing.conclusion = 'pending'
        existing.timeline.push(entry)
      } else {
        this.list.push({
          id: genId('appr'),
          productId,
          productName: product.name,
          productType: product.type,
          checklist,
          conclusion: 'pending',
          reason: '',
          reviewer: '待分配',
          timeline: [entry]
        })
      }
      catalog.updateStatus(productId, 'pending_approval')
    },
    decide(recordId: string, conclusion: 'approved' | 'rejected', reason: string, reviewer: string) {
      const record = this.list.find((x) => x.id === recordId)
      if (!record) return
      record.conclusion = conclusion
      record.reason = reason
      record.reviewer = reviewer
      record.timeline.push({ time: now(), actor: reviewer, action: conclusion === 'approved' ? '审批通过' : '审批驳回', note: reason })
      const catalog = useCatalogStore()
      catalog.updateStatus(record.productId, conclusion === 'approved' ? 'pending_publish' : 'rejected')
    },
    publish(productId: string) {
      const catalog = useCatalogStore()
      catalog.updateStatus(productId, 'published')
      catalog.updateAvailability(productId, 'published')
      const record = this.byProduct(productId)
      if (record) record.timeline.push({ time: now(), actor: '商品运营', action: '正式发布' })
    }
  }
})
