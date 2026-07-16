import { defineStore } from 'pinia'
import { seedTrials } from '@/data/seed'
import type { TrialApplication } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'
import { useUserStore } from './user'

export const useTrialStore = defineStore('trials', {
  state: () => ({
    list: seedTrials.map((t) => ({ ...t })) as TrialApplication[]
  }),
  getters: {
    byProduct(state) {
      return (productId: string) => state.list.find((t) => t.productId === productId)
    },
    pendingApplications(state): TrialApplication[] {
      return state.list.filter((t) => t.status === 'pending')
    }
  },
  actions: {
    apply(productId: string, mode: 'self_service' | 'apply', enterpriseId?: string) {
      const catalog = useCatalogStore()
      const user = useUserStore()
      const product = catalog.byId(productId)
      const existing = this.byProduct(productId)
      if (existing) {
        existing.status = mode === 'self_service' ? 'approved' : 'pending'
        existing.appliedAt = now()
        return existing
      }
      const trial: TrialApplication = {
        id: genId('trial'),
        productId,
        productName: product?.name || productId,
        mode,
        enterpriseId,
        ownerId: user.context.currentMemberId,
        status: mode === 'self_service' ? 'approved' : 'pending',
        quota: mode === 'self_service' ? 999 : 50,
        usedQuota: 0,
        appliedAt: now()
      }
      this.list.push(trial)
      return trial
    },
    approve(trialId: string) {
      const t = this.list.find((x) => x.id === trialId)
      if (t) {
        t.status = 'approved'
        t.decidedAt = now()
      }
    },
    reject(trialId: string) {
      const t = this.list.find((x) => x.id === trialId)
      if (t) {
        t.status = 'rejected'
        t.decidedAt = now()
      }
    },
    consumeQuota(trialId: string, count = 1) {
      const t = this.list.find((x) => x.id === trialId)
      if (!t) return
      t.usedQuota = Math.min(t.quota, t.usedQuota + count)
      if (t.usedQuota >= t.quota) t.status = 'exhausted'
    }
  }
})
