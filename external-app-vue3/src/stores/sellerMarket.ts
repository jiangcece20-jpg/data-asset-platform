import { defineStore } from 'pinia'
import type { CommerceOffer, Order, Product } from '@/types/domain'
import type {
  ListableArtifact,
  SellerAccessStatus,
  SellerListingApplication,
  SellerListingStatus,
  SellerProfile
} from '@/types/sellerMarket'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'
import { useOrderStore } from './orders'
import { useUserStore } from './user'
import { useDatasetCommerceStore } from './datasetCommerce'
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { assertMerchantUpdateFrequency } from '@/domain/updateFrequency'
import { sellerDatasetDetailByArtifact } from '@/data/sellerDatasets'
import {
  assertSellerListingSpec,
  datasetDetailFromListingSpec,
  listingCatalogSpecFromArtifact,
  type SellerListingCatalogSpec
} from '@/domain/sellerListingSpec'

export function sellerListingSaleLabel(value: string | SellerListingApplication) {
  const status = typeof value === 'string' ? value : value.listingStatus ?? value.status
  if (status === 'published') return '上架'
  if (status === 'paused' || status === 'delisted') return '已下架'
  return '未上架'
}

export function sellerListingReviewLabel(listing: SellerListingApplication) {
  if (listing.restoreReview?.status === 'pending_review') return '恢复上架审批中'
  if (listing.restoreReview?.status === 'rejected') return '恢复上架被驳回'
  if (listing.status === 'need_supplement') return '驳回'
  const status = listing.reviewStatus ?? listing.status
  if (status === 'draft') return '草稿'
  if (status === 'rejected' || status === 'change_rejected') return '驳回'
  if (['approved', 'published', 'paused', 'delisted'].includes(status)) return '已通过'
  if (status === 'change_pending' && listing.pendingTerms) {
    const terms = listing.pendingTerms
    const priceChanged = terms.enterprisePrice !== listing.enterprisePrice
    const detailsChanged = terms.servicePeriodMonths !== (listing.servicePeriodMonths ?? 12)
      || terms.updateFrequency !== listing.catalogSpec?.updateFrequency
      || terms.coverage !== listing.catalogSpec?.coverage
    if (priceChanged && detailsChanged) return '多项变更审核中'
    if (priceChanged) return '价格变更审核中'
    if (detailsChanged) return '资料变更审核中'
  }
  return '审核中'
}

export function assertSellerListingPrices(enterprisePrice: number) {
  if (!Number.isFinite(enterprisePrice) || enterprisePrice < 1) throw new Error('请填写企业购买价格')
}

export function sellerItemOffers(productId: string, enterprisePrice: number, updateFrequency: string, servicePeriodMonths: number): CommerceOffer[] {
  assertMerchantUpdateFrequency(updateFrequency)
  return [
    {
      id: `offer-${productId}-enterprise`,
      name: '企业购买',
      subject: 'enterprise',
      price: enterprisePrice,
      currency: 'CNY',
      serviceMode: 'continuous',
      contentKind: 'continuous_updates',
      billingPeriodMonths: servicePeriodMonths,
      maxTermMonths: servicePeriodMonths,
      accessScope: 'enterprise_wide',
      allowDownload: true
    }
  ]
}

const seedArtifacts: ListableArtifact[] = [
  {
    id: 'artifact-route-otp',
    name: '华东干线时效数据集',
    type: 'dataset',
    version: 'v1.2.0',
    sourceModule: 'bi-workbench',
    dataProvenance: 'owned',
    licenseSummary: '自有运单加工，可上架售卖',
    updatedAt: '2026-08-01',
    datasetDetail: sellerDatasetDetailByArtifact('artifact-route-otp')
  },
  {
    id: 'artifact-warehouse-health',
    name: '仓网周转健康数据集',
    type: 'dataset',
    version: 'v1.0.1',
    sourceModule: 'bi-workbench',
    dataProvenance: 'derived',
    licenseSummary: '含已购衍生字段，上架须声明源约束',
    updatedAt: '2026-08-05',
    datasetDetail: sellerDatasetDetailByArtifact('artifact-warehouse-health')
  },
  {
    id: 'artifact-driver-score',
    name: '司机绩效周报数据集',
    type: 'dataset',
    version: 'v0.9.0',
    sourceModule: 'bi-workbench',
    dataProvenance: 'owned',
    licenseSummary: '自有绩效指标，可上架',
    updatedAt: '2026-07-25',
    datasetDetail: sellerDatasetDetailByArtifact('artifact-driver-score')
  }
]

const seedProfiles: SellerProfile[] = [
  {
    id: 'seller-chenjing',
    subjectType: 'personal',
    memberId: 'mem-1',
    displayName: '陈静',
    status: 'approved',
    compliance: {
      identityVerified: true,
      realName: '陈静',
      idMasked: '310***********2218',
      payoutAccountMasked: '6222****8899',
      payoutBank: '招商银行',
      noPersonalDataResale: true,
      licenseAcknowledged: true,
      dataProvenanceDeclared: true,
      l3MaterialsUploaded: false
    },
    appliedAt: '2026-07-20 10:00',
    reviewedAt: '2026-07-21 15:30',
    reviewNote: 'L1/L2 材料齐全，准入通过',
    updatedAt: '2026-07-21 15:30'
  },
  {
    id: 'seller-zhangshu',
    subjectType: 'personal',
    memberId: 'mem-zhang',
    displayName: '张数',
    status: 'approved',
    compliance: {
      identityVerified: true,
      realName: '张数',
      idMasked: '330***********1102',
      payoutAccountMasked: '6217****3344',
      payoutBank: '工商银行',
      noPersonalDataResale: true,
      licenseAcknowledged: true,
      dataProvenanceDeclared: true
    },
    appliedAt: '2026-07-28 09:00',
    reviewedAt: '2026-07-29 11:00',
    updatedAt: '2026-07-29 11:00'
  },
  {
    id: 'seller-pending-demo',
    subjectType: 'personal',
    memberId: 'mem-pending',
    displayName: '刘可（待审）',
    status: 'pending_review',
    compliance: {
      identityVerified: true,
      realName: '刘可',
      idMasked: '320***********7788',
      payoutAccountMasked: '6228****5566',
      payoutBank: '建设银行',
      noPersonalDataResale: true,
      licenseAcknowledged: true,
      dataProvenanceDeclared: true
    },
    appliedAt: '2026-08-07 16:20',
    updatedAt: '2026-08-07 16:20'
  }
]

const seedListings: SellerListingApplication[] = [
  {
    id: 'listing-pending-driver',
    sellerId: 'seller-chenjing',
    sellerName: '陈静',
    artifactId: 'artifact-driver-score',
    artifactVersion: 'v0.9.0',
    title: '司机绩效周报数据集',
    subtitle: '基于用数成果申请上架的绩效数据集',
    price: 99,
    enterprisePrice: 990,
    dataProvenance: 'owned',
    complianceSummary: '无个人信息对外售卖；自有数据',
    catalogSpec: listingCatalogSpecFromArtifact(seedArtifacts.find((item) => item.id === 'artifact-driver-score')!),
    status: 'pending_review',
    reviewStatus: 'pending_review',
    listedByName: '陈静',
    lastOperatorName: '陈静',
    createdAt: '2026-08-08 09:10',
    updatedAt: '2026-08-08 09:10'
  }
]

export const useSellerMarketStore = defineStore('sellerMarket', {
  state: () => ({
    profiles: seedProfiles.map((p) => ({ ...p, compliance: { ...p.compliance } })),
    listings: seedListings.map((l) => ({ ...l })),
    artifacts: seedArtifacts.map((a) => ({ ...a }))
  }),
  getters: {
    myProfile(state): SellerProfile | undefined {
      const memberId = useUserStore().context.currentMemberId
      return state.profiles.find((p) => p.memberId === memberId)
    },
    isApprovedSeller(): boolean {
      return this.myProfile?.status === 'approved'
    },
    pendingAccess(state): SellerProfile[] {
      return state.profiles.filter((p) => p.status === 'pending_review' || p.status === 'need_supplement')
    },
    pendingListings(state): SellerListingApplication[] {
      return state.listings.filter((l) => l.status === 'pending_review' || l.status === 'need_supplement')
    },
    myListings(): SellerListingApplication[] {
      const me = this.myProfile
      if (!me) return []
      return this.listings.filter((l) => l.sellerId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    mySellerOrders() {
      const me = this.myProfile
      if (!me) return []
      return useOrderStore().appOrders
        .filter((o) => o.sellerId === me.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    listableArtifacts(state): ListableArtifact[] {
      return state.artifacts
    }
  },
  actions: {
    profileById(id: string) {
      return this.profiles.find((p) => p.id === id)
    },
    applyAccess(input: {
      displayName: string
      realName: string
      idMasked: string
      payoutAccountMasked: string
      payoutBank: string
      subjectType?: 'personal' | 'enterprise'
    }) {
      const user = useUserStore()
      const existing = this.profiles.find((p) => p.memberId === user.context.currentMemberId)
      if (existing && (existing.status === 'approved' || existing.status === 'pending_review')) {
        return existing
      }
      const stamp = now()
      const profile: SellerProfile = {
        id: existing?.id || genId('seller'),
        subjectType: input.subjectType || 'personal',
        memberId: user.context.currentMemberId,
        enterpriseId: user.context.currentEnterpriseId,
        displayName: input.displayName,
        status: 'pending_review',
        compliance: {
          identityVerified: true,
          realName: input.realName,
          idMasked: input.idMasked,
          payoutAccountMasked: input.payoutAccountMasked,
          payoutBank: input.payoutBank,
          noPersonalDataResale: true,
          licenseAcknowledged: true,
          dataProvenanceDeclared: true
        },
        appliedAt: stamp,
        updatedAt: stamp
      }
      if (existing) {
        Object.assign(existing, profile)
        return existing
      }
      this.profiles.push(profile)
      return profile
    },
    decideAccess(sellerId: string, decision: Extract<SellerAccessStatus, 'approved' | 'rejected' | 'need_supplement' | 'suspended'>, note = '') {
      const profile = this.profiles.find((p) => p.id === sellerId)
      if (!profile) return
      profile.status = decision
      profile.reviewNote = note
      profile.reviewedAt = now()
      profile.updatedAt = now()
      if (decision === 'suspended') {
        const catalog = useCatalogStore()
        catalog.products
          .filter((p) => p.sellerId === sellerId && p.origin === 'seller_market' && p.availability === 'published')
          .forEach((p) => {
            this.forceDelist(p.id, note || '商家准入暂停', '平台运营', 'operator')
          })
      }
    },
    submitListing(input: {
      artifactId: string
      title: string
      subtitle: string
      enterprisePrice: number
      servicePeriodMonths: number
      complianceSummary: string
      catalogSpec: SellerListingCatalogSpec
    }) {
      const me = this.myProfile
      if (!me || me.status !== 'approved') throw new Error('仅已准入卖家可提交上架')
      const artifact = this.artifacts.find((a) => a.id === input.artifactId)
      if (!artifact) throw new Error('可上架对象不存在')
      assertSellerListingPrices(input.enterprisePrice)
      if (!Number.isInteger(input.servicePeriodMonths) || input.servicePeriodMonths < 1) throw new Error('请填写服务周期')
      const catalogSpec = assertSellerListingSpec(input.catalogSpec)
      assertMerchantUpdateFrequency(catalogSpec.updateFrequency)
      const dup = this.listings.find(
        (l) =>
          l.sellerId === me.id &&
          l.artifactId === artifact.id &&
          l.artifactVersion === artifact.version &&
          ['pending_review', 'published', 'paused'].includes(l.status)
      )
      if (dup) throw new Error('同一对象版本已有在途或在架申请')
      const stamp = now()
      const listing: SellerListingApplication = {
        id: genId('listing'),
        sellerId: me.id,
        sellerName: me.displayName,
        artifactId: artifact.id,
        artifactVersion: artifact.version,
        title: input.title,
        subtitle: input.subtitle,
        price: input.enterprisePrice,
        enterprisePrice: input.enterprisePrice,
        servicePeriodMonths: input.servicePeriodMonths,
        dataProvenance: artifact.dataProvenance,
        complianceSummary: catalogSpec.complianceNote || input.complianceSummary,
        catalogSpec,
        status: 'pending_review',
        listingStatus: 'unlisted',
        reviewStatus: 'pending_review',
        listedByName: me.displayName,
        lastOperatorName: me.displayName,
        createdAt: stamp,
        updatedAt: stamp
      }
      this.listings.unshift(listing)
      return listing
    },
    decideListing(listingId: string, decision: Extract<SellerListingStatus, 'published' | 'rejected' | 'need_supplement'>, note = '') {
      const listing = this.listings.find((l) => l.id === listingId)
      if (!listing) return
      if (listing.productId) throw new Error('已发布商品请使用变更或恢复审批')
      if (decision !== 'published') {
        listing.reviewNote = note
        listing.updatedAt = now()
        listing.lastOperatorName = '平台运营'
        listing.status = decision
        listing.reviewStatus = decision === 'rejected' ? 'rejected' : 'pending_review'
        return listing
      }
      const catalog = useCatalogStore()
      const productId = listing.productId || genId('prod-seller')
      const resourceId = `res-${productId}`
      const existing = catalog.byId(productId)
      const artifact = this.artifacts.find((a) => a.id === listing.artifactId)
      const catalogSpec = listing.catalogSpec
        ? assertSellerListingSpec(listing.catalogSpec)
        : listingCatalogSpecFromArtifact(artifact || { ...this.artifacts[0], id: listing.artifactId })
      assertMerchantUpdateFrequency(catalogSpec.updateFrequency)
      const datasetDetail = datasetDetailFromListingSpec(
        artifact || { id: listing.artifactId, name: listing.title, type: 'dataset', version: listing.artifactVersion, sourceModule: 'bi-workbench', dataProvenance: listing.dataProvenance, licenseSummary: listing.complianceSummary, updatedAt: listing.updatedAt, datasetDetail: sellerDatasetDetailByArtifact(listing.artifactId) },
        catalogSpec
      )
      const hasSamples = datasetDetail.sampleRows.length > 0
      const product: Product = existing || {
        id: productId,
        resourceId,
        name: listing.title,
        subtitle: listing.subtitle,
        type: 'dataset',
        origin: 'seller_market',
        dealChannel: 'app_payment',
        availability: 'published',
        acquisitions: ['item_purchase'],
        entitlementPolicy: { kind: 'term', months: listing.servicePeriodMonths || 12 },
        salePeriodMonths: listing.servicePeriodMonths || 12,
        scenarios: catalogSpec.scenarios,
        provider: `入驻商家 · ${listing.sellerName}`,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        dataProvenance: listing.dataProvenance,
        settlementModeDefault: 'platform_collect',
        coverage: catalogSpec.coverage,
        updateFrequency: catalogSpec.updateFrequency,
        qualityPromise: catalogSpec.qualityPromise,
        complianceNote: catalogSpec.complianceNote,
        price: { model: 'item_only', itemPrice: listing.enterprisePrice, unit: '元' },
        commerceOffers: sellerItemOffers(productId, listing.enterprisePrice, catalogSpec.updateFrequency, listing.servicePeriodMonths || 12),
        status: 'published',
        tags: ['入驻商家', ...catalogSpec.scenarios.slice(0, 2)],
        description: catalogSpec.description,
        valueProposition: catalogSpec.valueProposition,
        deliveryMethod: '订单完成后自动交付当前版本；定时更新在服务周期内自动交付',
        memberIncluded: false,
        hasSampleData: hasSamples,
        listedAt: now().slice(0, 10),
        updatedAt: now().slice(0, 10),
        serviceStatus: 'normal',
        typeDetail: {
          dataset: datasetDetail
        }
      }
      if (!existing) {
        catalog.products.unshift(product)
        if (!catalog.resources.some((r) => r.id === resourceId)) {
          catalog.resources.unshift({
            id: resourceId,
            resourceName: product.name,
            type: 'dataset',
            origin: 'seller_market',
            typeDetail: { ...product.typeDetail },
            createdAt: product.updatedAt,
            updatedAt: product.updatedAt
          })
        }
      } else {
        existing.availability = 'published'
        existing.status = 'published'
        existing.price = { model: 'item_only', itemPrice: listing.enterprisePrice, unit: '元' }
        existing.commerceOffers = sellerItemOffers(productId, listing.enterprisePrice, catalogSpec.updateFrequency, listing.servicePeriodMonths || 12)
        existing.salePeriodMonths = listing.servicePeriodMonths || 12
        existing.entitlementPolicy = { kind: 'term', months: listing.servicePeriodMonths || 12 }
        existing.settlementModeDefault = 'platform_collect'
        existing.deliveryMethod = '订单完成后自动交付当前版本；定时更新在服务周期内自动交付'
        existing.memberIncluded = false
        existing.sellingShots = undefined
        existing.customSellingShots = undefined
        existing.coverage = catalogSpec.coverage
        existing.updateFrequency = catalogSpec.updateFrequency
        existing.scenarios = catalogSpec.scenarios
        existing.description = catalogSpec.description
        existing.valueProposition = catalogSpec.valueProposition
        existing.qualityPromise = catalogSpec.qualityPromise
        existing.complianceNote = catalogSpec.complianceNote
        existing.hasSampleData = hasSamples
        existing.typeDetail = { dataset: datasetDetail }
      }
      listing.productId = productId
      product.manualDelistedBy = undefined
      product.lastListingChange = { mode: 'manual', action: 'publish', at: now() }
      listing.reviewNote = note
      listing.updatedAt = now()
      listing.lastOperatorName = '平台运营'
      listing.status = 'published'
      listing.listingStatus = 'published'
      listing.reviewStatus = 'approved'
      listing.publishedAt = now()
      return listing
    },
    saveListingDisplay(listingId: string, input: {
      title: string
      subtitle: string
      description: string
      fieldDescriptions?: Record<string, string>
      sampleRows?: Array<Record<string, string | number | boolean>>
    }) {
      const listing = this.listings.find((item) => item.id === listingId)
      if (!listing || listing.sellerId !== this.myProfile?.id || sellerListingSaleLabel(listing) !== '上架') throw new Error('仅可修改自己的在架商品')
      const product = listing.productId && useCatalogStore().byId(listing.productId)
      if (!product || !listing.catalogSpec) throw new Error('商品资料不存在')
      if (!input.title.trim() || !input.description.trim()) throw new Error('请填写商品名称和内容说明')
      const fields = listing.catalogSpec.fields.map((field) => ({
        ...field,
        description: input.fieldDescriptions?.[field.name]?.trim() ?? field.description
      }))
      if (input.sampleRows?.some((row) => Object.keys(row).some((key) => !listing.catalogSpec!.sampleColumns.includes(key)))) {
        throw new Error('样例字段须与当前表结构一致')
      }
      listing.title = input.title.trim()
      listing.subtitle = input.subtitle.trim()
      listing.catalogSpec = {
        ...listing.catalogSpec,
        description: input.description.trim(),
        fields,
        sampleRows: input.sampleRows ?? listing.catalogSpec.sampleRows
      }
      listing.updatedAt = now()
      listing.lastOperatorName = this.myProfile.displayName
      product.name = listing.title
      product.subtitle = listing.subtitle
      product.description = listing.catalogSpec.description
      product.typeDetail.dataset = product.typeDetail.dataset
        ? { ...product.typeDetail.dataset, fields, sampleRows: listing.catalogSpec.sampleRows }
        : undefined
      product.updatedAt = listing.updatedAt
      return listing
    },
    submitListingTerms(listingId: string, input: { enterprisePrice: number; servicePeriodMonths: number; updateFrequency: string; coverage: string }) {
      const listing = this.listings.find((item) => item.id === listingId)
      if (!listing || listing.sellerId !== this.myProfile?.id || sellerListingSaleLabel(listing) !== '上架') throw new Error('仅可修改自己的在架商品')
      if (listing.reviewStatus === 'change_pending') throw new Error('变更审核中，不能再次提交')
      assertSellerListingPrices(input.enterprisePrice)
      if (!Number.isInteger(input.servicePeriodMonths) || input.servicePeriodMonths < 1) throw new Error('请填写服务周期')
      assertMerchantUpdateFrequency(input.updateFrequency)
      if (!input.coverage.trim()) throw new Error('请填写数据范围')
      listing.pendingTerms = { ...input, coverage: input.coverage.trim() }
      listing.reviewStatus = 'change_pending'
      listing.reviewNote = ''
      listing.updatedAt = now()
      listing.lastOperatorName = this.myProfile.displayName
      return listing
    },
    reviewListingTerms(listingId: string, approved: boolean, note: string) {
      const listing = this.listings.find((item) => item.id === listingId)
      if (!listing || listing.reviewStatus !== 'change_pending' || !listing.pendingTerms) throw new Error('没有待审变更')
      if (!approved && !note.trim()) throw new Error('驳回必须填写原因')
      if (approved) assertMerchantUpdateFrequency(listing.pendingTerms.updateFrequency)
      listing.reviewNote = note.trim()
      listing.updatedAt = now()
      listing.lastOperatorName = '平台运营'
      if (!approved) {
        listing.reviewStatus = 'change_rejected'
        return listing
      }
      const product = listing.productId && useCatalogStore().byId(listing.productId)
      if (!product || !listing.catalogSpec) throw new Error('商品资料不存在')
      const terms = listing.pendingTerms
      listing.enterprisePrice = terms.enterprisePrice
      listing.price = terms.enterprisePrice
      listing.servicePeriodMonths = terms.servicePeriodMonths
      listing.catalogSpec = { ...listing.catalogSpec, updateFrequency: terms.updateFrequency, coverage: terms.coverage }
      product.price = { ...product.price, itemPrice: terms.enterprisePrice }
      product.commerceOffers = sellerItemOffers(product.id, terms.enterprisePrice, terms.updateFrequency, terms.servicePeriodMonths)
      product.salePeriodMonths = terms.servicePeriodMonths
      product.entitlementPolicy = { kind: 'term', months: terms.servicePeriodMonths }
      product.updateFrequency = terms.updateFrequency
      product.coverage = terms.coverage
      product.updatedAt = listing.updatedAt
      listing.reviewStatus = 'approved'
      listing.pendingTerms = undefined
      return listing
    },
    forceDelist(productId: string, note = '', operatorName = '平台运营', actor: 'operator' | 'seller' = 'operator') {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      if (!product || product.origin !== 'seller_market') return
      if (actor === 'seller' && product.sellerId !== this.myProfile?.id) throw new Error('只能操作本店商品')
      if (product.availability === 'published' || product.availability === 'paused') catalog.delistProduct(productId, actor)
      const listing = this.listings.find((l) => l.productId === productId)
      if (listing) {
        listing.status = 'delisted'
        listing.listingStatus = 'delisted'
        listing.delistNote = note
        listing.lastOperatorName = operatorName
        listing.updatedAt = now()
      }
    },
    restoreListing(productId: string, actor: 'operator' | 'seller' = 'operator') {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      let listing = this.listings.find(item => item.productId === productId)
      if (!product || product.origin !== 'seller_market' || product.availability !== 'delisted') throw new Error('仅已下架商家商品可恢复')
      if (actor === 'seller' && (product.sellerId !== this.myProfile?.id || product.manualDelistedBy !== 'seller')) {
        throw new Error('仅可恢复本店主动下架商品，平台下架须由平台恢复')
      }
      const profile = this.profiles.find(item => item.id === product.sellerId)
      if (profile?.status !== 'approved') throw new Error('商家准入未通过，不能恢复上架')
      // Older prototype products have catalog facts but no associated application row.
      if (!listing) {
        const artifact = this.artifacts.find(item => item.name === product.name)
        if (!artifact) throw new Error('商品上架记录不存在，请核实原关联')
        listing = {
          id: genId('listing'), sellerId: product.sellerId!, sellerName: profile.displayName,
          artifactId: artifact.id, artifactVersion: artifact.version, productId,
          title: product.name, subtitle: product.subtitle,
          price: product.price.itemPrice ?? 0,
          enterprisePrice: commerceOffersOf(product).find(offer => offer.subject === 'enterprise')?.price ?? product.price.itemPrice ?? 0,
          servicePeriodMonths: salePeriodMonthsOf(product), dataProvenance: artifact.dataProvenance,
          complianceSummary: product.complianceNote || '',
          catalogSpec: listingCatalogSpecFromArtifact({ ...artifact, datasetDetail: product.typeDetail.dataset || artifact.datasetDetail }),
          status: 'delisted', listingStatus: 'delisted',
          createdAt: product.listedAt || '', updatedAt: now()
        }
        this.listings.unshift(listing)
      }
      if (listing.restoreReview?.status === 'pending_review') throw new Error('恢复申请审批中，不能重复提交')
      if (listing?.reviewStatus === 'change_pending') throw new Error('请先完成商品变更审核')
      listing.listingStatus = 'delisted'
      listing.restoreReview = { status: 'pending_review', actor, requestedAt: now() }
      listing.lastOperatorName = actor === 'seller' ? this.myProfile!.displayName : '平台运营'
      listing.updatedAt = now()
    },
    reviewListingRestore(listingId: string, approved: boolean, note: string) {
      const listing = this.listings.find(item => item.id === listingId)
      if (!listing?.restoreReview || listing.restoreReview.status !== 'pending_review') throw new Error('没有待审恢复申请')
      if (!approved && !note.trim()) throw new Error('驳回必须填写原因')
      const catalog = useCatalogStore()
      const product = listing.productId && catalog.byId(listing.productId)
      if (!product || product.availability !== 'delisted') throw new Error('商品已不处于下架状态，请重新核实')
      if (!approved) {
        listing.restoreReview = { ...listing.restoreReview, status: 'rejected', note: note.trim(), reviewedAt: now() }
        listing.lastOperatorName = '平台运营'
        listing.updatedAt = now()
        return
      }
      const profile = this.profiles.find(item => item.id === listing.sellerId)
      if (profile?.status !== 'approved') throw new Error('商家准入未通过，不能恢复上架')
      if (listing.reviewStatus === 'change_pending') throw new Error('请先完成商品变更审核')
      if (!listing.catalogSpec) throw new Error('商品资料不完整，不能恢复上架')
      assertSellerListingPrices(listing.enterprisePrice)
      assertSellerListingSpec(listing.catalogSpec)
      assertMerchantUpdateFrequency(listing.catalogSpec.updateFrequency)
      catalog.publishProduct(product.id)
      listing.status = 'published'
      listing.listingStatus = 'published'
      listing.restoreReview = { ...listing.restoreReview, status: 'approved', note: note.trim(), reviewedAt: now() }
      listing.lastOperatorName = '平台运营'
      listing.updatedAt = now()
    },
    /** 新交易付款即交付，已有历史订单不在初始化时改写。 */
    purchaseSellerProduct(productId: string, offerId: string, paymentMode: 'online' | 'contract' = 'online') {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      if (!product || product.origin !== 'seller_market' || product.dealChannel !== 'app_payment') {
        throw new Error('仅支持入驻商家商品购买')
      }
      if (product.status !== 'published' || product.availability !== 'published'
        || !product.acquisitions.includes('item_purchase') || ['suspended', 'terminated'].includes(product.serviceStatus)) {
        throw new Error('该商品当前不可购买，请返回详情核对在售状态')
      }
      if (!product.sellerId) throw new Error('商品缺少卖家信息')
      const user = useUserStore()
      const subject = currentPurchaseSubject(user)
      const offer = commerceOffersOf(product).find((item) => item.id === offerId && item.subject === subject)
      if (!offer) throw new Error(subject === 'personal' ? '未配置个人购买价格' : '未配置企业购买价格')
      if (subject === 'enterprise' && (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId)) {
        throw new Error('企业购买需要当前企业身份')
      }
      const isContract = subject === 'enterprise' && paymentMode === 'contract'
      const ownerType = subject
      const ownerId = subject === 'personal' ? user.context.currentMemberId : user.context.currentEnterpriseId!
      const stamp = now()
      const order: Order = {
        id: genId('order'),
        channel: 'app' as const,
        ownerType,
        ownerId,
        operatorMemberId: user.context.currentMemberId,
        productId,
        productName: product.name,
        productType: product.type,
        amount: offer.price,
        status: isContract ? 'pending_payment' : 'paid',
        entitlementGranted: false,
        entitlementPendingManual: false,
        commerceOfferId: offer.id,
        serviceMode: offer.serviceMode,
        selectedTermMonths: salePeriodMonthsOf(product),
        sellerId: product.sellerId,
        settlementMode: 'platform_collect' as const,
        paymentMethod: subject === 'personal'
          ? 'personal_online' as const
          : isContract
            ? 'enterprise_contract' as const
            : 'enterprise_balance' as const,
        createdAt: stamp,
        dataVersionUpdatedAt: product.typeDetail.dataset?.dataUpdatedAt,
        updateFrequencyAtPurchase: product.updateFrequency,
        paidAt: isContract ? undefined : stamp,
        note: isContract
          ? '企业合同采购，待平台确认到账后自动交付当前数据版本'
          : '平台已收款，正在交付当前数据版本'
      }
      useOrderStore().list.push(order)
      if (!isContract) useDatasetCommerceStore().fulfillSellerOrder(order.id)
      return order
    },
    /** 合同确认到账后自动交付，重复确认沿用原交付。 */
    adminConfirmSellerPayment(orderId: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || !order.sellerId) throw new Error('订单不存在或非入驻商家订单')
      if (order.biDeliveryId && ['paid', 'entitlement_active'].includes(order.status)) {
        useDatasetCommerceStore().fulfillSellerOrder(order.id)
        return order
      }
      if (order.status !== 'pending_payment' && order.status !== 'payment_pending_confirmation') {
        throw new Error('当前状态不可确认到账')
      }
      const stamp = now()
      order.status = 'paid'
      order.entitlementGranted = false
      order.entitlementPendingManual = false
      order.paidAt = stamp
      order.settlementMode = 'platform_collect'
      order.note = '平台已确认到账，正在交付当前数据版本'
      useDatasetCommerceStore().fulfillSellerOrder(order.id)
      return order
    },
    /** 兼容历史待开通订单；新交易在付款时即执行同一交付流程。 */
    adminActivateSellerOrder(orderId: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || !order.sellerId) throw new Error('订单不存在或非入驻商家订单')
      if (order.status !== 'pending_activation' && !order.biDeliveryId) throw new Error('仅已收款待交付订单可开通')
      useDatasetCommerceStore().fulfillSellerOrder(order.id)
      return order
    }
  }
})
