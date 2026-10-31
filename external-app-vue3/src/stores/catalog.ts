import { defineStore } from 'pinia'
import { seedProducts } from '@/data/seed'
import { mockProducts } from '@/data/mockProducts'
import { seedResources, unlistedResources, userViewResources } from '@/data/resources'
import type { Product, ProductStatus, AvailabilityStatus, DashboardDetail, ReportDetail, DatasetField } from '@/types/domain'
import type { Resource, ListResourceForm, ResourceTypeDetail, PublicDatasetMetadata } from '@/types/resource'
import { PUBLIC_DATASET_PROVIDER, PUBLIC_DATASET_UPDATE_FREQUENCY, applyPublicDatasetOverrides, isPublicDatasetProduct, publicDatasetDisplay, publicDatasetIssues, publicDatasetPresentation, publicDatasetRestoreIssues } from '@/domain/publicDataset'
import type { PublicDatasetDisplay } from '@/types/resource'
import type { ServiceStatus } from '@/types/reverseFlow'
import type { TrustedProductSnapshot } from '@/types/trustedSpace'
import { genId, now } from '@/utils/id'
import { matchesOpsFilter, matchesVenueFilter } from '@/domain/productListChips'
import { coerceUpdateFrequency } from '@/domain/updateFrequency'
import { groupMembers, isPackagedProduct, packCandidates, type ProductPackCandidate } from '@/domain/productGroup'
import type { ResourcePricingDraft } from '@/types/resource'
import { useOrderStore } from './orders'
import { publicUseDatasetResourceSample } from '@/data/publicUseDatasets'
import { truncateProductName } from '@/domain/resourceManagement'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'

function recordListingChange(product: Product, mode: 'manual' | 'system', action: 'publish' | 'delist') {
  product.lastListingChange = { mode, action, at: now() }
}

function assertManualListingGroup(products: Product[]) {
  if (products.some(p => p.origin === 'trusted_space') && products.some(p => p.origin !== 'trusted_space')) {
    throw new Error('不同上下架规则的商品不能联动操作')
  }
}

function cloneTypeDetail(detail: ResourceTypeDetail): ResourceTypeDetail {
  return JSON.parse(JSON.stringify(detail)) as ResourceTypeDetail
}

function assertLocalSalesControl(products: Product[], allowInitialPublication = false) {
  if (products.some(product => product.origin === 'trusted_space' && !(
    allowInitialPublication && product.availability === 'preparing' && ['draft', 'pending_approval'].includes(product.status)
  ))) throw new Error('可信空间商品销售状态由源端同步，不支持本地操作')
}

function cloneProducts(): Product[] {
  let favorites: Record<string, boolean> = {}
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('market-product-favorites-v1') || '{}')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) favorites = saved as Record<string, boolean>
  } catch { /* Unavailable or invalid storage must not prevent browsing. */ }
  return [...seedProducts, ...mockProducts].map((p) => ({
    ...p,
    favorite: typeof favorites[p.id] === 'boolean' ? favorites[p.id] : !!p.favorite,
    availability: p.availability === 'paused' ? 'delisted' : p.availability,
    status: p.status === 'paused' ? 'delisted' : p.status,
    updateFrequency: coerceUpdateFrequency(p.updateFrequency),
    scenarios: [...(p.scenarios || [])],
    tags: [...(p.tags || [])],
    acquisitions: [...(p.acquisitions || [])],
    productGroupId: p.productGroupId ?? `pgroup-${p.id}`,
    spaceMeta: p.spaceMeta ? { ...p.spaceMeta } : undefined
  }))
}

function cloneResources(): Resource[] {
  return [...seedResources, ...unlistedResources, ...userViewResources, publicUseDatasetResourceSample()].map((r) => ({
    ...r,
    pricingDraft: r.pricingDraft ? JSON.parse(JSON.stringify(r.pricingDraft)) : undefined,
    publicDatasetMetadata: r.publicDatasetMetadata ? JSON.parse(JSON.stringify(r.publicDatasetMetadata)) : undefined,
    publicDatasetOverrides: r.publicDatasetOverrides ? { ...r.publicDatasetOverrides } : undefined,
    typeDetail: cloneTypeDetail(r.typeDetail)
  }))
}

function pricingSnapshot(product: Product): Partial<Product> {
  return {
    price: { ...product.price },
    memberBenefits: product.memberBenefits?.map((item) => ({ ...item })),
    memberIncluded: product.memberIncluded,
    acquisitions: [...product.acquisitions],
    salePeriodMonths: product.salePeriodMonths,
    commerceOffers: product.commerceOffers?.map((item) => ({ ...item })),
    datasetOffers: product.datasetOffers?.map((item) => ({ ...item })),
    availability: product.availability,
    status: product.status
  }
}

function applyPaywallSnapshot(product: Product, source: Product) {
  if (product.type !== 'dashboard' || source.type !== 'dashboard') return
  const dashboard = source.typeDetail.dashboard
  if (!dashboard || !product.typeDetail.dashboard) return
  product.typeDetail = {
    ...product.typeDetail,
    dashboard: {
      ...product.typeDetail.dashboard,
      paywall: dashboard.paywall
        ? {
            maskedModuleIds: [...dashboard.paywall.maskedModuleIds],
            maskedFieldKeys: [...dashboard.paywall.maskedFieldKeys],
            maskedButtons: dashboard.paywall.maskedButtons.map((item) => ({ ...item }))
          }
        : undefined,
      paywallCatalog: dashboard.paywallCatalog?.map((module) => ({
        ...module,
        fields: module.fields.map((field) => ({ ...field })),
        buttons: module.buttons.map((button) => ({ ...button }))
      }))
    }
  }
}

export interface PublicUseDatasetSnapshot {
  resourceId: string
  name: string
  isPublic: boolean
  available: boolean
  updatedAt: string
  fields: DatasetField[]
  description?: string
  metadata?: Partial<PublicDatasetMetadata>
  detail?: Partial<NonNullable<ResourceTypeDetail['dataset']>>
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    products: cloneProducts(),
    favoriteOwnerId: '',
    favoriteSnapshots: {} as Record<string, Record<string, boolean>>,
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
    groupMembersOf(state) {
      return (productId: string) => groupMembers(state.products, productId)
    },
    productPackCandidates(state) {
      return (editorProductId: string): ProductPackCandidate[] => packCandidates(state.products, editorProductId)
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
    registerSelfDashboardResource(input: { name: string; boundAssetId: string; description: string; updateCycle: string }) {
      const name = input.name.trim()
      const boundAssetId = input.boundAssetId.trim()
      if (!name || !input.description.trim()) throw new Error('请填写看板名称和简介')
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(boundAssetId)) throw new Error('请填写有效的来源看板 ID')
      if (this.resources.some((resource) => resource.typeDetail.dashboard?.boundAssetId === boundAssetId)) throw new Error('看板已登记')
      const stamp = now()
      const resource: Resource = {
        id: genId('res-dashboard'), resourceName: name, description: input.description.trim(),
        type: 'dashboard', origin: 'app_content', createdAt: stamp, updatedAt: stamp,
        typeDetail: { dashboard: {
          timeRange: '', updateCycle: input.updateCycle.trim(), metrics: [], panels: [], exportRule: '',
          boundAssetId,
          mobileEntryPath: `/app/bi/dashboard/${boundAssetId}`,
          pcEntryPath: `/portal/bi/dashboard/${boundAssetId}`
        } }
      }
      this.resources.unshift(resource)
      return resource
    },
    syncUsePublicDatasets(snapshots: PublicUseDatasetSnapshot[]) {
      for (const snapshot of snapshots) {
        const resource = this.resources.find((item) => item.id === snapshot.resourceId)
        const detail = resource?.typeDetail.dataset ?? {
          classification: '公开数据', qualityUpdatedAt: snapshot.updatedAt, fields: [], sampleColumns: [], sampleRows: [], sampleGeneratedAt: snapshot.updatedAt,
          profiling: { completeness: '—', uniqueness: '—', nullRate: '—', distribution: '—', anomalies: '—', conclusion: '—', updatedAt: snapshot.updatedAt }
        }
        const nextDetail = {
          ...detail, ...snapshot.detail, blankOverview: true,
          granularity: '', rowCount: undefined, fieldCount: null,
          timeRange: '',
          qualityUpdatedAt: snapshot.updatedAt, dataUpdatedAt: snapshot.updatedAt, fields: snapshot.fields
        }
        const metadata = {
          ...snapshot.metadata, provider: PUBLIC_DATASET_PROVIDER, coverage: '',
          updateFrequency: PUBLIC_DATASET_UPDATE_FREQUENCY
        }
        if (resource) {
          resource.resourceName = snapshot.name
          resource.typeDetail.dataset = nextDetail
          resource.sourcePublicDataset = snapshot.isPublic
          resource.sourceDatasetAvailable = snapshot.available
          resource.assetStatus = snapshot.available ? 'published' : 'delisted'
          resource.commercializable = snapshot.isPublic && snapshot.available
          resource.lastSyncedAt = now()
          resource.updatedAt = snapshot.updatedAt
          resource.description = snapshot.description || ''
          resource.publicDatasetMetadata = metadata
          resource.publicSyncError = undefined
        } else {
          this.resources.push({
            id: snapshot.resourceId, resourceName: snapshot.name, type: 'dataset', origin: 'asset_platform',
            typeDetail: { dataset: nextDetail }, sourcePublicDataset: snapshot.isPublic,
            sourceDatasetAvailable: snapshot.available, assetStatus: snapshot.available ? 'published' : 'delisted',
            commercializable: snapshot.isPublic && snapshot.available, lastSyncedAt: now(),
            createdAt: snapshot.updatedAt, updatedAt: snapshot.updatedAt,
            description: snapshot.description, publicDatasetMetadata: metadata
          })
        }
        const syncedResource = this.resourceById(snapshot.resourceId)!
        applyPublicDatasetOverrides(syncedResource)
        const product = this.products.find((item) => item.resourceId === snapshot.resourceId)
        if (!product) continue
        product.typeDetail.dataset = nextDetail
        product.name = snapshot.name
        if (syncedResource.publicDatasetMetadata) Object.assign(product, publicDatasetPresentation(syncedResource))
        const sourceAvailable = snapshot.isPublic && snapshot.available
        if (isPublicDatasetProduct(product, syncedResource) && !product.manualDelistedBy && syncedResource.publicDelistReason !== 'manual') {
          // 只有从已发布状态转入的源端下架，才有资格自动恢复。
          if (!sourceAvailable && product.status === 'published' && ['published', 'paused'].includes(product.availability)) {
            syncedResource.publicDelistReason = 'source'
            product.availability = 'delisted'
            product.status = 'delisted'
            recordListingChange(product, 'system', 'delist')
            ;(syncedResource.publicStateHistory ??= []).push({ at: now(), state: 'delisted', reason: '源端取消公开或数据不可用' })
          } else if (sourceAvailable && product.availability === 'delisted' && product.status === 'delisted' && syncedResource.publicDelistReason === 'source') {
            syncedResource.publicDelistReason = undefined
            product.availability = 'published'
            product.status = 'published'
            recordListingChange(product, 'system', 'publish')
            ;(syncedResource.publicStateHistory ??= []).push({ at: now(), state: 'published', reason: '源端恢复公开且可用' })
          }
        }
        product.publicDataset = snapshot.isPublic
        if (syncedResource.publicDatasetMetadata) {
          product.price = { model: 'member_free' }
          product.acquisitions = ['member']
          product.memberIncluded = true
          product.memberBenefits = []
          product.datasetOffers = undefined
          product.commerceOffers = undefined
        }
        product.updatedAt = snapshot.updatedAt
      }
    },
    updatePublicDatasetDetails(resourceId: string, values: PublicDatasetDisplay) {
      const resource = this.resourceById(resourceId)
      if (!resource?.publicDatasetMetadata || resource.type !== 'dataset') throw new Error('公开数据集资源不存在')
      if (!values.productName.trim()) throw new Error('请填写商品名称')
      for (const value of [values.rowCount, values.fieldCount]) {
        if (value != null && (!Number.isSafeInteger(value) || value < 0)) throw new Error('数据行数和字段数须为非负整数')
      }
      const current = publicDatasetDisplay(resource)
      const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== current[key as keyof PublicDatasetDisplay]))
      resource.publicDatasetOverrides = { ...resource.publicDatasetOverrides, ...changes }
      applyPublicDatasetOverrides(resource)
      const product = this.productForResource(resourceId)
      if (product) Object.assign(product, publicDatasetPresentation(resource))
    },
    recordPublicDatasetSyncFailure(resourceId: string, message: string) {
      const resource = this.resourceById(resourceId)
      if (resource) resource.publicSyncError = message
    },
    generatePublicDatasetProduct(resourceId: string) {
      const existing = this.productForResource(resourceId)
      if (existing) return existing
      const resource = this.resourceById(resourceId)
      if (!resource) throw new Error('资源不存在')
      const issues = publicDatasetIssues(resource)
      if (issues.length) throw new Error(issues.join('；'))
      const product = this.listResource(resourceId, {
        name: resource.resourceName, subtitle: resource.description || '', price: { model: 'member_free' },
        acquisitions: ['member'], scenarios: resource.publicDatasetMetadata?.scenarios || [], tags: ['公开数据集']
      })
      Object.assign(product, publicDatasetPresentation(resource))
      product.status = 'published'
      product.availability = 'published'
      resource.publicStateHistory = [{ at: now(), state: 'published', reason: '运营确认生成并上架' }]
      recordListingChange(product, 'manual', 'publish')
      return product
    },
    updateResourcePricingDraft(resourceId: string, draft: ResourcePricingDraft) {
      const resource = this.resources.find((item) => item.id === resourceId)
      if (!resource) throw new Error('资源不存在')
      if (resource.type === 'dataset' && resource.publicDatasetMetadata) throw new Error('公开数据集固定为会员免费，不可修改价格方案')
      resource.pricingDraft = JSON.parse(JSON.stringify(draft))
      if (draft.paywall || draft.paywallCatalog) {
        const dashboard = resource.typeDetail.dashboard
        if (dashboard) {
          resource.typeDetail = {
            ...resource.typeDetail,
            dashboard: {
              ...dashboard,
              paywall: draft.paywall
                ? {
                    maskedModuleIds: [...draft.paywall.maskedModuleIds],
                    maskedFieldKeys: [...draft.paywall.maskedFieldKeys],
                    maskedButtons: draft.paywall.maskedButtons.map((item) => ({ ...item }))
                  }
                : dashboard.paywall,
              paywallCatalog: draft.paywallCatalog ?? dashboard.paywallCatalog
            }
          }
        }
      }
      resource.updatedAt = now()
    },
    syncProductGroupFromSource(sourceProductId: string) {
      const source = this.products.find((item) => item.id === sourceProductId)
      if (!source?.productGroupId) return
      const snapshot = pricingSnapshot(source)
      for (const member of groupMembers(this.products, sourceProductId)) {
        if (member.id === sourceProductId) continue
        Object.assign(member, snapshot, { updatedAt: now() })
        applyPaywallSnapshot(member, source)
      }
    },
    packProductIntoGroup(sourceProductId: string, targetProductId: string) {
      const source = this.products.find((item) => item.id === sourceProductId)
      const target = this.products.find((item) => item.id === targetProductId)
      if (!source || !target) throw new Error('商品不存在')
      if (sourceProductId === targetProductId) throw new Error('不能关联自身')
      if (isPackagedProduct(this.products, targetProductId) && target.productGroupId !== source.productGroupId) {
        throw new Error('目标商品已在其它打包组')
      }
      const groupId = source.productGroupId || genId('pgroup')
      source.productGroupId = groupId
      target.productGroupId = groupId
      this.syncProductGroupFromSource(sourceProductId)
      return groupMembers(this.products, sourceProductId)
    },
    packProductsIntoGroup(sourceProductId: string, targetProductIds: string[]) {
      const uniqueIds = [...new Set(targetProductIds.filter(Boolean))]
      if (!uniqueIds.length) throw new Error('请选择至少一个商品')
      const source = this.products.find((item) => item.id === sourceProductId)
      if (!source) throw new Error('商品不存在')
      for (const targetProductId of uniqueIds) {
        if (targetProductId === sourceProductId) throw new Error('不能关联自身')
        const target = this.products.find((item) => item.id === targetProductId)
        if (!target) throw new Error('商品不存在')
        if (isPackagedProduct(this.products, targetProductId) && target.productGroupId !== source.productGroupId) {
          throw new Error(`「${target.name}」已在其它打包组`)
        }
      }
      const groupId = source.productGroupId || genId('pgroup')
      source.productGroupId = groupId
      for (const targetProductId of uniqueIds) {
        const target = this.products.find((item) => item.id === targetProductId)!
        target.productGroupId = groupId
      }
      this.syncProductGroupFromSource(sourceProductId)
      return groupMembers(this.products, sourceProductId)
    },
    unpackProductFromGroup(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product) throw new Error('商品不存在')
      product.productGroupId = genId('pgroup')
      product.updatedAt = now()
      return product
    },
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
        productGroupId: genId('pgroup'),
        name: form.name,
        subtitle: form.subtitle,
        type: resource.type as Product['type'],
        origin: resource.origin,
        publicDataset: resource.sourcePublicDataset === true,
        dealChannel: resource.type === 'api' || resource.origin === 'trusted_space' ? 'space_purchase' : 'app_payment',
        availability: 'preparing',
        acquisitions: resource.sourcePublicDataset ? ['member'] : form.acquisitions,
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
        price: resource.sourcePublicDataset ? { model: 'member_free' } : form.price,
        salePeriodMonths: 12,
        datasetOffers: resource.type === 'dataset' && !resource.sourcePublicDataset ? [
          { id: genId('offer-enterprise'), name: '企业购买', subject: 'enterprise', price: form.price.itemPrice ?? 0, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'enterprise_wide', allowDownload: true, deliveryMode: 'snapshot' }
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
        description: resource.description || '',
        valueProposition: '',
        deliveryMethod: '',
        memberIncluded: resource.sourcePublicDataset === true,
        listedAt: now(),
        updatedAt: now(),
        typeDetail: cloneTypeDetail(resource.typeDetail),
        serviceStatus: 'normal'
      }
      this.products.push(product)
      if (resource.sourcePublicDataset) {
        Object.assign(product, publicDatasetPresentation(resource))
        product.name = truncateProductName(resource.productNameDraft ?? (form.name.trim() || resource.resourceName))
        product.price = { model: 'member_free' }
        product.acquisitions = ['member']
        product.memberIncluded = true
      } else {
        this.applyResourceDraftToProduct(resource, product)
      }
      return product
    },
    applyResourceDraftToProduct(resource: Resource, product: Product) {
      const draft = resource.pricingDraft
      if (!draft) return
      if (draft.isFree) {
        product.acquisitions = ['free']
        product.price = { model: 'free' }
        product.memberBenefits = []
        product.memberIncluded = false
      } else {
        product.acquisitions = [...(product.acquisitions.filter((item) => item !== 'free'))]
        product.salePeriodMonths = draft.salePeriodMonths ?? product.salePeriodMonths
        if (draft.personalOffer?.enabled || draft.enterpriseOffer?.enabled) {
          if (!product.acquisitions.includes('item_purchase')) product.acquisitions.push('item_purchase')
        }
        product.price = {
          ...product.price,
          model: product.price.model === 'free' ? 'item_only' : product.price.model,
          itemPrice: draft.personalOffer?.price || product.price.itemPrice
        }
      }
      if (product.type === 'dashboard' && product.typeDetail.dashboard && (draft.paywall || draft.paywallCatalog)) {
        product.typeDetail = {
          ...product.typeDetail,
          dashboard: {
            ...product.typeDetail.dashboard,
            paywall: draft.paywall
              ? {
                  maskedModuleIds: [...draft.paywall.maskedModuleIds],
                  maskedFieldKeys: [...draft.paywall.maskedFieldKeys],
                  maskedButtons: draft.paywall.maskedButtons.map((item) => ({ ...item }))
                }
              : product.typeDetail.dashboard.paywall,
            paywallCatalog: draft.paywallCatalog ?? product.typeDetail.dashboard.paywallCatalog
          }
        }
      }
      product.updatedAt = now()
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
      recordListingChange(product, 'manual', 'publish')
      return product
    },
    publishProduct(productId: string) {
      const product = this.products.find((item) => item.id === productId)
      if (!product) throw new Error('商品不存在')
      if (product.availability === 'published') throw new Error('商品已上架')
      assertManualListingGroup(groupMembers(this.products, productId))
      for (const member of groupMembers(this.products, productId)) {
        if (member.origin === 'trusted_space' && member.availability === 'delisted') {
          const snapshot = useTrustedSpaceCatalogStore().byProductId(member.id)
          if (snapshot?.syncState !== 'current' || snapshot.saleStatus !== 'published') {
            throw new Error('须确认可信源端已上架且同步正常后才能上架')
          }
        }
        const resource = this.resourceById(member.resourceId)
        if (isPublicDatasetProduct(member, resource)) {
          const issues = publicDatasetRestoreIssues(resource)
          if (issues.length) throw new Error(issues.join('；'))
        }
      }
      if (product.publicDataset === false && this.resources.find((item) => item.id === product.resourceId)?.sourcePublicDataset === false && product.price.model === 'member_free') {
        throw new Error('公开状态已取消，须先配置非公开企业订单方案')
      }
      product.status = 'published'
      product.availability = 'published'
      product.listedAt = now()
      product.updatedAt = now()
      this.syncGroupAvailability(productId, 'published', 'published')
      for (const member of groupMembers(this.products, productId)) {
        member.manualDelistedBy = undefined
        recordListingChange(member, 'manual', 'publish')
        const resource = this.resourceById(member.resourceId)
        if (isPublicDatasetProduct(member, resource) && resource.publicDelistReason) {
          resource.publicDelistReason = undefined
          ;(resource.publicStateHistory ??= []).push({ at: now(), state: 'published', reason: '运营手动恢复上架' })
        }
      }
      return product
    },
    delistProduct(productId: string, actor: 'operator' | 'seller' = 'operator') {
      const p = this.products.find((x) => x.id === productId)
      if (!p) return
      if (p.availability !== 'published' && p.availability !== 'paused') {
        throw new Error('仅已上架商品可下架')
      }
      assertManualListingGroup(groupMembers(this.products, productId))
      useOrderStore().closeOnlinePendingForProducts(
        groupMembers(this.products, productId).map((member) => member.id),
        '商品已下架，待支付订单已关闭'
      )
      this.syncGroupAvailability(productId, 'delisted', 'delisted')
      for (const member of groupMembers(this.products, productId)) {
        member.manualDelistedBy = actor
        recordListingChange(member, 'manual', 'delist')
        const resource = this.resourceById(member.resourceId)
        if (isPublicDatasetProduct(member, resource)) {
          resource.publicDelistReason = 'manual'
          ;(resource.publicStateHistory ??= []).push({ at: now(), state: 'delisted', reason: '运营手动下架' })
        }
      }
    },
    syncGroupAvailability(productId: string, availability: AvailabilityStatus, status: ProductStatus) {
      for (const member of groupMembers(this.products, productId)) {
        member.availability = availability
        member.status = status
        member.updatedAt = now()
      }
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
    activateFavoriteOwner(ownerId: string) {
      if (ownerId === this.favoriteOwnerId) return
      if (this.favoriteOwnerId) this.favoriteSnapshots[this.favoriteOwnerId] = Object.fromEntries(this.products.map(p => [p.id, !!p.favorite]))
      let snapshot = this.favoriteSnapshots[ownerId]
      if (!snapshot) {
        snapshot = {}
        try {
          const key = `market-product-favorites-v2:${encodeURIComponent(ownerId)}`
          let raw = localStorage.getItem(key)
          // Bind the previous unscoped snapshot once; keep its source recoverable.
          if (raw === null && !localStorage.getItem('market-product-favorites-legacy-owner')) {
            raw = localStorage.getItem('market-product-favorites-v1')
            if (raw !== null) {
              localStorage.setItem('market-product-favorites-legacy-owner', ownerId)
              localStorage.setItem(key, raw)
            }
          }
          const saved: unknown = JSON.parse(raw || '{}')
          if (saved && typeof saved === 'object' && !Array.isArray(saved)) snapshot = saved as Record<string, boolean>
        } catch { /* Disabled storage falls back to this session's snapshot. */ }
      }
      this.favoriteOwnerId = ownerId
      this.favoriteSnapshots[ownerId] = snapshot
      for (const p of this.products) p.favorite = snapshot[p.id] === true
    },
    toggleFavorite(productId: string) {
      const p = this.products.find((x) => x.id === productId)
      if (!p) return
      p.favorite = !p.favorite
      try {
        const key = this.favoriteOwnerId ? `market-product-favorites-v2:${encodeURIComponent(this.favoriteOwnerId)}` : 'market-product-favorites-v1'
        localStorage.setItem(key, JSON.stringify(
          Object.fromEntries(this.products.map(product => [product.id, !!product.favorite]))
        ))
      } catch { /* Keep the in-memory interaction usable when storage is disabled. */ }
      return p.favorite
    },
    // ---- 运营后台动作 ----
    updateStatus(productId: string, status: ProductStatus) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.status = status === 'paused' ? 'delisted' : status
        p.updatedAt = now()
      }
    },
    updateAvailability(productId: string, availability: AvailabilityStatus) {
      const p = this.products.find((x) => x.id === productId)
      if (p) {
        p.availability = availability === 'paused' ? 'delisted' : availability
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
    updateProduct(productId: string, patch: Partial<Product>, options?: { syncGroup?: boolean }) {
      const idx = this.products.findIndex((x) => x.id === productId)
      if (idx >= 0) {
        this.products[idx] = { ...this.products[idx], ...patch, updatedAt: now() }
        const resource = this.resources.find((item) => item.id === this.products[idx].resourceId)
        if (resource?.type === 'dataset' && resource.publicDatasetMetadata) {
          Object.assign(this.products[idx], {
            price: { model: 'member_free' }, acquisitions: ['member'], memberIncluded: true,
            memberBenefits: [], datasetOffers: undefined, commerceOffers: undefined
          })
        }
        if (options?.syncGroup !== false && this.products[idx].productGroupId) {
          this.syncProductGroupFromSource(productId)
        }
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
    updateResourceDashboardDetail(resourceId: string, detail: DashboardDetail) {
      const resource = this.resources.find((item) => item.id === resourceId)
      if (!resource || resource.type !== 'dashboard') return
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
          : undefined,
        previewImages: detail.previewImages
          ? {
              app: [...detail.previewImages.app],
              pc: [...detail.previewImages.pc]
            }
          : undefined
      })
      resource.typeDetail = { ...resource.typeDetail, dashboard: cloneDetail() }
      resource.updatedAt = now()
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
          : undefined,
        previewImages: detail.previewImages
          ? {
              app: [...detail.previewImages.app],
              pc: [...detail.previewImages.pc]
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
        blocks: detail.blocks.map((block) => ({ ...block })),
        previewImages: detail.previewImages
          ? {
              app: [...detail.previewImages.app],
              pc: [...detail.previewImages.pc]
            }
          : undefined
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
      const resource = this.resourceById(product.resourceId || '')
      product.name = truncateProductName(resource?.productNameDraft ?? snapshot.name)
      product.provider = snapshot.provider
      product.price = { ...snapshot.price }
      if (snapshot.datasetOffers) product.datasetOffers = snapshot.datasetOffers.map((offer) => ({ ...offer }))
      // 同步资料不清除人工下架决定，也不发布尚未完成首次上架的草稿。
      if (!product.manualDelistedBy && !['draft', 'pending_approval'].includes(product.status)
        && snapshot.syncState === 'current' && snapshot.saleStatus !== 'unknown') {
        const previous = product.availability
        const saleStatus = snapshot.saleStatus === 'paused' ? 'delisted' : snapshot.saleStatus
        product.availability = saleStatus
        product.status = saleStatus === 'delisted' ? 'delisted' : 'published'
        if (previous !== saleStatus && (saleStatus === 'delisted' || previous === 'delisted')) {
          recordListingChange(product, 'system', saleStatus === 'delisted' ? 'delist' : 'publish')
        }
      }
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
