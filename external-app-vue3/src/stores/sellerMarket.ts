import { defineStore } from 'pinia'
import type { CommerceOffer, Product } from '@/types/domain'
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
import { useEntitlementStore } from './entitlements'
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { sellerDatasetDetailByArtifact } from '@/data/sellerDatasets'
import {
  assertSellerListingSpec,
  datasetDetailFromListingSpec,
  listingCatalogSpecFromArtifact,
  type SellerListingCatalogSpec
} from '@/domain/sellerListingSpec'

export function assertSellerListingPrices(personalPrice: number, enterprisePrice: number) {
  if (!Number.isFinite(personalPrice) || personalPrice < 1) throw new Error('请填写个人购买价格')
  if (!Number.isFinite(enterprisePrice) || enterprisePrice < 1) throw new Error('请填写企业购买价格')
}

export function sellerItemOffers(productId: string, personalPrice: number, enterprisePrice: number): CommerceOffer[] {
  return [
    {
      id: `offer-${productId}-personal`,
      name: '个人单品',
      subject: 'personal',
      price: personalPrice,
      currency: 'CNY',
      serviceMode: 'one_time',
      contentKind: 'snapshot',
      accessScope: 'personal',
      allowDownload: false,
      recommended: true
    },
    {
      id: `offer-${productId}-enterprise`,
      name: '企业单品',
      subject: 'enterprise',
      price: enterprisePrice,
      currency: 'CNY',
      serviceMode: 'one_time',
      contentKind: 'snapshot',
      accessScope: 'enterprise_wide',
      allowDownload: false
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
            p.availability = 'paused'
            p.status = 'paused'
          })
        this.listings
          .filter((l) => l.sellerId === sellerId && l.status === 'published')
          .forEach((l) => {
            l.status = 'paused'
            l.updatedAt = now()
          })
      }
    },
    submitListing(input: {
      artifactId: string
      title: string
      subtitle: string
      price: number
      enterprisePrice: number
      complianceSummary: string
      catalogSpec: SellerListingCatalogSpec
    }) {
      const me = this.myProfile
      if (!me || me.status !== 'approved') throw new Error('仅已准入卖家可提交上架')
      const artifact = this.artifacts.find((a) => a.id === input.artifactId)
      if (!artifact) throw new Error('可上架对象不存在')
      assertSellerListingPrices(input.price, input.enterprisePrice)
      const catalogSpec = assertSellerListingSpec(input.catalogSpec)
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
        price: input.price,
        enterprisePrice: input.enterprisePrice,
        dataProvenance: artifact.dataProvenance,
        complianceSummary: catalogSpec.complianceNote || input.complianceSummary,
        catalogSpec,
        status: 'pending_review',
        createdAt: stamp,
        updatedAt: stamp
      }
      this.listings.unshift(listing)
      return listing
    },
    decideListing(listingId: string, decision: Extract<SellerListingStatus, 'published' | 'rejected' | 'need_supplement'>, note = '') {
      const listing = this.listings.find((l) => l.id === listingId)
      if (!listing) return
      listing.reviewNote = note
      listing.updatedAt = now()
      if (decision !== 'published') {
        listing.status = decision
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
        entitlementPolicy: { kind: 'term', months: 12 },
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
        price: { model: 'item_only', itemPrice: listing.price, unit: '元' },
        commerceOffers: sellerItemOffers(productId, listing.price, listing.enterprisePrice),
        status: 'published',
        tags: ['入驻商家', ...catalogSpec.scenarios.slice(0, 2)],
        description: catalogSpec.description,
        valueProposition: catalogSpec.valueProposition,
        deliveryMethod: '平台收款后由运营开通数据集查看与样例',
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
        existing.price = { model: 'item_only', itemPrice: listing.price, unit: '元' }
        existing.commerceOffers = sellerItemOffers(productId, listing.price, listing.enterprisePrice)
        existing.settlementModeDefault = 'platform_collect'
        existing.deliveryMethod = '平台收款后由运营开通数据集查看与样例'
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
      listing.status = 'published'
      listing.publishedAt = now()
      return listing
    },
    forceDelist(productId: string, note = '') {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      if (!product || product.origin !== 'seller_market') return
      product.availability = 'delisted'
      product.status = 'delisted'
      const listing = this.listings.find((l) => l.productId === productId)
      if (listing) {
        listing.status = 'delisted'
        listing.reviewNote = note || listing.reviewNote
        listing.updatedAt = now()
      }
    },
    /** 买家下单：打款到平台后进入待开通，由运营手动开通。企业合同采购先待确认到账。 */
    purchaseSellerProduct(productId: string, offerId: string, paymentMode: 'online' | 'contract' = 'online') {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      if (!product || product.origin !== 'seller_market' || product.dealChannel !== 'app_payment') {
        throw new Error('仅支持入驻商家商品购买')
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
      const order = {
        id: genId('order'),
        channel: 'app' as const,
        ownerType,
        ownerId,
        operatorMemberId: user.context.currentMemberId,
        productId,
        productName: product.name,
        productType: product.type,
        amount: offer.price,
        status: isContract ? 'pending_payment' as const : 'pending_activation' as const,
        entitlementGranted: false,
        entitlementPendingManual: !isContract,
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
        paidAt: isContract ? undefined : stamp,
        note: isContract
          ? '企业合同采购，待平台确认到账后进入待开通'
          : '平台已收款，待运营开通数据集；按合同与卖家结算'
      }
      useOrderStore().list.push(order)
      return order
    },
    /** 运营确认合同采购到账后进入待开通，仍不发权 */
    adminConfirmSellerPayment(orderId: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || !order.sellerId) throw new Error('订单不存在或非入驻商家订单')
      if (order.status !== 'pending_payment' && order.status !== 'payment_pending_confirmation') {
        throw new Error('当前状态不可确认到账')
      }
      const stamp = now()
      order.status = 'pending_activation'
      order.entitlementGranted = false
      order.entitlementPendingManual = true
      order.paidAt = stamp
      order.settlementMode = 'platform_collect'
      order.note = '平台已确认到账，待运营开通数据集；按合同与卖家结算'
      return order
    },
    /** 运营手动开通入驻商家数据集权益 */
    adminActivateSellerOrder(orderId: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || !order.sellerId) throw new Error('订单不存在或非入驻商家订单')
      if (order.status !== 'pending_activation') throw new Error('仅待开通订单可由运营开通')
      const catalog = useCatalogStore()
      const product = catalog.byId(order.productId)
      if (!product) throw new Error('商品不存在')
      const entitlement = useEntitlementStore().grantSellerDataset({
        product,
        orderId: order.id,
        ownerType: order.ownerType,
        ownerId: order.ownerId,
        operatorMemberId: order.operatorMemberId || (order.ownerType === 'personal' ? order.ownerId : ''),
        offerId: order.commerceOfferId || '',
        selectedTermMonths: order.selectedTermMonths
      })
      order.status = 'entitlement_active'
      order.entitlementGranted = true
      order.entitlementPendingManual = false
      order.entitlementId = entitlement.id
      order.note = '运营已开通数据集查看；平台按合同与卖家结算'
      return order
    }
  }
})
