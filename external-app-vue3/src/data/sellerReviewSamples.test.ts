import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createSellerReviewSamplePinia } from './sellerReviewSamples'
import { useSellerMarketStore, sellerListingReviewLabel, sellerListingSaleLabel } from '@/stores/sellerMarket'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'

describe('isolated merchant review examples', () => {
  it('provides all three independent review and listing combinations', () => {
    const root = createPinia()
    setActivePinia(root)
    const samples = createSellerReviewSamplePinia()
    expect(getActivePinia()).toBe(root)
    const seller = useSellerMarketStore(samples)
    const catalog = useCatalogStore(samples)
    expect(seller.listings.map(listing => [sellerListingReviewLabel(listing), sellerListingSaleLabel(listing)])).toEqual([
      ['审核中', '未上架'],
      ['价格变更审核中', '上架'],
      ['已通过', '已下架']
    ])
    const pending = seller.listings[1]!
    expect(pending.pendingTerms!.enterprisePrice).not.toBe(pending.enterprisePrice)
    expect(catalog.byId(pending.productId!)!.price.itemPrice).toBe(pending.enterprisePrice)
    expect(catalog.byId(seller.listings[2]!.productId!)!.availability).toBe('delisted')
  })

  it('does not change normal prototype listings, products, or orders', () => {
    const root = createPinia()
    setActivePinia(root)
    const seller = useSellerMarketStore(root)
    const catalog = useCatalogStore(root)
    const orders = useOrderStore(root)
    const before = JSON.stringify({ listings: seller.listings, products: catalog.products, orders: orders.list })
    const samples = createSellerReviewSamplePinia()
    const isolatedSeller = useSellerMarketStore(samples)
    isolatedSeller.reviewListingTerms(isolatedSeller.listings[1]!.id, true, '核验完成')
    expect(JSON.stringify({ listings: seller.listings, products: catalog.products, orders: orders.list })).toBe(before)
  })
})
