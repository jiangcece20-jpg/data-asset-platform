import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import SellerMarketAdmin from './SellerMarketAdmin.vue'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { useCatalogStore } from '@/stores/catalog'
import { listingCatalogSpecFromArtifact } from '@/domain/sellerListingSpec'
import { createSellerReviewSamplePinia } from '@/data/sellerReviewSamples'

describe('SellerMarketAdmin listing content', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the three review examples without adding them to the normal store', async () => {
    const normalSeller = useSellerMarketStore()
    const before = JSON.stringify(normalSeller.listings)
    const wrapper = mount(SellerMarketAdmin, { global: { plugins: [createSellerReviewSamplePinia()] } })
    await wrapper.get('[data-testid="seller-admin-tab-listing"]').trigger('click')
    expect(wrapper.get('[data-testid="listing-review-listing-pending-driver"]').text()).toBe('审核中')
    expect(wrapper.get('[data-testid="listing-state-listing-pending-driver"]').text()).toBe('未上架')
    expect(wrapper.get('[data-testid="listing-review-listing-sample-price-pending"]').text()).toBe('价格变更审核中')
    expect(wrapper.get('[data-testid="listing-state-listing-sample-price-pending"]').text()).toBe('上架')
    expect(wrapper.get('[data-testid="listing-review-listing-sample-approved-delisted"]').text()).toBe('已通过')
    expect(wrapper.get('[data-testid="listing-state-listing-sample-approved-delisted"]').text()).toBe('已下架')
    expect(JSON.stringify(normalSeller.listings)).toBe(before)
  })

  it.each([
    ['draft', undefined, '未上架', '草稿'],
    ['pending_review', 'pending_review', '未上架', '审核中'],
    ['need_supplement', 'pending_review', '未上架', '驳回'],
    ['rejected', undefined, '未上架', '驳回'],
    ['paused', 'approved', '已下架', '已通过'],
    ['published', 'change_pending', '上架', '审核中'],
    ['published', 'change_rejected', '上架', '驳回'],
    ['delisted', 'approved', '已下架', '已通过']
  ] as const)('shows separate Chinese listing and review labels for %s', async (status, reviewStatus, saleLabel, reviewLabel) => {
    const listing = useSellerMarketStore().listings[0]!
    listing.status = status
    listing.reviewStatus = reviewStatus
    const wrapper = mount(SellerMarketAdmin)
    await wrapper.findAll('button').find((button) => button.text().includes('上架审核'))!.trigger('click')
    const state = wrapper.get(`[data-testid="listing-state-${listing.id}"]`)
    expect(wrapper.get('[data-testid="approval-state-heading"]').text()).toBe('审批状态')
    expect(wrapper.get('[data-testid="listing-state-heading"]').text()).toBe('上下架状态')
    expect(state.text()).toBe(saleLabel)
    expect(wrapper.get(`[data-testid="listing-review-${listing.id}"]`).text()).toBe(reviewLabel)
    expect(state.text()).not.toContain(status)
  })

  it('lets operators expand listing catalog spec without screenshot wall', async () => {
    const wrapper = mount(SellerMarketAdmin)
    const listingTab = wrapper.findAll('button').find((btn) => btn.text().includes('上架审核'))
    await listingTab!.trigger('click')
    expect(wrapper.text()).not.toContain('published')
    expect(wrapper.text()).not.toContain('pending_review')
    await wrapper.get('[data-testid="listing-shots-toggle-listing-pending-driver"]').trigger('click')
    expect(wrapper.find('[data-testid="selling-shot-gallery"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).toContain('司机 × 周')
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).not.toContain('个人价')
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).toContain('企业售价：¥990')
    expect(wrapper.get('[data-testid="listing-catalog-spec"]').text()).toContain('服务周期：12个月')
  })

  it('reviews a merchant sale-term change before its new price takes effect', async () => {
    const seller = useSellerMarketStore()
    const artifact = seller.artifacts.find((item) => item.id === 'artifact-route-otp')!
    const listing = seller.submitListing({
      artifactId: artifact.id, title: artifact.name, subtitle: '时效分析', enterprisePrice: 990,
      servicePeriodMonths: 12, complianceSummary: '已脱敏', catalogSpec: listingCatalogSpecFromArtifact(artifact)
    })
    seller.decideListing(listing.id, 'published')
    seller.submitListingTerms(listing.id, { enterprisePrice: 1200, servicePeriodMonths: 6, updateFrequency: '每周更新', coverage: '华东 20 仓' })
    const wrapper = mount(SellerMarketAdmin)
    await wrapper.findAll('button').find((button) => button.text().includes('上架审核'))!.trigger('click')
    expect(wrapper.get(`[data-testid="listing-review-${listing.id}"]`).text()).toBe('多项变更审核中')
    await wrapper.get(`[data-testid="review-change-${listing.id}"]`).trigger('click')
    expect(wrapper.get('[data-testid="terms-review-modal"]').text()).toContain('¥990')
    expect(wrapper.get('[data-testid="terms-review-modal"]').text()).toContain('¥1200')
    await wrapper.get('[data-testid="terms-review-note"]').setValue('变更材料已核验')
    await wrapper.get('[data-testid="approve-terms-change"]').trigger('click')
    expect(useCatalogStore().byId(listing.productId!)?.price.itemPrice).toBe(1200)
    expect(listing.reviewStatus).toBe('approved')
  })
})

describe('SellerMarketAdmin activation', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('describes immediate automatic delivery for new datasets', () => {
    const wrapper = mount(SellerMarketAdmin)
    expect(wrapper.text()).toContain('新数据集付款成功后立即自动交付')
    expect(wrapper.text()).not.toContain('平台收款后由运营开通')
  })

  it('lets operators activate an explicitly historical paid seller order', async () => {
    const wrapper = mount(SellerMarketAdmin)
    const ordersTab = wrapper.findAll('button').find((btn) => btn.text().includes('商家订单'))
    await ordersTab!.trigger('click')
    expect(wrapper.text()).toContain('待开通')
    const historicalRow = wrapper.findAll('tbody tr').find((row) => row.text().includes('order-seller-paid-001'))!
    expect(historicalRow.text()).toContain('历史存量订单')
    await wrapper.get('[data-testid="seller-admin-activate"]').trigger('click')
    expect(useOrderStore().list.find((item) => item.id === 'order-seller-paid-001')?.status).toBe('entitlement_active')
    expect(useEntitlementStore().list.some((item) => item.orderId === 'order-seller-paid-001' && item.status === 'active')).toBe(true)
    expect(historicalRow.text()).toContain('历史存量订单')
  })

  it('reports automatic delivery after confirming payment for a current dataset', async () => {
    const orders = useOrderStore()
    const order = orders.list.find((item) => item.id === 'order-seller-contract-001')!
    const listing = useSellerMarketStore().listings[0]!
    listing.productId = order.productId
    listing.servicePeriodMonths = 6
    orders.list = [order]
    const wrapper = mount(SellerMarketAdmin)
    await wrapper.findAll('button').find((button) => button.text().includes('商家订单'))!.trigger('click')
    expect(wrapper.text()).not.toContain('历史存量订单')
    await wrapper.findAll('button').find((button) => button.text() === '确认平台到账')!.trigger('click')
    expect(order.status).toBe('entitlement_active')
    expect(wrapper.text()).toContain('已确认平台到账并立即自动交付')
    expect(wrapper.text()).not.toContain('订单进入待开通')
    expect(wrapper.find('[data-testid="seller-admin-activate"]').exists()).toBe(false)
  })
})
