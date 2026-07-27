import { defineStore } from 'pinia'
import { evaluateTrustedPurchase } from '@/domain/trustedSpacePolicy'
import { trustedSpaceAdapter, type TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type {
  SpaceBindingStatus,
  TrustedProductSnapshot,
  TrustedPurchaseCheck
} from '@/types/trustedSpace'
import type { EnterpriseAuthStatus } from '@/types/domain'
import { useCatalogStore } from './catalog'

const MAX_SNAPSHOT_AGE_MS = 30 * 60 * 1000

export const useTrustedSpaceCatalogStore = defineStore('trusted-space-catalog', {
  state: () => ({
    snapshots: [] as TrustedProductSnapshot[],
    cursor: undefined as string | undefined,
    syncing: false,
    lastSuccessAt: undefined as string | undefined,
    error: ''
  }),
  getters: {
    byProductId(state) {
      return (appProductId: string) => state.snapshots.find((snapshot) => snapshot.appProductId === appProductId)
    }
  },
  actions: {
    async syncAll(adapter: TrustedSpaceAdapter = trustedSpaceAdapter): Promise<void> {
      this.syncing = true
      this.error = ''
      this.cursor = undefined

      try {
        let cursor: string | undefined
        do {
          const response = await adapter.syncProducts(cursor)
          response.items.forEach((snapshot) => this.upsertSnapshot(snapshot))
          cursor = response.nextCursor
          this.cursor = cursor
        } while (cursor)

        this.lastSuccessAt = this.snapshots.reduce<string | undefined>((latest, snapshot) => {
          return !latest || snapshot.syncedAt > latest ? snapshot.syncedAt : latest
        }, undefined)
      } catch (error) {
        this.markSnapshotsSyncFailed()
        this.error = error instanceof Error ? error.message : '空间商品同步失败'
      } finally {
        this.syncing = false
      }
    },
    async refreshProduct(appProductId: string, adapter: TrustedSpaceAdapter = trustedSpaceAdapter): Promise<void> {
      const current = this.byProductId(appProductId)
      const spaceProductNo = current?.spaceProductNo ?? useCatalogStore().byId(appProductId)?.spaceProductNo
      if (!spaceProductNo) return

      this.syncing = true
      this.error = ''
      try {
        const snapshot = await adapter.getProduct(spaceProductNo)
        if (!snapshot) {
          if (current) current.syncState = 'unavailable'
          return
        }
        this.upsertSnapshot(snapshot)
        this.lastSuccessAt = snapshot.syncedAt
      } catch (error) {
        if (current) current.syncState = 'sync_failed'
        this.error = error instanceof Error ? error.message : '空间商品刷新失败'
      } finally {
        this.syncing = false
      }
    },
    purchaseCheck(
      appProductId: string,
      enterpriseAuthStatus: EnterpriseAuthStatus,
      bindingStatus: SpaceBindingStatus,
      now = new Date().toISOString()
    ): TrustedPurchaseCheck {
      return evaluateTrustedPurchase({
        enterpriseAuthStatus,
        bindingStatus,
        snapshot: this.byProductId(appProductId),
        now,
        maxAgeMs: MAX_SNAPSHOT_AGE_MS
      })
    },
    upsertSnapshot(snapshot: TrustedProductSnapshot) {
      const index = this.snapshots.findIndex((item) => item.appProductId === snapshot.appProductId)
      if (index >= 0 && this.snapshots[index].version > snapshot.version) return

      const next = { ...snapshot, price: { ...snapshot.price } }
      if (index >= 0) this.snapshots[index] = next
      else this.snapshots.push(next)
      useCatalogStore().applyTrustedSnapshot(next)
    },
    markSnapshotsSyncFailed() {
      this.snapshots.forEach((snapshot) => { snapshot.syncState = 'sync_failed' })
    }
  }
})
