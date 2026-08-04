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
    error: '',
    requestGeneration: 0,
    latestSyncGeneration: 0,
    latestStatusGeneration: 0,
    activeRequestCount: 0,
    productRequestGenerations: {} as Record<string, number>
  }),
  getters: {
    byProductId(state) {
      return (appProductId: string) => state.snapshots.find((snapshot) => snapshot.appProductId === appProductId)
    }
  },
  actions: {
    async syncAll(adapter: TrustedSpaceAdapter = trustedSpaceAdapter): Promise<void> {
      const generation = this.beginRequest()
      this.latestSyncGeneration = generation
      this.cursor = undefined

      try {
        let cursor: string | undefined
        do {
          const response = await adapter.syncProducts(cursor)
          if (generation !== this.latestSyncGeneration) return
          response.items.forEach((snapshot) => {
            if (!this.isCurrentSyncProduct(snapshot.appProductId, generation)) return
            if (this.upsertSnapshot(snapshot)) this.recordSuccess(snapshot.syncedAt)
          })
          cursor = response.nextCursor
          this.cursor = cursor
        } while (cursor)
      } catch (error) {
        if (generation === this.latestSyncGeneration) {
          this.snapshots.forEach((snapshot) => {
            if (this.isCurrentSyncProduct(snapshot.appProductId, generation)) {
              snapshot.syncState = 'sync_failed'
            }
          })
        }
        if (generation === this.latestStatusGeneration) {
          this.error = error instanceof Error ? error.message : '空间商品同步失败'
        }
      } finally {
        this.finishRequest()
      }
    },
    async refreshProduct(appProductId: string, adapter: TrustedSpaceAdapter = trustedSpaceAdapter): Promise<void> {
      const current = this.byProductId(appProductId)
      const spaceProductNo = current?.spaceProductNo ?? useCatalogStore().byId(appProductId)?.spaceProductNo
      if (!spaceProductNo) return

      const generation = this.beginRequest()
      this.productRequestGenerations[appProductId] = generation
      try {
        const snapshot = await adapter.getProduct(spaceProductNo)
        if (!this.isCurrentProductRequest(appProductId, generation)) return
        if (!snapshot) {
          const active = this.byProductId(appProductId)
          if (active) active.syncState = 'unavailable'
          return
        }
        if (snapshot.appProductId !== appProductId) {
          const active = this.byProductId(appProductId)
          if (active) active.syncState = 'unavailable'
          return
        }
        if (this.upsertSnapshot(snapshot)) this.recordSuccess(snapshot.syncedAt)
      } catch (error) {
        if (this.isCurrentProductRequest(appProductId, generation)) {
          const active = this.byProductId(appProductId)
          if (active) active.syncState = 'sync_failed'
          if (generation === this.latestStatusGeneration) {
            this.error = error instanceof Error ? error.message : '空间商品刷新失败'
          }
        }
      } finally {
        this.finishRequest()
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
      if (index >= 0 && this.snapshots[index].version > snapshot.version) return false
      const current = index >= 0 ? this.snapshots[index] : undefined
      if (
        current
        && current.version === snapshot.version
        && (
          snapshot.spaceUpdatedAt < current.spaceUpdatedAt
          || snapshot.syncedAt < current.syncedAt
        )
      ) return false

      const next = current
        && current.version === snapshot.version
        && current.spaceUpdatedAt === snapshot.spaceUpdatedAt
        ? { ...current, syncedAt: snapshot.syncedAt, syncState: snapshot.syncState }
        : { ...snapshot, price: { ...snapshot.price }, datasetOffers: snapshot.datasetOffers?.map((offer) => ({ ...offer })) }
      if (index >= 0) this.snapshots[index] = next
      else this.snapshots.push(next)
      useCatalogStore().applyTrustedSnapshot(next)
      return true
    },
    beginRequest() {
      const generation = ++this.requestGeneration
      this.latestStatusGeneration = generation
      this.activeRequestCount += 1
      this.syncing = true
      this.error = ''
      return generation
    },
    finishRequest() {
      this.activeRequestCount = Math.max(0, this.activeRequestCount - 1)
      this.syncing = this.activeRequestCount > 0
    },
    isCurrentSyncProduct(appProductId: string, generation: number) {
      return generation === this.latestSyncGeneration
        && (this.productRequestGenerations[appProductId] ?? 0) <= generation
    },
    isCurrentProductRequest(appProductId: string, generation: number) {
      return this.productRequestGenerations[appProductId] === generation
        && this.latestSyncGeneration <= generation
    },
    recordSuccess(syncedAt: string) {
      if (!this.lastSuccessAt || syncedAt > this.lastSuccessAt) this.lastSuccessAt = syncedAt
    }
  }
})
