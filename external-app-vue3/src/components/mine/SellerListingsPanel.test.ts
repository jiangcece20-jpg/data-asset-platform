import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SellerListingsPanel from './SellerListingsPanel.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { useCatalogStore } from '@/stores/catalog'
import { listingCatalogSpecFromArtifact } from '@/domain/sellerListingSpec'

describe('SellerListingsPanel V1.0.2', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('edits presentation directly and submits sale terms for review', async () => {
    const seller = useSellerMarketStore()
    const artifact = seller.artifacts.find((item) => item.id === 'artifact-route-otp')!
    const listing = seller.submitListing({
      artifactId: artifact.id, title: artifact.name, subtitle: '旧简介', enterprisePrice: 990,
      servicePeriodMonths: 12, complianceSummary: '已脱敏', catalogSpec: listingCatalogSpecFromArtifact(artifact)
    })
    seller.decideListing(listing.id, 'published')
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }, { path: '/app/product/:id', component: { template: '<div />' } }] })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(SellerListingsPanel, { props: { variant: 'mobile' }, global: { plugins: [router] } })
    await wrapper.get(`[data-testid="edit-listing-${listing.id}"]`).trigger('click')
    expect(wrapper.get('[data-testid="listing-edit-frequency"]').text()).not.toContain('一次性')
    expect(wrapper.get('[data-testid="listing-edit-frequency"]').text()).toContain('不定期')
    expect((wrapper.get('[data-testid="listing-edit-period"]').element as HTMLInputElement).value).toBe('12')
    await wrapper.get('[data-testid="listing-edit-frequency"]').setValue('')
    await wrapper.get('[data-testid="submit-listing-terms"]').trigger('click')
    expect(wrapper.text()).toContain('商家仅支持持续更新，请选择更新频率')
    expect(listing.reviewStatus).toBe('approved')
    expect(listing.pendingTerms).toBeUndefined()
    await wrapper.get('[data-testid="listing-edit-frequency"]').setValue('每周更新')
    await wrapper.get('[data-testid="listing-edit-title"]').setValue('新版名称')
    await wrapper.get('[data-testid="save-listing-display"]').trigger('click')
    expect(useCatalogStore().byId(listing.productId!)?.name).toBe('新版名称')
    await wrapper.get('[data-testid="listing-edit-price"]').setValue('1200')
    await wrapper.get('[data-testid="submit-listing-terms"]').trigger('click')
    expect(listing.reviewStatus).toBe('change_pending')
    expect(wrapper.text()).toContain('上下架状态：上架')
    expect(wrapper.text()).toContain('审批状态：多项变更审核中')
    expect(useCatalogStore().byId(listing.productId!)?.price.itemPrice).toBe(990)
    expect(listing.pendingTerms?.updateFrequency).toBe('每周更新')
  })

  it.each([
    ['draft', undefined, '未上架', '草稿'],
    ['pending_review', 'pending_review', '未上架', '审核中'],
    ['need_supplement', 'pending_review', '未上架', '驳回'],
    ['rejected', undefined, '未上架', '驳回'],
    ['published', 'change_rejected', '上架', '驳回'],
    ['published', 'approved', '上架', '已通过'],
    ['paused', 'approved', '已下架', '已通过'],
    ['delisted', 'approved', '已下架', '已通过']
  ] as const)('separates listing and review labels for %s', async (status, reviewStatus, saleLabel, reviewLabel) => {
    const listing = useSellerMarketStore().listings[0]!
    listing.status = status
    listing.reviewStatus = reviewStatus
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(SellerListingsPanel, { props: { variant: 'mobile' }, global: { plugins: [router] } })
    expect(wrapper.text()).toContain(`上下架状态：${saleLabel}`)
    expect(wrapper.text()).toContain(`审批状态：${reviewLabel}`)
    expect(wrapper.text()).not.toContain(status)
  })
})
