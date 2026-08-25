import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { listingCatalogSpecFromArtifact } from '@/domain/sellerListingSpec'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useSellerMarketStore } from './sellerMarket'
import { useUserStore } from './user'

function specFor(artifactId: string) {
  const artifact = useSellerMarketStore().artifacts.find((item) => item.id === artifactId)!
  return listingCatalogSpecFromArtifact(artifact)
}

describe('sellerMarket listing catalog spec', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rejects listing without personal and enterprise prices', () => {
    const seller = useSellerMarketStore()
    expect(() => seller.submitListing({
      artifactId: 'artifact-route-otp',
      title: '华东干线时效数据集',
      subtitle: '时效分析',
      price: 0,
      enterprisePrice: 990,
      complianceSummary: '已脱敏',
      catalogSpec: specFor('artifact-route-otp')
    })).toThrow('请填写个人购买价格')
  })

  it('publishes seller-filled storefront fields onto the catalog product', () => {
    const seller = useSellerMarketStore()
    const listing = seller.submitListing({
      artifactId: 'artifact-warehouse-health',
      title: '仓网周转健康数据集',
      subtitle: '周转与积压风险',
      price: 129,
      enterprisePrice: 1290,
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

    seller.decideListing(listing.id, 'published')
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
    expect(product?.commerceOffers?.map((offer) => [offer.subject, offer.price])).toEqual([
      ['personal', 129],
      ['enterprise', 1290]
    ])
    expect(product?.memberIncluded).toBe(false)
    expect(product?.acquisitions).toEqual(['item_purchase'])
  })
})

describe('sellerMarket platform checkout', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('collects personal list price and waits for ops to activate', () => {
    const seller = useSellerMarketStore()
    const order = seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-personal')
    expect(order).toMatchObject({
      ownerType: 'personal',
      amount: 199,
      settlementMode: 'platform_collect',
      status: 'pending_activation',
      entitlementGranted: false
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-route-board')!)).toBe('none')

    seller.adminActivateSellerOrder(order.id)
    expect(useOrderStore().list.find((item) => item.id === order.id)?.status).toBe('entitlement_active')
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-route-board')!)).toBe('item')
  })

  it('collects enterprise list price without member discount and still waits for ops', () => {
    useUserStore().completeEnterpriseAuth()
    useOrderStore().purchaseMember()
    const seller = useSellerMarketStore()
    const order = seller.purchaseSellerProduct('prod-seller-route-board', 'offer-seller-route-enterprise')
    expect(order).toMatchObject({
      ownerType: 'enterprise',
      ownerId: 'ent-wanlian-logistics',
      amount: 1990,
      settlementMode: 'platform_collect',
      status: 'pending_activation'
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-route-board')!)).toBe('none')
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
      status: 'pending_activation',
      entitlementGranted: false,
      settlementMode: 'platform_collect'
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-warehouse-board')!)).toBe('none')

    seller.adminActivateSellerOrder(order.id)
    expect(useOrderStore().list.find((item) => item.id === order.id)).toMatchObject({
      status: 'entitlement_active',
      entitlementGranted: true
    })
    expect(useEntitlementStore().accessLevel(useCatalogStore().byId('prod-seller-warehouse-board')!)).toBe('enterprise')
  })
})
