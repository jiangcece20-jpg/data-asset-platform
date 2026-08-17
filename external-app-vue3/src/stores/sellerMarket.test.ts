import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { exampleSellingShot, exampleSellingShots } from '@/domain/sellingShotTemplate'
import { useCatalogStore } from './catalog'
import { useSellerMarketStore } from './sellerMarket'

describe('sellerMarket selling shots', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rejects listing without required screenshot slots', () => {
    const seller = useSellerMarketStore()
    expect(() => seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效看板',
      subtitle: '时效分析',
      price: 99,
      complianceSummary: '已脱敏',
      shots: [exampleSellingShot('overview')]
    })).toThrow('请上传核心指标截图')
  })

  it('publishes selling shots onto the catalog product', () => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效看板（新）',
      subtitle: '时效分析',
      price: 128,
      complianceSummary: '已脱敏',
      shots: exampleSellingShots()
    })
    expect(listing.shots).toHaveLength(4)

    seller.decideListing(listing.id, 'published', '审过即发布')
    const product = useCatalogStore().byId(listing.productId!)
    expect(product?.sellingShots?.map((shot) => shot.slot)).toEqual(['overview', 'kpi', 'trend', 'finding'])
    expect(product?.sellingShots?.[0].caption).toContain('准点率')
  })
})
