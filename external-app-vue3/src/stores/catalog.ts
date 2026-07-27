import { defineStore } from 'pinia'
import { seedProducts, seedEnhancements } from '@/data/seed'
import { mockProducts } from '@/data/mockProducts'
import type { Product, ProductEnhancement, ProductStatus, AvailabilityStatus } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'
import type { TrustedProductSnapshot } from '@/types/trustedSpace'
import { now } from '@/utils/id'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    products: [...seedProducts, ...mockProducts].map((p) => ({ ...p })) as Product[],
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
        // 整句子串命中（保留原行为）
        if (haystack.includes(q)) return true
        // 通用类目词：避免"…数据集/…API/…看板"把整个类目都匹配出来，只按主题词命中
        const GENERIC = new Set(['数据集', 'api', '看板', '月报', '指数', '接口', '查询', '数据', '服务', '产品', '如何', '多少', '有没有'])
        // 中文无分词：3-gram 重叠模糊匹配，使自然语气问句也能命中
        for (let i = 0; i + 3 <= q.length; i++) {
          const gram = q.slice(i, i + 3)
          if (/\s/.test(gram) || GENERIC.has(gram)) continue
          if (haystack.includes(gram)) return true
        }
        // 空格分词命中（如 "资格核验 API"），同样跳过通用类目词
        return q.split(/[\s,，、]+/).some((t) => t.length >= 2 && !GENERIC.has(t) && haystack.includes(t))
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
    /**
     * 配置数据集哪些字段对外开放单字段探查。
     * 未在 fieldNames 中的字段会被关闭，前台探查维度随之消失。
     */
    setProfilingFields(productId: string, fieldNames: string[]) {
      const p = this.products.find((x) => x.id === productId)
      const dataset = p?.typeDetail.dataset
      if (!p || !dataset) return
      const allow = new Set(fieldNames)
      dataset.fields = dataset.fields.map((f) => ({ ...f, profilingEnabled: allow.has(f.name) }))
      p.updatedAt = now()
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
    applyTrustedSnapshot(snapshot: TrustedProductSnapshot) {
      const product = this.products.find((item) => item.id === snapshot.appProductId)
      if (!product || product.dealChannel !== 'space_purchase') return
      product.name = snapshot.name
      product.provider = snapshot.provider
      product.price = { ...snapshot.price }
      if (snapshot.saleStatus === 'published') product.availability = 'published'
      if (snapshot.saleStatus === 'paused') product.availability = 'paused'
      if (snapshot.saleStatus === 'delisted') product.availability = 'delisted'
      product.spaceProductNo = snapshot.spaceProductNo
      product.spaceSyncedAt = snapshot.syncedAt
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
