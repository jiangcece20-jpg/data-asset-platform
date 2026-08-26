import { defineStore } from 'pinia'
import { seedProducts } from '@/data/seed'
import { mockProducts } from '@/data/mockProducts'
import { seedResources, unlistedResources, userViewResources } from '@/data/resources'
import type { Product, ProductStatus, AvailabilityStatus, DashboardDetail, ReportDetail } from '@/types/domain'
import type { Resource, ListResourceForm, ResourceTypeDetail } from '@/types/resource'
import type { ServiceStatus } from '@/types/reverseFlow'
import type { TrustedProductSnapshot } from '@/types/trustedSpace'
import { genId, now } from '@/utils/id'
import { matchesOpsFilter, matchesVenueFilter } from '@/domain/productListChips'
import { coerceUpdateFrequency } from '@/domain/updateFrequency'

function cloneTypeDetail(detail: ResourceTypeDetail): ResourceTypeDetail {
  return JSON.parse(JSON.stringify(detail)) as ResourceTypeDetail
}

function cloneProducts(): Product[] {
  return [...seedProducts, ...mockProducts].map((p) => ({
    ...p,
    updateFrequency: coerceUpdateFrequency(p.updateFrequency),
    scenarios: [...(p.scenarios || [])],
    tags: [...(p.tags || [])],
    acquisitions: [...(p.acquisitions || [])],
    spaceMeta: p.spaceMeta ? { ...p.spaceMeta } : undefined
  }))
}

function cloneResources(): Resource[] {
  return [...seedResources, ...unlistedResources, ...userViewResources].map((r) => ({
    ...r,
    typeDetail: cloneTypeDetail(r.typeDetail)
  }))
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    products: cloneProducts(),
    resources: cloneResources()
  }),
  getters: {
    discoverable(state): Product[] {
      // 前台只展示已经完成商品包装、审核并发布的商品。
      return state.products.filter((p) => p.availability === 'published' && p.status === 'published')
    },
    published(state): Product[] {
      return state.products.filter((p) => p.availability === 'published')
    },
    byId(state) {
      return (id: string) => state.products.find((p) => p.id === id)
    },
    resourceById(state) {
      return (id: string) => state.resources.find((r) => r.id === id)
    },
    productForResource(state) {
      return (resourceId: string) => state.products.find((p) => p.resourceId === resourceId)
    },
    internalViews(state) {
      return (enterpriseId?: string) =>
        state.resources.filter(
          (r) => r.type === 'user_view' && r.origin === 'user_created' && (!enterpriseId || r.enterpriseId === enterpriseId)
        )
    },
    enhancementOf(state) {
      return (productId: string) => {
        const p = state.products.find((x) => x.id === productId)
        if (!p || (!p.recommendText && !p.sortWeight && !p.recommendSlot)) return undefined
        return { productId, recommendText: p.recommendText || '', tags: p.tags, sortWeight: p.sortWeight ?? 50, recommendSlot: p.recommendSlot ?? false }
      }
    },
    recommendSlotProducts(state): Product[] {
      return state.products.filter((p) => p.availability === 'published' && (p.recommendSlot || p.tags.includes('热门')))
    }
  },
  actions: {
    listResource(resourceId: string, form: ListResourceForm) {
      const resource = this.resources.find((r) => r.id === resourceId)
      if (!resource) throw new Error('资源不存在')
      if (resource.type === 'user_view') throw new Error('用数视图不可上架')
      if (this.products.some((p) => p.resourceId === resourceId)) throw new Error('该资源已有上架商品')
      if (resource.origin === 'asset_platform' && (resource.assetStatus !== 'published' || !resource.commercializable)) {
        throw new Error('仅已上架且允许商业化的资产可包装为商品')
      }

      const product: Product = {
        id: genId('prod'),
        resourceId,
        name: form.name,
        subtitle: form.subtitle,
        type: resource.type as Product['type'],
        origin: resource.origin,
        dealChannel: resource.type === 'api' || resource.origin === 'trusted_space' ? 'space_purchase' : 'app_payment',
        availability: 'preparing',
        acquisitions: form.acquisitions,
        scenarios: form.scenarios,
        provider:
          resource.origin === 'asset_platform'
            ? '万联数据资产平台'
            : resource.origin === 'seller_market'
              ? '入驻商家'
              : resource.origin === 'trusted_space'
                ? '可信空间'
                : 'APP 自营内容',
        coverage: '',
        updateFrequency: '',
        qualityPromise: '',
        complianceNote: '',
        price: form.price,
        salePeriodMonths: 12,
        datasetOffers: resource.type === 'dataset' ? [
          { id: genId('offer-personal'), name: '个人单品', subject: 'personal', price: form.price.itemPrice ?? 100, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'personal', allowDownload: false, deliveryMode: 'snapshot' },
          { id: genId('offer-enterprise'), name: '企业单品', subject: 'enterprise', price: (form.price.itemPrice ?? 100) * 10, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'enterprise_wide', allowDownload: false, deliveryMode: 'snapshot' }
        ] : undefined,
        assetSnapshot: resource.origin === 'asset_platform' ? {
          resourceId: resource.id,
          assetVersion: resource.assetVersion || 'unknown',
          syncedAt: resource.lastSyncedAt || now(),
          lastCheckedAt: resource.lastCheckedAt || now(),
          changeRisk: resource.changeRisk || 'none',
          changeSummary: resource.changeSummary
        } : undefined,
        status: 'draft',
        tags: form.tags,
        description: '',
        valueProposition: '',
        deliveryMethod: '',
        memberIncluded: false,
        listedAt: now(),
        updatedAt: now(),
        typeDetail: cloneTypeDetail(resource.typeDetail),
        serviceStatus: 'normal'
      }
      this.products.push(product)
      return product
    },
    submitProductReview(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product || product.status !== 'draft') throw new Error('仅草稿商品可提交审核')
      product.status = 'pending_approval'
      product.availability = 'preparing'
      product.updatedAt = now()
      return product
    },
    approveAndPublishProduct(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product || product.status !== 'pending_approval') throw new Error('仅待审核商品可审批发布')
      product.status = 'published'
      product.availability = 'published'
      product.listedAt = now()
      product.updatedAt = now()
      return product
    },
    publishProduct(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product) throw new Error('商品不存在')
      if (product.availability === 'published') throw new Error('商品已上架')
      if (product.availability === 'paused') throw new Error('请先恢复销售')
      product.status = 'published'
      product.availability = 'published'
      product.listedAt = now()
      product.updatedAt = now()
      return product
    },
    pauseProduct(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product || product.availability !== 'published') throw new Error('仅已上架商品可暂停新购')
      product.availability = 'paused'
      product.status = 'published'
      product.updatedAt = now()
      return product
    },
    resumeProduct(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product || product.availability !== 'paused') throw new Error('仅暂停新购的商品可恢复销售')
      product.availability = 'published'
      product.status = 'published'
      product.updatedAt = now()
      return product
    },
    delistProduct(productId: string) {
      const p = this.products.find((x) => x.id === productId)
      if (!p) return
      if (p.availability !== 'published' && p.availability !== 'paused') {
        throw new Error('仅已上架或暂停新购的商品可下架')
      }
      p.availability = 'delisted'
      p.status = 'delisted'
      p.updatedAt = now()
    },
    searchInternalViews(query: string, enterpriseId?: string): Resource[] {
      const q = query.trim().toLowerCase()
      return this.resources.filter((r) => {
        if (r.type !== 'user_view' || r.origin !== 'user_created') return false
        if (enterpriseId && r.enterpriseId !== enterpriseId) return false
        if (!q) return true
        return r.resourceName.toLowerCase().includes(q)
      })
    },
    search(query: string, opts?: {
      type?: string
      dealChannel?: string
      scenario?: string
      origin?: string
      spaceName?: string
      hasSampleData?: boolean
      hasTrialApi?: boolean
      spaceKind?: 'owned' | 'federated'
      venue?: string
      ops?: string
    }): Product[] {
      const q = query.trim().toLowerCase()
      return this.discoverable.filter((p) => {
        if (opts?.type && p.type !== opts.type) return false
        if (opts?.dealChannel && p.dealChannel !== opts.dealChannel) return false
        if (opts?.origin && p.origin !== opts.origin) return false
        if (opts?.scenario && !p.scenarios.includes(opts.scenario)) return false
        if (opts?.spaceName && p.spaceName !== opts.spaceName) return false
        if (opts?.hasSampleData !== undefined && p.hasSampleData !== opts.hasSampleData) return false
        if (opts?.hasTrialApi !== undefined && p.hasTrialApi !== opts.hasTrialApi) return false
        if (opts?.spaceKind && p.spaceKind !== opts.spaceKind) return false
        if (opts?.venue && !matchesVenueFilter(p, opts.venue)) return false
        if (opts?.ops && !matchesOpsFilter(p, opts.ops)) return false
        if (!q) return true
        const haystack = [p.name, p.subtitle, p.description, p.recommendText, p.provider, p.sellerName, ...p.tags, ...p.scenarios]
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
     * 按资源写入：未上架时只改资源；已有商品时商品与资源一并更新。
     */
    setProfilingFields(resourceId: string, fieldNames: string[]) {
      const allow = new Set(fieldNames)
      const apply = (dataset?: { fields: Array<{ name: string; profilingEnabled?: boolean }> }) => {
        if (!dataset) return
        dataset.fields = dataset.fields.map((f) => ({ ...f, profilingEnabled: allow.has(f.name) }))
      }
      const resource = this.resources.find((item) => item.id === resourceId)
      apply(resource?.typeDetail.dataset)
      if (resource) resource.updatedAt = now()
      const product = this.products.find((item) => item.resourceId === resourceId)
      apply(product?.typeDetail.dataset)
      if (product) product.updatedAt = now()
    },
    updateProduct(productId: string, patch: Partial<Product>) {
      const idx = this.products.findIndex((x) => x.id === productId)
      if (idx >= 0) {
        this.products[idx] = { ...this.products[idx], ...patch, updatedAt: now() }
      }
    },
    /**
     * 数据集关键指标（粒度/时间范围/行数/字段数）写回商品与关联资源。
     * 由运营配置，非必填；空值前台不展示。
     */
    updateDatasetMetrics(
      productId: string,
      metrics: {
        granularity?: string
        timeRange?: string
        rowCount?: number
        fieldCount?: number | null
      }
    ) {
      const product = this.products.find((item) => item.id === productId)
      if (!product?.typeDetail.dataset) return
      const next = {
        ...product.typeDetail.dataset,
        granularity: metrics.granularity,
        timeRange: metrics.timeRange,
        rowCount: metrics.rowCount,
        fieldCount: metrics.fieldCount
      }
      product.typeDetail = { ...product.typeDetail, dataset: next }
      product.updatedAt = now()

      const resource = this.resources.find((item) => item.id === product.resourceId)
      if (resource?.typeDetail.dataset) {
        resource.typeDetail = {
          ...resource.typeDetail,
          dataset: {
            ...resource.typeDetail.dataset,
            granularity: metrics.granularity,
            timeRange: metrics.timeRange,
            rowCount: metrics.rowCount,
            fieldCount: metrics.fieldCount
          }
        }
        resource.updatedAt = now()
      }
    },
    updateDashboardDetail(productId: string, detail: DashboardDetail) {
      const product = this.products.find((item) => item.id === productId)
      if (!product || product.type !== 'dashboard') return
      const cloneDetail = (): DashboardDetail => ({
        ...detail,
        metrics: detail.metrics.map((metric) => ({ ...metric, dimensions: [...metric.dimensions] })),
        panels: detail.panels.map((panel) => ({ ...panel })),
        paywallCatalog: detail.paywallCatalog?.map((module) => ({
          ...module,
          fields: module.fields.map((field) => ({ ...field })),
          buttons: module.buttons.map((button) => ({ ...button }))
        })),
        paywall: detail.paywall
          ? {
              maskedModuleIds: [...detail.paywall.maskedModuleIds],
              maskedFieldKeys: [...detail.paywall.maskedFieldKeys],
              maskedButtons: detail.paywall.maskedButtons.map((item) => ({ ...item }))
            }
          : undefined
      })
      product.typeDetail = { ...product.typeDetail, dashboard: cloneDetail() }
      product.updatedAt = now()

      const resource = this.resources.find((item) => item.id === product.resourceId)
      if (resource) {
        resource.typeDetail = { ...resource.typeDetail, dashboard: cloneDetail() }
        resource.updatedAt = now()
      }
    },
    /**
     * 报告介绍元数据同时写回商品与关联资源；目录与正文块保留现有结构，不在此覆盖。
     */
    updateReportDetail(productId: string, detail: ReportDetail) {
      const product = this.products.find((item) => item.id === productId)
      if (!product || product.type !== 'report') return
      const cloneDetail = (): ReportDetail => ({
        ...detail,
        catalog: detail.catalog.map((item) => ({ ...item })),
        blocks: detail.blocks.map((block) => ({ ...block }))
      })
      product.typeDetail = { ...product.typeDetail, report: cloneDetail() }
      product.updatedAt = now()
      if (product.entitlementPolicy?.kind === 'report_version') {
        product.entitlementPolicy = { kind: 'report_version', version: detail.version }
      }

      const resource = this.resources.find((item) => item.id === product.resourceId)
      if (resource) {
        resource.typeDetail = { ...resource.typeDetail, report: cloneDetail() }
        resource.updatedAt = now()
      }
    },
    updateEnhancement(productId: string, patch: Partial<Pick<Product, 'recommendText' | 'sortWeight' | 'recommendSlot'>> & { tags?: string[] }) {
      const p = this.products.find((x) => x.id === productId)
      if (!p) return
      if (patch.recommendText !== undefined) p.recommendText = patch.recommendText
      if (patch.sortWeight !== undefined) p.sortWeight = patch.sortWeight
      if (patch.recommendSlot !== undefined) p.recommendSlot = patch.recommendSlot
      if (patch.tags) p.tags = patch.tags
    },
    applyTrustedSnapshot(snapshot: TrustedProductSnapshot) {
      const product = this.products.find((item) => item.id === snapshot.appProductId)
      if (!product || product.dealChannel !== 'space_purchase') return
      product.name = snapshot.name
      product.provider = snapshot.provider
      product.price = { ...snapshot.price }
      if (snapshot.datasetOffers) product.datasetOffers = snapshot.datasetOffers.map((offer) => ({ ...offer }))
      if (snapshot.saleStatus === 'published') product.availability = 'published'
      if (snapshot.saleStatus === 'paused') product.availability = 'paused'
      if (snapshot.saleStatus === 'delisted') product.availability = 'delisted'
      product.spaceProductNo = snapshot.spaceProductNo
      product.spaceSyncedAt = snapshot.syncedAt
      // 空间基本信息同步（覆盖本地对应字段）
      if (snapshot.timeRange !== undefined) {
        if (product.typeDetail.dataset) product.typeDetail.dataset.timeRange = snapshot.timeRange
      }
      if (snapshot.updateFrequency !== undefined) product.updateFrequency = coerceUpdateFrequency(snapshot.updateFrequency)
      if (snapshot.deliveryMethod !== undefined) product.deliveryMethod = snapshot.deliveryMethod
      if (snapshot.description !== undefined) product.description = snapshot.description
      if (snapshot.scenarios !== undefined) product.scenarios = snapshot.scenarios
      if (snapshot.coverage !== undefined) product.coverage = snapshot.coverage
    },
    updateServiceStatus(productId: string, serviceStatus: ServiceStatus) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.serviceStatus = serviceStatus
        p.updatedAt = now()
      }
    },
    clearRecommendation(productId: string) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.recommendSlot = false
        p.tags = p.tags.filter((t) => t !== '热门')
      }
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
    },
    /** 开发态：种子/mock 变更后重载目录（保留运行时改动以外的最新元数据） */
    reloadSeedCatalog() {
      this.products = cloneProducts()
      this.resources = cloneResources()
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(['@/data/mockProducts', '@/data/seed'], () => {
    useCatalogStore().reloadSeedCatalog()
  })
}
