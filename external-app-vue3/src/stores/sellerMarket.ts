import { defineStore } from 'pinia'
import type { Product } from '@/types/domain'
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
import { salePeriodMonthsOf } from '@/domain/commerceOffers'
import { assertRequiredSellingShots, assertCustomSellingShots, exampleSellingShots, type CustomSellingShot, type SellingShot } from '@/domain/sellingShotTemplate'

const seedArtifacts: ListableArtifact[] = [
  {
    id: 'artifact-route-otp',
    name: '华东干线时效看板',
    type: 'dashboard',
    version: 'v1.2.0',
    sourceModule: 'bi-workbench',
    dataProvenance: 'owned',
    licenseSummary: '自有运单加工，可上架售卖',
    updatedAt: '2026-08-01'
  },
  {
    id: 'artifact-warehouse-health',
    name: '仓网周转健康看板',
    type: 'dashboard',
    version: 'v1.0.1',
    sourceModule: 'bi-workbench',
    dataProvenance: 'derived',
    licenseSummary: '含已购衍生字段，上架须声明源约束',
    updatedAt: '2026-08-05'
  },
  {
    id: 'artifact-driver-score',
    name: '司机绩效周报看板',
    type: 'dashboard',
    version: 'v0.9.0',
    sourceModule: 'bi-workbench',
    dataProvenance: 'owned',
    licenseSummary: '自有绩效指标，可上架',
    updatedAt: '2026-07-25'
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
    title: '司机绩效周报看板',
    subtitle: '基于用数成果申请上架的绩效看板',
    price: 99,
    dataProvenance: 'owned',
    complianceSummary: '无个人信息对外售卖；自有数据',
    shots: exampleSellingShots(),
    customShots: [],
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
        .filter((o) => o.sellerId === me.id && o.settlementMode === 'seller_self')
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
      complianceSummary: string
      shots: SellingShot[]
      customShots?: CustomSellingShot[]
    }) {
      const me = this.myProfile
      if (!me || me.status !== 'approved') throw new Error('仅已准入卖家可提交上架')
      const artifact = this.artifacts.find((a) => a.id === input.artifactId)
      if (!artifact) throw new Error('可上架对象不存在')
      const shots = assertRequiredSellingShots(input.shots)
      const customShots = assertCustomSellingShots(input.customShots)
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
        dataProvenance: artifact.dataProvenance,
        complianceSummary: input.complianceSummary,
        shots,
        customShots,
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
      const product: Product = existing || {
        id: productId,
        resourceId,
        name: listing.title,
        subtitle: listing.subtitle,
        type: 'dashboard',
        origin: 'seller_market',
        dealChannel: 'app_payment',
        availability: 'published',
        acquisitions: ['item_purchase'],
        entitlementPolicy: { kind: 'term', months: 12 },
        scenarios: ['入驻商家看板'],
        provider: `入驻商家 · ${listing.sellerName}`,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        dataProvenance: listing.dataProvenance,
        settlementModeDefault: 'seller_self',
        coverage: '卖家声明覆盖范围',
        updateFrequency: '按看板配置',
        qualityPromise: '由入驻商家提供口径说明',
        complianceNote: listing.complianceSummary,
        price: { model: 'item_only', itemPrice: listing.price, unit: '元' },
        commerceOffers: [
          {
            id: `offer-${productId}-personal`,
            name: '个人版',
            subject: 'personal',
            price: listing.price,
            currency: 'CNY',
            serviceMode: 'one_time',
            contentKind: 'fixed_dashboard',
            accessScope: 'personal',
            allowDownload: false,
            recommended: true
          }
        ],
        status: 'published',
        tags: ['入驻商家'],
        description: listing.subtitle,
        valueProposition: '入驻商家用数成果',
        deliveryMethod: 'APP 在线看板（卖家确认到账后开通）',
        memberIncluded: false,
        listedAt: now().slice(0, 10),
        updatedAt: now().slice(0, 10),
        sellingShots: listing.shots,
        customSellingShots: listing.customShots,
        serviceStatus: 'normal',
        typeDetail: {
          dashboard: {
            timeRange: '近 12 个月',
            updateCycle: '按卖家配置',
            metrics: [
              {
                name: '核心指标',
                definition: '上架审核通过的看板指标',
                formula: '见看板说明',
                dimensions: ['默认'],
                preview: 'visible',
                previewValue: '—'
              }
            ],
            panels: [{ id: 'panel-main', title: '主视图', chartType: 'line', preview: 'visible', summary: '预览区' }],
            exportRule: '购买后在线查看'
          }
        }
      }
      if (!existing) {
        catalog.products.unshift(product)
        if (!catalog.resources.some((r) => r.id === resourceId)) {
          catalog.resources.unshift({
            id: resourceId,
            resourceName: product.name,
            type: 'dashboard',
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
        existing.sellingShots = listing.shots
        existing.customSellingShots = listing.customShots
        if (existing.commerceOffers?.[0]) existing.commerceOffers[0].price = listing.price
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
    /** 买家下单：自收款 → 待卖家确认到账 */
    purchaseSellerProduct(productId: string, offerId: string, _selectedTermMonths?: number) {
      const catalog = useCatalogStore()
      const product = catalog.byId(productId)
      if (!product || product.origin !== 'seller_market' || product.dealChannel !== 'app_payment') {
        throw new Error('仅支持入驻商家商品自收款购买')
      }
      if (!product.sellerId) throw new Error('商品缺少卖家信息')
      const offer = (product.commerceOffers || []).find((o) => o.id === offerId && o.subject === 'personal')
      if (!offer) throw new Error('未配置个人价格方案')
      const user = useUserStore()
      const amount = offer.price
      const stamp = now()
      const order = {
        id: genId('order'),
        channel: 'app' as const,
        ownerType: 'personal' as const,
        ownerId: user.context.currentMemberId,
        productId,
        productName: product.name,
        productType: product.type,
        amount,
        status: 'payment_pending_confirmation' as const,
        entitlementGranted: false,
        commerceOfferId: offer.id,
        serviceMode: offer.serviceMode,
        selectedTermMonths: salePeriodMonthsOf(product),
        sellerId: product.sellerId,
        settlementMode: 'seller_self' as const,
        buyerPaidClaimedAt: stamp,
        createdAt: stamp,
        note: '买家已标记付款，待卖家确认到账后开通看板权益'
      }
      useOrderStore().list.push(order)
      return order
    },
    confirmSellerPayment(orderId: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || order.settlementMode !== 'seller_self') throw new Error('订单不存在或非自收款')
      if (order.status !== 'payment_pending_confirmation') throw new Error('当前状态不可确认到账')
      const me = this.myProfile
      const isOwner = me && order.sellerId === me.id
      if (!isOwner) throw new Error('仅该商品卖家可确认到账')
      const catalog = useCatalogStore()
      const product = catalog.byId(order.productId)
      if (!product) throw new Error('商品不存在')
      order.status = 'entitlement_active'
      order.entitlementGranted = true
      order.sellerConfirmedAt = now()
      order.paidAt = order.sellerConfirmedAt
      order.note = '卖家已确认到账，看板权益已开通'
      useEntitlementStore().grantItem(product, order.ownerId)
      return order
    },
    /** 运营代确认（争议协助 / 演示） */
    adminConfirmSellerPayment(orderId: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || order.settlementMode !== 'seller_self') throw new Error('订单不存在或非自收款')
      if (order.status !== 'payment_pending_confirmation') throw new Error('当前状态不可确认')
      const catalog = useCatalogStore()
      const product = catalog.byId(order.productId)
      if (!product) throw new Error('商品不存在')
      order.status = 'entitlement_active'
      order.entitlementGranted = true
      order.sellerConfirmedAt = now()
      order.paidAt = order.sellerConfirmedAt
      order.note = '运营代确认到账，看板权益已开通'
      useEntitlementStore().grantItem(product, order.ownerId)
      return order
    },
    disputeSellerPayment(orderId: string, reason: string) {
      const orders = useOrderStore()
      const order = orders.list.find((o) => o.id === orderId)
      if (!order || order.settlementMode !== 'seller_self') throw new Error('订单不存在或非自收款')
      if (order.status !== 'payment_pending_confirmation') throw new Error('当前状态不可操作')
      const me = this.myProfile
      if (!me || order.sellerId !== me.id) throw new Error('仅该商品卖家可操作')
      order.status = 'payment_failed'
      order.disputeReason = reason
      order.note = `卖家未确认到账：${reason}`
      return order
    }
  }
})
