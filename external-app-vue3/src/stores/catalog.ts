import { defineStore } from 'pinia'
import { seedProducts, seedEnhancements } from '@/data/seed'
import type { Product, ProductEnhancement, ProductStatus, AvailabilityStatus } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'
import { now } from '@/utils/id'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    products: seedProducts.map((p) => ({ ...p })) as Product[],
    enhancements: seedEnhancements.map((e) => ({ ...e })) as ProductEnhancement[]
  }),
  getters: {
    discoverable(state): Product[] {
      return state.products.filter((p) => ['candidate', 'preparing', 'published'].includes(p.availability))
    },
    published(state): Product[] {
      return state.products.filter((p) => p.availability === 'published')
    },
    byId(state) {
      return (id: string) => state.products.find((p) => p.id === id)
    },
    enhancementOf(state) {
      return (productId: string) => state.enhancements.find((e) => e.productId === productId)
    },
    displayTitle(): (p: Product) => string {
      return (p: Product) => {
        const enh = this.enhancementOf(p.id)
        return enh?.displayTitle || p.name
      }
    },
    recommendSlotProducts(state): Product[] {
      const enhIds = new Set(state.enhancements.filter((e) => e.recommendSlot).map((e) => e.productId))
      return state.products.filter((p) => p.availability === 'published' && (enhIds.has(p.id) || p.tags.includes('热门')))
    }
  },
  actions: {
    search(query: string, opts?: { type?: string; dealChannel?: string; scenario?: string }): Product[] {
      const q = query.trim().toLowerCase()
      return this.discoverable.filter((p) => {
        if (opts?.type && p.type !== opts.type) return false
        if (opts?.dealChannel && p.dealChannel !== opts.dealChannel) return false
        if (opts?.scenario && !p.scenarios.includes(opts.scenario)) return false
        if (!q) return true
        const enh = this.enhancementOf(p.id)
        const haystack = [p.name, p.subtitle, p.description, enh?.displayTitle, enh?.recommendText, ...p.tags, ...p.scenarios]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    },
    toggleFavorite(productId: string) {
      const p = this.products.find((x) => x.id === productId)
      if (p) p.favorite = !p.favorite
    },
    // ---- 运营后台动作 ----
    updateStatus(productId: string, status: ProductStatus) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.status = status
        p.updatedAt = now()
      }
    },
    updateAvailability(productId: string, availability: AvailabilityStatus) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.availability = availability
        p.updatedAt = now()
      }
    },
    updateProduct(productId: string, patch: Partial<Product>) {
      const idx = this.products.findIndex((x) => x.id === productId)
      if (idx >= 0) {
        this.products[idx] = { ...this.products[idx], ...patch, updatedAt: now() }
      }
    },
    updateEnhancement(productId: string, patch: Partial<ProductEnhancement>) {
      const idx = this.enhancements.findIndex((x) => x.productId === productId)
      if (idx >= 0) {
        this.enhancements[idx] = { ...this.enhancements[idx], ...patch }
      } else {
        this.enhancements.push({
          productId,
          displayTitle: patch.displayTitle || this.byId(productId)?.name || '',
          recommendText: patch.recommendText || '',
          tags: patch.tags || [],
          manualDescription: patch.manualDescription || '',
          previewNote: patch.previewNote || '',
          sortWeight: patch.sortWeight ?? 50,
          recommendSlot: patch.recommendSlot ?? false
        })
      }
    },
    syncSpaceProducts() {
      this.products
        .filter((p) => p.dealChannel === 'space_purchase' && p.availability === 'published')
        .forEach((p) => {
          p.spaceSyncedAt = now()
        })
    },
    updateServiceStatus(productId: string, serviceStatus: ServiceStatus) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.serviceStatus = serviceStatus
        p.updatedAt = now()
      }
    },
    clearRecommendation(productId: string) {
      const enh = this.enhancements.find((e) => e.productId === productId)
      if (enh) enh.recommendSlot = false
      const p = this.products.find((x) => x.id === productId)
      if (p) p.tags = p.tags.filter((t) => t !== '热门')
    },
    setSalesReview(productId: string, owner: string, reviewAt: string) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.salesReviewOwner = owner
        p.salesReviewAt = reviewAt
      }
    },
    clearSalesReview(productId: string) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.salesReviewOwner = undefined
        p.salesReviewAt = undefined
      }
    }
  }
})
