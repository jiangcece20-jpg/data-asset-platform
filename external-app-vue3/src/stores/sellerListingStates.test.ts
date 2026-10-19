import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSellerMarketStore, sellerListingSaleLabel, sellerListingReviewLabel } from './sellerMarket'
import { useCatalogStore } from './catalog'
import { listingCatalogSpecFromArtifact } from '@/domain/sellerListingSpec'

describe('merchant independent approval and listing states', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function publishedListing() {
    const seller = useSellerMarketStore()
    const artifact = seller.artifacts[0]!
    const listing = seller.submitListing({ artifactId: artifact.id, title: artifact.name, subtitle: '时效分析', enterprisePrice: 990, servicePeriodMonths: 12, complianceSummary: '已脱敏', catalogSpec: listingCatalogSpecFromArtifact(artifact) })
    expect(listing.listingStatus).toBe('unlisted')
    seller.decideListing(listing.id, 'published', '首次审批通过')
    return { seller, listing, product: useCatalogStore().byId(listing.productId!)! }
  }

  it('retains approval and pending terms when delisted', () => {
    const { seller, listing, product } = publishedListing()
    seller.submitListingTerms(listing.id, { enterprisePrice: 1200, servicePeriodMonths: 12, updateFrequency: listing.catalogSpec!.updateFrequency, coverage: listing.catalogSpec!.coverage })
    seller.forceDelist(product.id, '商家主动下架', '陈静', 'seller')
    expect(listing.listingStatus).toBe('delisted')
    expect(listing.reviewStatus).toBe('change_pending')
    expect(sellerListingSaleLabel(listing)).toBe('已下架')
    expect(sellerListingReviewLabel(listing)).toBe('价格变更审核中')
    seller.reviewListingTerms(listing.id, true, '变更审批通过')
    expect(listing.listingStatus).toBe('delisted')
    expect(product.availability).toBe('delisted')
    expect(sellerListingReviewLabel(listing)).toBe('已通过')
  })

  it('keeps the original review conclusion after manual delisting', () => {
    const { seller, listing, product } = publishedListing()
    seller.forceDelist(product.id, '停止新售')
    expect(listing.reviewNote).toBe('首次审批通过')
    expect(listing.delistNote).toBe('停止新售')
    expect(sellerListingReviewLabel(listing)).toBe('已通过')
  })

  it('requires approval to restore and never publishes a pending restore request', () => {
    const { seller, listing, product } = publishedListing()
    seller.forceDelist(product.id, '主动下架', '陈静', 'seller')
    const count = useCatalogStore().products.length
    seller.restoreListing(product.id, 'seller')
    expect(listing.restoreReview?.status).toBe('pending_review')
    expect(listing.listingStatus).toBe('delisted')
    expect(product.availability).toBe('delisted')
    expect(() => seller.restoreListing(product.id, 'seller')).toThrow('恢复申请审批中')
    expect(() => seller.reviewListingRestore(listing.id, false, '')).toThrow('驳回必须填写原因')
    seller.reviewListingRestore(listing.id, false, '问题未解决')
    expect(product.availability).toBe('delisted')
    expect(listing.restoreReview?.note).toBe('问题未解决')
    seller.restoreListing(product.id, 'seller')
    seller.reviewListingRestore(listing.id, true, '已核实发布条件')
    expect(listing.listingStatus).toBe('published')
    expect(product.availability).toBe('published')
    expect(useCatalogStore().products.length).toBe(count)
    expect(listing.productId).toBe(product.id)
  })

  it('does not restore on approval when access was suspended meanwhile', () => {
    const { seller, listing, product } = publishedListing()
    seller.forceDelist(product.id, '主动下架', '陈静', 'seller')
    seller.restoreListing(product.id, 'seller')
    seller.profiles.find(p => p.id === listing.sellerId)!.status = 'suspended'
    expect(() => seller.reviewListingRestore(listing.id, true, '通过')).toThrow('准入未通过')
    expect(product.availability).toBe('delisted')
    expect(listing.restoreReview?.status).toBe('pending_review')
  })

  it('allows existing prototype merchant products to enter restore approval without rebuilding the product', () => {
    const seller = useSellerMarketStore()
    const catalog = useCatalogStore()
    const product = catalog.products.find(p => p.origin === 'seller_market' && p.sellerId === 'seller-chenjing')!
    const count = catalog.products.length
    expect(seller.listings.some(l => l.productId === product.id)).toBe(false)
    seller.forceDelist(product.id, '平台下架')
    seller.restoreListing(product.id)
    const listing = seller.listings.find(l => l.productId === product.id)!
    expect(listing.restoreReview?.status).toBe('pending_review')
    expect(product.availability).toBe('delisted')
    seller.reviewListingRestore(listing.id, true, '核实通过')
    expect(product.availability).toBe('published')
    expect(catalog.products.length).toBe(count)
  })
})
