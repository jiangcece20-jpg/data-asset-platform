import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { listingCatalogSpecFromArtifact } from '@/domain/sellerListingSpec'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { sellerListingReviewLabel, useSellerMarketStore } from './sellerMarket'
import type { SellerListingApplication } from '@/types/sellerMarket'
import { useUserStore } from './user'
import { useDatasetCommerceStore } from './datasetCommerce'
import { mockBiDeliveryAdapter } from '@/services/bi/mockBiDeliveryAdapter'
import { useMineOrders } from '@/composables/useMineOrders'

function specFor(artifactId: string) {
  const artifact = useSellerMarketStore().artifacts.find((item) => item.id === artifactId)!
  return listingCatalogSpecFromArtifact(artifact)
}

describe('seller listing review labels', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const changes: Array<[Partial<NonNullable<SellerListingApplication['pendingTerms']>>, string]> = [
    [{ enterprisePrice: 1200 }, '价格变更审核中'],
    [{ servicePeriodMonths: 6 }, '资料变更审核中'],
    [{ updateFrequency: '每月更新' }, '资料变更审核中'],
    [{ coverage: '华东 20 仓' }, '资料变更审核中'],
    [{ updateFrequency: '每月更新', coverage: '华东 20 仓' }, '资料变更审核中'],
    [{ enterprisePrice: 1200, servicePeriodMonths: 6 }, '多项变更审核中'],
    [{ enterprisePrice: 1200, coverage: '华东 20 仓' }, '多项变更审核中'],
    [{}, '审核中']
  ]

  it.each(changes)('derives the review label from pending terms %j', (change, label) => {
    const listing = useSellerMarketStore().listings[0]!
    listing.status = 'published'
    listing.reviewStatus = 'change_pending'
    listing.pendingTerms = {
      enterprisePrice: listing.enterprisePrice,
      servicePeriodMonths: listing.servicePeriodMonths ?? 12,
      updateFrequency: listing.catalogSpec!.updateFrequency,
      coverage: listing.catalogSpec!.coverage,
      ...change
    }
    const before = JSON.parse(JSON.stringify(listing))
    expect(sellerListingReviewLabel(listing)).toBe(label)
    expect(listing).toEqual(before)
    listing.reviewStatus = 'change_rejected'
    expect(sellerListingReviewLabel(listing)).toBe('驳回')
    listing.reviewStatus = 'approved'
    expect(sellerListingReviewLabel(listing)).toBe('已通过')
  })
})

describe('sellerMarket listing catalog spec', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('restores the original seller product manually and prevents the seller from undoing platform delisting', () => {
    const seller = useSellerMarketStore()
    const catalog = useCatalogStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp', title: '恢复上架测试', subtitle: '时效分析',
      enterprisePrice: 990, servicePeriodMonths: 12, complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })
    seller.decideListing(listing.id, 'published')
    const id = listing.productId!
    const product = catalog.byId(id)!
    const count = catalog.products.length
    seller.forceDelist(id, '主动下架', seller.myProfile!.displayName, 'seller')
    expect(product.lastListingChange).toMatchObject({ mode: 'manual', action: 'delist' })
    seller.restoreListing(id, 'seller')
    expect(product.availability).toBe('delisted')
    seller.reviewListingRestore(listing.id, true, '恢复条件已核实')
    expect(listing.status).toBe('published')
    expect(product.lastListingChange).toMatchObject({ mode: 'manual', action: 'publish' })
    expect(catalog.products.length).toBe(count)
    seller.forceDelist(id, '强制下架')
    expect(() => seller.restoreListing(id, 'seller')).toThrow('平台下架须由平台恢复')
    expect(product.availability).toBe('delisted')
    seller.restoreListing(id)
    expect(product.availability).toBe('delisted')
    seller.reviewListingRestore(listing.id, true, '平台恢复条件已核实')
    expect(product.availability).toBe('published')
    expect(listing.productId).toBe(id)
    seller.forceDelist(id)
    seller.profiles.find(item => item.id === product.sellerId)!.status = 'suspended'
    expect(() => seller.restoreListing(id)).toThrow('准入未通过')
  })

  it.each(['实时更新', '每日更新', '每周更新', '每月更新', '每季度更新', '不定期'])('publishes %s as a recurring merchant offer', (updateFrequency) => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp', title: '华东干线时效数据集', subtitle: '时效分析',
      enterprisePrice: 990, servicePeriodMonths: 12, complianceSummary: '已脱敏',
      catalogSpec: { ...specFor('artifact-route-otp'), updateFrequency }
    })
    seller.decideListing(listing.id, 'published')
    expect(useCatalogStore().byId(listing.productId!)?.commerceOffers).toEqual([
      expect.objectContaining({ subject: 'enterprise', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 12 })
    ])
    seller.submitListingTerms(listing.id, { enterprisePrice: 1200, servicePeriodMonths: 6, updateFrequency, coverage: '华东' })
    seller.reviewListingTerms(listing.id, true, '通过')
    expect(useCatalogStore().byId(listing.productId!)?.commerceOffers?.[0]).toMatchObject({ serviceMode: 'continuous', billingPeriodMonths: 6 })
  })

  it.each(['一次性', '不更新', '', '待定'])('rejects invalid merchant term frequency (%s) without changing live terms', (updateFrequency) => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp', title: '华东干线时效数据集', subtitle: '时效分析',
      enterprisePrice: 990, servicePeriodMonths: 12, complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })
    seller.decideListing(listing.id, 'published')
    const product = useCatalogStore().byId(listing.productId!)!
    const before = JSON.parse(JSON.stringify({ listing, product }))
    expect(() => seller.submitListingTerms(listing.id, {
      enterprisePrice: 1200, servicePeriodMonths: 6, updateFrequency, coverage: '华东 20 仓'
    })).toThrow('商家仅支持持续更新，请选择更新频率')
    expect({ listing, product }).toEqual(before)
  })

  it('blocks approval of a stale one-time application without changing review state', () => {
    const seller = useSellerMarketStore()
    const listing = seller.listings[0]!
    listing.catalogSpec = { ...listing.catalogSpec!, updateFrequency: '一次性' }
    const before = JSON.parse(JSON.stringify(listing))
    expect(() => seller.decideListing(listing.id, 'published', '通过')).toThrow('商家仅支持持续更新')
    expect(listing).toEqual(before)
    expect(listing.productId).toBeUndefined()
  })

  it('blocks approval of stale one-time term changes', () => {
    const seller = useSellerMarketStore()
    const listing = seller.listings[0]!
    seller.decideListing(listing.id, 'published')
    listing.pendingTerms = { enterprisePrice: 1200, servicePeriodMonths: 6, updateFrequency: '一次性', coverage: '华东' }
    listing.reviewStatus = 'change_pending'
    const product = useCatalogStore().byId(listing.productId!)!
    const before = JSON.parse(JSON.stringify({ listing, product }))
    expect(() => seller.reviewListingTerms(listing.id, true, '通过')).toThrow('商家仅支持持续更新')
    expect({ listing, product }).toEqual(before)
  })

  it('rejects a free merchant listing', () => {
    const seller = useSellerMarketStore()
    expect(() => seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效数据集',
      subtitle: '时效分析',
      enterprisePrice: 0,
      servicePeriodMonths: 12,
      complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })).toThrow('请填写企业购买价格')
  })

  it('rejects an invalid service period', () => {
    const seller = useSellerMarketStore()
    expect(() => seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效数据集',
      subtitle: '时效分析',
      enterprisePrice: 990,
      servicePeriodMonths: 0,
      complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })).toThrow('请填写服务周期')
  })

  it('publishes seller-filled storefront fields onto the catalog product', () => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-warehouse-health',
      title: '仓网周转健康数据集',
      subtitle: '周转与积压风险',
      enterprisePrice: 1290,
      servicePeriodMonths: 6,
      complianceSummary: '衍生数据禁止再转售明细',
      catalogSpec: {
        ...specFor('artifact-warehouse-health'),
        granularity: '仓库 × 品类 × 周',
        timeRange: '近 6 个月',
        rowCount: 18600,
        coverage: '华东 12 仓',
        updateFrequency: '每周更新',
        scenarios: ['仓储运营'],
        description: '仓网周转天数、积压 SKU 与补货建议',
        valueProposition: '快速识别高积压仓与滞销品类。',
        qualityPromise: '基于已购数据集二次加工，受源许可约束',
        complianceNote: '衍生数据；使用受限，禁止再转售明细'
      }
    })
    expect(listing.catalogSpec?.coverage).toBe('华东 12 仓')
    expect(listing.enterprisePrice).toBe(1290)
    expect(listing.servicePeriodMonths).toBe(6)
    expect(listing.reviewStatus).toBe('pending_review')

    seller.decideListing(listing.id, 'published')
    expect(listing.reviewStatus).toBe('approved')
    const product = useCatalogStore().byId(listing.productId!)
    expect(product?.coverage).toBe('华东 12 仓')
    expect(product?.updateFrequency).toBe('每周更新')
    expect(product?.scenarios).toEqual(['仓储运营'])
    expect(product?.description).toBe('仓网周转天数、积压 SKU 与补货建议')
    expect(product?.valueProposition).toBe('快速识别高积压仓与滞销品类。')
    expect(product?.qualityPromise).toContain('二次加工')
    expect(product?.complianceNote).toContain('禁止再转售明细')
    expect(product?.typeDetail.dataset?.granularity).toBe('仓库 × 品类 × 周')
    expect(product?.typeDetail.dataset?.rowCount).toBe(18600)
    expect(product?.sellingShots).toBeUndefined()
    expect(product?.settlementModeDefault).toBe('platform_collect')
    expect(product?.salePeriodMonths).toBe(6)
    expect(product?.commerceOffers?.map((offer) => [offer.subject, offer.price])).toEqual([['enterprise', 1290]])
    expect(product?.commerceOffers?.[0]?.serviceMode).toBe('continuous')
    expect(product?.memberIncluded).toBe(false)
    expect(product?.acquisitions).toEqual(['item_purchase'])
  })

  it('keeps review approval after a merchant product is delisted', () => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp', title: '华东干线时效数据集', subtitle: '时效分析',
      enterprisePrice: 990, servicePeriodMonths: 12, complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })
    seller.decideListing(listing.id, 'published')
    seller.forceDelist(listing.productId!, '平台强制下架')
    expect(listing.status).toBe('delisted')
    expect(listing.reviewStatus).toBe('approved')
    expect(listing.lastOperatorName).toBe('平台运营')
  })

  it('applies display edits immediately but waits for review before changing sale terms', () => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp', title: '华东干线时效数据集', subtitle: '时效分析',
      enterprisePrice: 990, servicePeriodMonths: 12, complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })
    seller.decideListing(listing.id, 'published')
    const product = useCatalogStore().byId(listing.productId!)!
    seller.saveListingDisplay(listing.id, { title: '华东干线数据集（新版）', subtitle: '新简介', description: '新内容说明' })
    expect(product.name).toBe('华东干线数据集（新版）')
    expect(product.description).toBe('新内容说明')
    seller.submitListingTerms(listing.id, { enterprisePrice: 1200, servicePeriodMonths: 6, updateFrequency: '每周更新', coverage: '华东 20 仓' })
    expect(listing.reviewStatus).toBe('change_pending')
    expect(product.price.itemPrice).toBe(990)
    expect(product.updateFrequency).toBe('每日更新')
    expect(() => seller.submitListingTerms(listing.id, { enterprisePrice: 1300, servicePeriodMonths: 6, updateFrequency: '每周更新', coverage: '华东 20 仓' })).toThrow('变更审核中')
    seller.reviewListingTerms(listing.id, false, '需核实数据范围')
    expect(listing.reviewStatus).toBe('change_rejected')
    expect(listing.pendingTerms?.enterprisePrice).toBe(1200)
    seller.submitListingTerms(listing.id, { enterprisePrice: 1200, servicePeriodMonths: 6, updateFrequency: '每周更新', coverage: '华东 20 仓' })
    seller.reviewListingTerms(listing.id, true, '审核通过')
    expect(listing.reviewStatus).toBe('approved')
    expect(product.price.itemPrice).toBe(1200)
    expect(product.updateFrequency).toBe('每周更新')
    expect(product.salePeriodMonths).toBe(6)
  })
})

describe('sellerMarket platform checkout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockBiDeliveryAdapter.reset()
  })

  it('automatically activates a newly approved enterprise listing after online payment', () => {
    useUserStore().completeEnterpriseAuth()
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效数据集',
      subtitle: '时效分析',
      enterprisePrice: 990,
      servicePeriodMonths: 6,
      complianceSummary: '已脱敏',
      catalogSpec: { ...specFor('artifact-route-otp'), updateFrequency: '每日更新' }
    })
    seller.decideListing(listing.id, 'published')
    const order = seller.purchaseSellerProduct(listing.productId!, `offer-${listing.productId}-enterprise`)
    expect(order.status).toBe('entitlement_active')
    expect(order.selectedTermMonths).toBe(6)
    expect(order.entitlementGranted).toBe(true)
    const entitlement = useEntitlementStore().list.find((item) => item.orderId === order.id)
    expect(entitlement?.serviceMode).toBe('continuous')
    expect(entitlement?.validTo).toBeUndefined()
    expect(entitlement?.updateValidTo).toBeTruthy()
    expect(entitlement?.allowDownload).toBe(true)
    const delivery = useDatasetCommerceStore().deliveries.find((item) => item.orderId === order.id)
    expect(delivery).toMatchObject({
      entitlementId: entitlement!.id, productId: listing.productId,
      ownerType: 'enterprise', ownerId: 'ent-wanlian-logistics',
      status: 'delivered', attemptCount: 1,
      biEntryUrl: expect.stringContaining('/bi/workbench/dataset/')
    })
    expect(useDatasetCommerceStore().visibleDeliveries).toContainEqual(delivery)
    expect(useMineOrders().findOrder('app', order.id)).toMatchObject({ canUseDataset: true, deliveryStatus: '已交付' })
  })

  it.each(['一次性', ' 一次性 '])('rejects merchant one-time creation (%s) without adding an application', (updateFrequency) => {
    const seller = useSellerMarketStore()
    const before = JSON.parse(JSON.stringify(seller.listings))
    expect(() => seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效数据集',
      subtitle: '时效分析',
      enterprisePrice: 990,
      servicePeriodMonths: 12,
      complianceSummary: '已脱敏',
      catalogSpec: { ...specFor('artifact-route-otp'), updateFrequency }
    })).toThrow('商家仅支持持续更新，请选择更新频率')
    expect(seller.listings).toEqual(before)
  })

  it('delivers a new personal purchase without rewriting the historical pending order', () => {
    const seller = useSellerMarketStore()
    const historical = useOrderStore().list.find((item) => item.id === 'order-seller-paid-001')!
    const beforeHistorical = JSON.parse(JSON.stringify(historical))
    const order = seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-personal')
    expect(order).toMatchObject({
      ownerType: 'personal',
      amount: 199,
      settlementMode: 'platform_collect',
      status: 'entitlement_active',
      entitlementGranted: true
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-route-board')!)).toBe('item')
    expect(useDatasetCommerceStore().deliveries.find((item) => item.orderId === order.id)?.status).toBe('delivered')
    expect(historical).toEqual(beforeHistorical)
  })

  it('collects enterprise list price without member discount and delivers immediately', () => {
    useUserStore().completeEnterpriseAuth()
    useOrderStore().purchaseMember()
    const seller = useSellerMarketStore()
    const order = seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-enterprise')
    expect(order).toMatchObject({
      ownerType: 'enterprise',
      ownerId: 'ent-wanlian-logistics',
      amount: 1990,
      settlementMode: 'platform_collect',
      status: 'entitlement_active'
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-route-board')!)).toBe('enterprise')
  })

  it('holds enterprise contract orders until ops confirms payment then activates', () => {
    useUserStore().completeEnterpriseAuth()
    const seller = useSellerMarketStore()
    const order = seller.purchaseSellerProduct('prod-seller-warehouse-board', 'offer-seller-wh-enterprise', 'contract')
    expect(order.status).toBe('pending_payment')
    expect(order.entitlementGranted).toBe(false)
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-warehouse-board')!)).toBe('none')

    seller.adminConfirmSellerPayment(order.id)
    expect(useOrderStore().list.find((item) => item.id === order.id)).toMatchObject({
      status: 'entitlement_active',
      entitlementGranted: true,
      settlementMode: 'platform_collect'
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-warehouse-board')!)).toBe('enterprise')
  })

  it('blocks new orders after delisting without charging or granting access', () => {
    useUserStore().completeEnterpriseAuth()
    const seller = useSellerMarketStore()
    seller.forceDelist('prod-seller-route-board')
    const orders = useOrderStore().list.length
    const entitlements = useEntitlementStore().list.length
    const deliveries = useDatasetCommerceStore().deliveries.length
    expect(() => seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-enterprise')).toThrow('当前不可购买')
    expect(useOrderStore().list).toHaveLength(orders)
    expect(useEntitlementStore().list).toHaveLength(entitlements)
    expect(useDatasetCommerceStore().deliveries).toHaveLength(deliveries)
  })

  it('fulfills an existing contract after delisting and makes repeated confirmation idempotent', () => {
    useUserStore().completeEnterpriseAuth()
    const seller = useSellerMarketStore()
    const order = seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-enterprise', 'contract')
    seller.forceDelist(order.productId)
    seller.adminConfirmSellerPayment(order.id)
    const delivery = useDatasetCommerceStore().deliveries.find((item) => item.orderId === order.id)
    expect(delivery?.status).toBe('delivered')
    seller.adminConfirmSellerPayment(order.id)
    seller.adminActivateSellerOrder(order.id)
    expect(useDatasetCommerceStore().deliveries.filter((item) => item.orderId === order.id)).toHaveLength(1)
    expect(useEntitlementStore().list.filter((item) => item.orderId === order.id)).toHaveLength(1)
    expect(delivery?.attemptCount).toBe(1)
  })

  it('retries the same failed paid delivery after delisting without duplicating the grant', () => {
    useUserStore().completeEnterpriseAuth()
    const seller = useSellerMarketStore()
    mockBiDeliveryAdapter.failNext()
    const order = seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-enterprise')
    const commerce = useDatasetCommerceStore()
    const delivery = commerce.deliveries.find((item) => item.orderId === order.id)!
    expect(delivery).toMatchObject({ status: 'failed', attemptCount: 1 })
    expect(order.entitlementGranted).toBe(false)
    seller.forceDelist(order.productId)
    commerce.retryDelivery(delivery.id)
    expect(delivery).toMatchObject({ status: 'delivered', attemptCount: 2 })
    expect(order.status).toBe('entitlement_active')
    expect(commerce.deliveries.filter((item) => item.orderId === order.id)).toHaveLength(1)
    expect(useEntitlementStore().list.filter((item) => item.orderId === order.id)).toHaveLength(1)
  })

  it('snapshots the source data update time independently of product and quality edits', () => {
    useUserStore().completeEnterpriseAuth()
    const product = useCatalogStore().byId('prod-seller-route-board')!
    product.typeDetail.dataset!.dataUpdatedAt = '2026-10-01T08:00:00'
    product.typeDetail.dataset!.qualityUpdatedAt = '2026-10-05'
    const order = useSellerMarketStore().purchaseSellerProduct(product.id, 'offer-seller-route-enterprise')
    expect(order.dataVersionUpdatedAt).toBe('2026-10-01T08:00:00')
    expect(useDatasetCommerceStore().deliveries.find((item) => item.orderId === order.id)?.dataVersionUpdatedAt).toBe('2026-10-01T08:00:00')
  })
})
