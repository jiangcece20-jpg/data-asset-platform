import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { listingCatalogSpecFromArtifact } from '@/domain/sellerListingSpec'

// Review examples use the real workflow in a separate, non-persistent store graph.
export function createSellerReviewSamplePinia() {
  const previous = getActivePinia()
  const pinia = createPinia()
  try {
    const seller = useSellerMarketStore(pinia)
    const initial = seller.listings.find(listing => listing.id === 'listing-pending-driver')!
    const publish = (artifactId: string, id: string, title: string) => {
      const artifact = seller.artifacts.find(item => item.id === artifactId)!
      const listing = seller.submitListing({
        artifactId, title, subtitle: artifact.name, enterprisePrice: 990,
        servicePeriodMonths: 12, complianceSummary: artifact.licenseSummary,
        catalogSpec: listingCatalogSpecFromArtifact(artifact)
      })
      listing.id = id
      seller.decideListing(id, 'published', '首次资料审批通过')
      return listing
    }
    const pending = publish('artifact-route-otp', 'listing-sample-price-pending', '华东干线时效数据集')
    seller.submitListingTerms(pending.id, {
      enterprisePrice: 1200, servicePeriodMonths: pending.servicePeriodMonths!,
      updateFrequency: pending.catalogSpec!.updateFrequency, coverage: pending.catalogSpec!.coverage
    })
    const delisted = publish('artifact-warehouse-health', 'listing-sample-approved-delisted', '仓网周转健康数据集')
    seller.forceDelist(delisted.productId!, '运营人工下架', '平台运营')
    seller.listings = [initial, pending, delisted]
    return pinia
  } finally {
    if (previous) setActivePinia(previous)
  }
}
