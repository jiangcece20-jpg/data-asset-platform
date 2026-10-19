import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import ReportPreviewImagesEditor from '@/components/admin/ReportPreviewImagesEditor.vue'
import ResourceEdit from './ResourceEdit.vue'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'

async function mountResourceEdit(resourceId = 'res-prod-freight-index') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/resources/:id', component: ResourceEdit }]
  })
  await router.push(`/admin/resources/${resourceId}`)
  await router.isReady()
  return mount(ResourceEdit, { global: { plugins: [router] } })
}

async function openTab(wrapper: Awaited<ReturnType<typeof mountResourceEdit>>, tab: 'product' | 'pricing' | 'content') {
  await wrapper.get(`[data-testid="resource-edit-tab-${tab}"]`).trigger('click')
}

describe('ResourceEdit product-detail mapping', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('does not expose seller resources through a direct resource-management URL', async () => {
    const seller = useCatalogStore().resources.find(r => r.origin === 'seller_market')!
    const wrapper = await mountResourceEdit(seller.id)
    expect(wrapper.text()).toContain('资源不存在')
    expect(wrapper.find('[data-testid="save-product"]').exists()).toBe(false)
  })

  it('defaults and truncates product names without changing resource names, and preserves saved drafts', async () => {
    const store = useCatalogStore()
    const res = store.resources.find(r => r.id === 'res-content-regional-logistics-dashboard')!
    res.resourceName = '测试名称'.repeat(20)
    const wrapper = await mountResourceEdit(res.id)
    expect((wrapper.get('[data-testid="product-name-input"]').element as HTMLInputElement).value).toBe(Array.from(res.resourceName).slice(0, 50).join(''))
    await wrapper.get('[data-testid="product-name-input"]').setValue('新的商品名称')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(res.productNameDraft).toBe('新的商品名称')
    expect(res.resourceName).toBe('测试名称'.repeat(20))
    wrapper.unmount()
    const restored = await mountResourceEdit(res.id)
    expect((restored.get('[data-testid="product-name-input"]').element as HTMLInputElement).value).toBe('新的商品名称')
  })

  it('uses the common edit and publish flow for a public dataset', async () => {
    const store = useCatalogStore()
    const resource = store.resourceById('res-use-public-city-flow')!
    resource.pricingDraft = { isFree: false, enterpriseOffer: { enabled: true, originalPrice: 99, discountZhe: 10, price: 99, allowDownload: true } }
    const wrapper = await mountResourceEdit(resource.id)

    expect(wrapper.find('[data-testid="public-resource-detail"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="sales-status-bar"]').text()).toContain('未上架')
    expect((wrapper.get('[data-testid="product-name-input"]').element as HTMLInputElement).value).toBe('城市货运公开数据集')
    expect((wrapper.get('[data-testid="product-update-frequency"]').element as HTMLInputElement).value).toBe('每天更新')
    expect(wrapper.get('[data-testid="product-update-frequency"]').attributes()).toHaveProperty('readonly')
    await openTab(wrapper, 'pricing')
    expect(wrapper.get('[data-testid="public-pricing-readonly"]').text()).toContain('会员免费')
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="product-free"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="paid-pricing-options"]').exists()).toBe(false)
    await openTab(wrapper, 'product')

    await wrapper.get('[data-testid="product-name-input"]').setValue('城市货运公开数据集（商品）')
    expect(wrapper.find('[data-testid="save-product"]').exists()).toBe(false)
    expect(resource.pricingDraft).toBeDefined()
    expect(store.productForResource(resource.id)).toBeUndefined()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    const product = store.productForResource(resource.id)
    expect(product).toMatchObject({
      name: '城市货运公开数据集（商品）',
      publicDataset: true,
      availability: 'published',
      price: { model: 'member_free' },
      acquisitions: ['member'],
      provider: '万联灵析'
    })
    expect(resource.pricingDraft).toBeUndefined()
    expect(wrapper.find('[data-testid="pause-product"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('停新购')
    expect(wrapper.find('[data-testid="delist-product"]').exists()).toBe(true)
    await openTab(wrapper, 'pricing')
    expect(wrapper.get('[data-testid="public-pricing-readonly"]').text()).toContain('不可修改')
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(false)
  })

  it('keeps the public price read-only when the source later cancels publication', async () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([{ ...source, isPublic: false }])
    const wrapper = await mountResourceEdit(source.resourceId)
    await openTab(wrapper, 'pricing')
    expect(wrapper.get('[data-testid="public-pricing-readonly"]').text()).toContain('会员免费')
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="publish-product"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([{ isPublic: false, available: true }, { isPublic: true, available: false }])('keeps public dataset manual delisting across source recovery %o until explicit restore', async (state) => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    const wrapper = await mountResourceEdit(source.resourceId)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.get('[data-testid="delist-product"]').trigger('click')
    expect(product.availability).toBe('published')
    confirm.mockReturnValue(true)
    await wrapper.get('[data-testid="delist-product"]').trigger('click')
    store.syncUsePublicDatasets([{ ...source, ...state }])
    await flushPromises()
    expect(wrapper.get('[data-testid="relist-product"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('[data-testid="public-source-state"]').text()).toContain(state.isPublic ? '公开' : '非公开')
    expect(wrapper.get('[data-testid="public-source-state"]').text()).toContain(state.available ? '可用' : '不可用')
    expect(wrapper.get('[data-testid="public-delist-reason"]').text()).toContain('运营人工下架')
    expect(wrapper.get('[data-testid="public-restore-error"]').text()).toContain(state.isPublic ? '源端数据不可用' : '公开状态已取消')
    store.syncUsePublicDatasets([source])
    await flushPromises()
    expect(product.availability).toBe('delisted')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(store.byId(product.id)?.availability).toBe('delisted')
    await wrapper.get('[data-testid="relist-product"]').trigger('click')
    expect(store.byId(product.id)).toMatchObject({ status: 'published', availability: 'published' })
    wrapper.unmount()
  })

  it('shows confirmed source time and sync failure while keeping manual restore blocked until retry', async () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.delistProduct(product.id)
    const resource = store.resourceById(source.resourceId)!
    resource.lastSyncedAt = '2026-10-12 09:00'
    store.recordPublicDatasetSyncFailure(resource.id, '连接超时')
    const wrapper = await mountResourceEdit(resource.id)
    expect(wrapper.get('[data-testid="public-source-state"]').text()).toContain('公开 · 可用 · 同步失败')
    expect(wrapper.get('[data-testid="public-source-synced-at"]').text()).toContain('2026-10-12 09:00')
    expect(wrapper.get('[data-testid="public-delist-reason"]').text()).toContain('运营人工下架')
    expect(wrapper.get('[data-testid="public-restore-error"]').text()).toContain('同步失败，请重试')
    expect(wrapper.get('[data-testid="relist-product"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.find('[data-testid="public-publish-entry"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="模拟源端状态"]').exists()).toBe(false)

    store.syncUsePublicDatasets([source])
    await flushPromises()
    expect(wrapper.find('[data-testid="public-restore-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="relist-product"]').attributes()).not.toHaveProperty('disabled')
    expect(wrapper.get('[data-testid="public-delist-reason"]').text()).toContain('运营人工下架')
    expect(store.byId(product.id)?.availability).toBe('delisted')
    wrapper.unmount()
  })

  it('shows source-caused delisting and clears the cause after automatic source recovery', async () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.syncUsePublicDatasets([{ ...source, available: false }])
    const wrapper = await mountResourceEdit(source.resourceId)
    expect(wrapper.get('[data-testid="public-delist-reason"]').text()).toContain('源端不可用')
    store.syncUsePublicDatasets([source])
    await flushPromises()
    expect(wrapper.find('[data-testid="public-delist-reason"]').exists()).toBe(false)
    expect(store.byId(product.id)?.availability).toBe('published')
    wrapper.unmount()
  })

  it('shows missing publication metadata and any store rejection on manual restore', async () => {
    const store = useCatalogStore()
    const source = publicUseDatasetSample()
    store.syncUsePublicDatasets([source])
    const product = store.generatePublicDatasetProduct(source.resourceId)
    store.delistProduct(product.id)
    const resource = store.resourceById(source.resourceId)!
    resource.typeDetail.dataset!.qualityUpdatedAt = ''
    const wrapper = await mountResourceEdit(source.resourceId)
    expect(wrapper.get('[data-testid="public-restore-error"]').text()).toContain('缺少数据更新时间')
    expect(wrapper.get('[data-testid="relist-product"]').attributes()).toHaveProperty('disabled')
    store.syncUsePublicDatasets([source])
    await flushPromises()
    vi.spyOn(window, 'confirm').mockImplementation(() => {
      store.recordPublicDatasetSyncFailure(resource.id, '连接超时')
      return true
    })
    await wrapper.get('[data-testid="relist-product"]').trigger('click')
    expect(wrapper.get('[data-testid="listing-block-error"]').text()).toContain('同步失败，请重试')
    expect(store.byId(product.id)?.availability).toBe('delisted')
    expect(resource.publicDelistReason).toBe('manual')
    wrapper.unmount()
  })

  it.each(['api', 'dataset'] as const)('shows trusted %s source state and manual listing controls', async (type) => {
    const catalog = useCatalogStore()
    const trusted = useTrustedSpaceCatalogStore()
    const source = seedTrustedProductSnapshots.find(item => item.type === type)!
    trusted.upsertSnapshot(source)
    const wrapper = await mountResourceEdit(catalog.byId(source.appProductId)!.resourceId)
    for (const [index, [saleStatus, label]] of ([['published', '已上架'], ['paused', '不可售'], ['delisted', '已下架'], ['unknown', '状态未知']] as const).entries()) {
      trusted.upsertSnapshot({ ...source, version: source.version + index + 1, saleStatus })
      await flushPromises()
      expect(wrapper.get('[data-testid="trusted-sales-state"]').text()).toContain(label)
      expect(wrapper.get('[data-testid="trusted-sales-state"]').text()).toContain('前台状态')
      expect(wrapper.get('[data-testid="trusted-sales-synced-at"]').text()).toContain(source.syncedAt)
      for (const id of ['pause-product', 'resume-product', 'publish-product']) {
        expect(wrapper.find(`[data-testid="${id}"]`).exists()).toBe(false)
      }
      if (saleStatus === 'published') expect(wrapper.find('[data-testid="delist-product"]').exists()).toBe(true)
      else expect(wrapper.get('[data-testid="relist-product"]').attributes()).toHaveProperty('disabled')
      expect(wrapper.find('[data-testid="save-product"]').exists()).toBe(true)
    }
    wrapper.unmount()
  })

  it.each(['api', 'dataset'] as const)('preserves first edit, save and explicit publication for a trusted %s draft', async (type) => {
    const catalog = useCatalogStore()
    const original = catalog.products.find(item => item.origin === 'trusted_space' && item.type === type)!
    catalog.products = catalog.products.filter(item => item.id !== original.id)
    const wrapper = await mountResourceEdit(original.resourceId)
    expect(wrapper.find('[data-testid="publish-product"]').exists()).toBe(true)
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(catalog.productForResource(original.resourceId)).toBeUndefined()
    const draft = catalog.listResource(original.resourceId, {
      name: original.name, subtitle: original.subtitle, price: original.price,
      acquisitions: original.acquisitions, scenarios: original.scenarios, tags: original.tags
    })
    await flushPromises()
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(catalog.byId(draft.id)?.availability).toBe('preparing')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    expect(catalog.byId(draft.id)?.availability).toBe('published')
    expect(wrapper.find('[data-testid="pause-product"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delist-product"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('splits editors into three tabs and only renders the active panel', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    const tabs = wrapper.get('[data-testid="resource-edit-tabs"]')
    expect(tabs.findAll('[role="tab"]').map((n) => n.text().replace(/\s+/g, ''))).toEqual([
      '商品信息',
      '内容配置',
      '价格与权益'
    ])
    expect(wrapper.get('[data-testid="resource-edit-tab-product"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="product-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dashboard-config-editor"]').exists()).toBe(false)

    await openTab(wrapper, 'content')
    expect(wrapper.find('[data-testid="dashboard-config-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(false)

    await openTab(wrapper, 'pricing')
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-paywall-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="product-name-input"]').exists()).toBe(false)
  })

  it('keeps save-product on the sales status bar and hides product editors for user views', async () => {
    const listed = await mountResourceEdit('res-prod-freight-index')
    expect(listed.get('[data-testid="sales-status-bar"]').get('[data-testid="save-product"]').exists()).toBe(true)
    await openTab(listed, 'product')
    expect(listed.findAll('[data-testid="save-product"]')).toHaveLength(1)

    const view = await mountResourceEdit('res-view-driver-performance')
    expect(view.find('[data-testid="resource-edit-tabs"]').exists()).toBe(false)
    expect(view.find('[data-testid="save-product"]').exists()).toBe(false)
  })

  it('shows owned dashboard facts and resource facts in resource management', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    const overview = wrapper.get('[data-testid="admin-dashboard-overview"]')
    expect(overview.text()).toContain('时间范围')
    expect(overview.text()).toContain('更新周期')
    expect(overview.text()).toContain('指标数量')
    expect(overview.text()).toContain('导出规则')
    expect(overview.text()).not.toContain('图表面板')
    const resource = wrapper.get('[data-testid="admin-dashboard-resource-info"]')
    expect(resource.text()).toContain('提供方')
    expect(resource.text()).toContain('应用场景')
    expect(wrapper.get('[data-testid="admin-dashboard-product-resource-editor"]').text()).toContain('更新频率')
    expect(wrapper.get('[data-testid="admin-dashboard-product-resource-editor"]').text()).toContain('地域范围')
    expect(wrapper.text()).toContain('商品说明书')
  })

  it('omits removed sections and legacy pricing controls', async () => {
    const wrapper = await mountResourceEdit('res-prod-truck-trajectory')
    await openTab(wrapper, 'pricing')

    expect(wrapper.text()).not.toContain('资产平台同步绑定')
    expect(wrapper.text()).not.toContain('列表内容总结预览')
    expect(wrapper.text()).not.toContain('看板资源摘要')
    expect(wrapper.find('[data-testid="product-content-summary"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('持续服务')
    expect(wrapper.text()).not.toContain('计价周期')
    expect(wrapper.text()).not.toContain('最长购买')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).not.toContain('个人单品')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('企业购买')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('普通会员')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('高级会员')
  })

  it('edits dataset update frequency from a closed enum select', async () => {
    const wrapper = await mountResourceEdit('res-prod-truck-trajectory')
    const select = wrapper.get('[data-testid="product-update-frequency"]')
    expect(select.element.tagName).toBe('SELECT')
    expect(select.text()).toContain('实时更新')
    expect(select.text()).toContain('每季度更新')
    expect(select.text()).toContain('不定期')
    await select.setValue('每季度更新')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(useCatalogStore().byId('prod-truck-trajectory')?.updateFrequency).toBe('每季度更新')
  })

  it('preserves descriptive update frequency for a dashboard when saving', async () => {
    const catalog = useCatalogStore()
    catalog.updateProduct('prod-freight-index', { updateFrequency: '每周一 09:00' })
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    const field = wrapper.get('[data-testid="product-update-frequency"]')
    expect(field.element.tagName).toBe('INPUT')
    expect((field.element as HTMLInputElement).value).toBe('每周一 09:00')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(catalog.byId('prod-freight-index')?.updateFrequency).toBe('每周一 09:00')
  })

  it('edits the fallback subtitle and preferred recommendation copy separately', async () => {
    const wrapper = await mountResourceEdit()

    await wrapper.get('[data-testid="product-subtitle-input"]').setValue('看板基础副标题')
    await wrapper.get('[data-testid="product-recommend-input"]').setValue('详情页优先推荐语')
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-freight-index')
    expect(product?.subtitle).toBe('看板基础副标题')
    expect(product?.recommendText).toBe('详情页优先推荐语')
    await openTab(wrapper, 'content')
    expect(wrapper.text()).toContain('导出规则')
    expect(wrapper.text()).toContain('货运价格指数')
    expect(wrapper.get('[data-testid="dashboard-config-editor"]').text()).toContain('指标定义')
  })

  it('configures public metric descriptions and syncs product and resource summaries', async () => {
    const wrapper = await mountResourceEdit()
    await openTab(wrapper, 'content')

    await wrapper.get('[data-testid="dashboard-metric-definition-0"]').setValue('公开展示的指标业务描述')
    await wrapper.get('[data-testid="dashboard-time-range"]').setValue('近 5 年')
    await wrapper.get('[data-testid="save-dashboard-config"]').trigger('click')

    const catalog = useCatalogStore()
    const product = catalog.byId('prod-freight-index')
    const resource = catalog.resourceById('res-prod-freight-index')
    expect(product?.typeDetail.dashboard?.metrics[0].definition).toBe('公开展示的指标业务描述')
    expect(product?.typeDetail.dashboard?.metrics[0].preview).toBe('visible')
    expect(resource?.typeDetail.dashboard?.metrics[0].definition).toBe('公开展示的指标业务描述')
    expect(resource?.typeDetail.dashboard?.timeRange).toBe('近 5 年')
  })

  it('preserves the registered App and PC dashboard binding when saving content', async () => {
    const catalog = useCatalogStore()
    const resource = catalog.registerSelfDashboardResource({ name: '华东运力看板', boundAssetId: 'bi-east-fleet-003', description: '运力情况', updateCycle: '每日' })
    const wrapper = await mountResourceEdit(resource.id)
    await openTab(wrapper, 'content')
    await wrapper.get('[data-testid="save-dashboard-config"]').trigger('click')
    expect(catalog.resourceById(resource.id)?.typeDetail.dashboard).toMatchObject({
      boundAssetId: 'bi-east-fleet-003', mobileEntryPath: '/app/bi/dashboard/bi-east-fleet-003', pcEntryPath: '/portal/bi/dashboard/bi-east-fleet-003'
    })
  })

  it('configures report intro fields and syncs product and resource summaries', async () => {
    const wrapper = await mountResourceEdit('res-prod-logistics-monthly')
    await openTab(wrapper, 'content')

    expect(wrapper.text()).not.toContain('报告资源摘要')
    expect(wrapper.get('[data-testid="report-config-editor"]').text()).toContain('来源')
    expect(wrapper.get('[data-testid="report-config-editor"]').text()).toContain('上架时间')

    await wrapper.get('[data-testid="report-published-at"]').setValue('2026-08-05')
    await wrapper.get('[data-testid="report-page-count"]').setValue('32')
    await wrapper.get('[data-testid="report-author"]').setValue('公路物流研究中心')
    await wrapper.get('[data-testid="report-version"]').setValue('V2026-08')
    await wrapper.get('[data-testid="report-audience"]').setValue('企业战略与采购负责人')
    await wrapper.get('[data-testid="report-license"]').setValue('仅限企业内部传阅')
    await wrapper.get('[data-testid="save-report-config"]').trigger('click')

    const catalog = useCatalogStore()
    const product = catalog.byId('prod-logistics-monthly')
    const resource = catalog.resourceById('res-prod-logistics-monthly')
    expect(product?.typeDetail.report).toMatchObject({
      publishedAt: '2026-08-05',
      pageCount: 32,
      author: '公路物流研究中心',
      version: 'V2026-08',
      audience: '企业战略与采购负责人',
      license: '仅限企业内部传阅'
    })
    expect(product?.entitlementPolicy).toEqual({ kind: 'report_version', version: 'V2026-08' })
    expect(resource?.typeDetail.report?.version).toBe('V2026-08')
    expect(resource?.typeDetail.report?.author).toBe('公路物流研究中心')
  })

  it('persists report preview images for app and pc when saving report config', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const wrapper = await mountResourceEdit('res-prod-logistics-monthly')
    await openTab(wrapper, 'content')

    await wrapper.findComponent(ReportPreviewImagesEditor).vm.$emit('update:modelValue', {
      app: [png],
      pc: [png, png]
    })
    await flushPromises()
    await wrapper.get('[data-testid="save-report-config"]').trigger('click')

    const product = useCatalogStore().byId('prod-logistics-monthly')
    expect(product?.typeDetail.report?.previewImages?.app).toEqual([png])
    expect(product?.typeDetail.report?.previewImages?.pc).toEqual([png, png])
  })

  it('configures only an enterprise purchase price for new sales', async () => {
    const wrapper = await mountResourceEdit()
    await openTab(wrapper, 'pricing')

    expect(wrapper.find('[data-testid="item-offer-personal"]').exists()).toBe(false)
    await wrapper.get('[data-testid="item-offer-enterprise-original-price"]').setValue('2590')
    await wrapper.get('[data-testid="item-offer-enterprise-discount-zhe"]').setValue('10')
    await wrapper.get('[data-testid="sale-period-months"]').setValue('18')
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-freight-index')
    expect(product?.commerceOffers).toHaveLength(1)
    expect(product?.commerceOffers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: '企业购买',
        subject: 'enterprise',
        price: 2590,
        originalPrice: 2590,
        discountZhe: 10,
        serviceMode: 'one_time'
      })
    ]))
    expect(product?.commerceOffers?.some((item) => item.serviceMode === 'continuous')).toBe(false)
    expect(product?.salePeriodMonths).toBe(18)
  })

  it('makes free mutually exclusive with all paid pricing options', async () => {
    const wrapper = await mountResourceEdit()
    await openTab(wrapper, 'pricing')

    await wrapper.get('[data-testid="product-free"]').setValue(true)
    expect(wrapper.get('[data-testid="paid-pricing-options"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get<HTMLInputElement>('[data-testid="sale-period-months"]').element.disabled).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="item-offer-enterprise-enabled"]').element.disabled).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="member-standard-free"]').element.disabled).toBe(true)

    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-freight-index')
    expect(product?.acquisitions).toEqual(['free'])
    expect(product?.commerceOffers).toEqual([])
    expect(product?.memberBenefits).toEqual([])
    expect(product?.price.model).toBe('free')
  })

  it('configures standard and premium member benefits with same-tier mutual exclusion', async () => {
    const wrapper = await mountResourceEdit('res-prod-logistics-monthly')
    await openTab(wrapper, 'pricing')

    await wrapper.get('[data-testid="member-standard-free"]').setValue(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="member-standard-discount"]').element.checked).toBe(false)
    expect(wrapper.get('[data-testid="member-standard-original-price"]').exists()).toBe(true)

    await wrapper.get('[data-testid="member-standard-discount"]').setValue(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="member-standard-free"]').element.checked).toBe(false)
    expect(wrapper.get('[data-testid="member-standard-zhe"]').exists()).toBe(true)
    await wrapper.get('[data-testid="member-standard-zhe"]').setValue('7')
    await wrapper.get('[data-testid="member-standard-original-price"]').setValue('200')
    expect(wrapper.get('[data-testid="member-standard-price-preview"]').text()).toContain('会员价 ¥140')

    await wrapper.get('[data-testid="member-premium-free"]').setValue(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="member-standard-discount"]').element.checked).toBe(true)
    expect(wrapper.find('[data-testid="member-premium-zhe"]').exists()).toBe(false)

    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-logistics-monthly')
    expect(product?.memberBenefits).toEqual([
      { tier: 'standard', mode: 'discount', discount: 0.7 },
      { tier: 'premium', mode: 'free' }
    ])
    expect(product?.memberIncluded).toBe(true)
    expect(product?.price.model).toBe('member_discount')
    expect(product?.price.memberDiscount).toBe(0.7)
    expect(product?.acquisitions).toContain('member')
  })

  it('supports member pricing for an asset-platform dataset', async () => {
    const wrapper = await mountResourceEdit('res-prod-truck-trajectory')
    await openTab(wrapper, 'pricing')

    await wrapper.get('[data-testid="member-standard-discount"]').setValue(true)
    await wrapper.get('[data-testid="member-standard-zhe"]').setValue('6')
    await wrapper.get('[data-testid="member-premium-free"]').setValue(true)
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-truck-trajectory')
    expect(product?.datasetOffers).toHaveLength(1)
    expect(product?.datasetOffers?.[0].subject).toBe('enterprise')
    expect(product?.datasetOffers?.every((item) => item.serviceMode === 'one_time')).toBe(true)
    expect(product?.memberBenefits).toEqual([
      { tier: 'standard', mode: 'discount', discount: 0.6 },
      { tier: 'premium', mode: 'free' }
    ])
  })

  it('shows profiling config on an unlisted dataset before a product exists', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await openTab(wrapper, 'content')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeUndefined()
    expect(wrapper.get('[data-testid="profiling-config"]').text()).toContain('数据探查配置')
    expect(wrapper.text()).toContain('plate_no')
    expect(wrapper.text()).toContain('speed_kmh')
    expect(wrapper.get<HTMLInputElement>('[data-testid="profiling-field-plate_no"]').element.disabled).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="profiling-field-speed_kmh"]').element.disabled).toBe(false)
  })

  it('saves profiling selection on an unlisted dataset without creating a product', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await openTab(wrapper, 'content')
    await wrapper.get('[data-testid="profiling-field-speed_kmh"]').setValue(true)
    await wrapper.get('[data-testid="save-profiling-config"]').trigger('click')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeUndefined()
    const fields = useCatalogStore().resourceById('res-asset-truck-trajectory')?.typeDetail.dataset?.fields ?? []
    expect(fields.find((field) => field.name === 'speed_kmh')?.profilingEnabled).toBe(true)
    expect(fields.find((field) => field.name === 'district_code')?.profilingEnabled).toBeFalsy()
  })

  it('lets an unlisted resource save pricing draft without creating a product', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('货车轨迹商品草稿')
    await openTab(wrapper, 'pricing')
    await wrapper.get('[data-testid="sale-period-months"]').setValue('6')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    const catalog = useCatalogStore()
    expect(catalog.productForResource('res-asset-truck-trajectory')).toBeUndefined()
    expect(catalog.resourceById('res-asset-truck-trajectory')?.pricingDraft?.salePeriodMonths).toBe(6)
  })

  it('persists dataset metrics when first-saving an unlisted resource', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await openTab(wrapper, 'content')
    await wrapper.get('[data-testid="dataset-metric-granularity"]').setValue('车辆 × 日')
    await wrapper.get('[data-testid="dataset-metric-time-range"]').setValue('近 6 个月')
    await wrapper.get('[data-testid="dataset-metric-row-count"]').setValue('1280000')
    await wrapper.get('[data-testid="dataset-metric-field-count"]').setValue('8')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeUndefined()
  })

  it('resets type-specific forms when opening an unlisted resource', async () => {
    const wrapper = await mountResourceEdit('res-prod-truck-trajectory')
    await openTab(wrapper, 'content')
    expect(wrapper.get<HTMLInputElement>('[data-testid="dataset-metric-granularity"]').element.value).toBe('区县 × 小时')
    await wrapper.vm.$router.push('/admin/resources/res-asset-truck-trajectory')
    await flushPromises()
    await openTab(wrapper, 'content')
    expect(wrapper.get<HTMLInputElement>('[data-testid="dataset-metric-granularity"]').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('[data-testid="dataset-metric-time-range"]').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('[data-testid="dataset-metric-row-count"]').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('[data-testid="dataset-metric-field-count"]').element.value).toBe('')
  })

  it('creates product on publish from resource draft', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('货车轨迹明细数据集')
    await openTab(wrapper, 'pricing')
    await wrapper.get('[data-testid="product-free"]').setValue(true)
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    const created = useCatalogStore().productForResource('res-asset-truck-trajectory')
    expect(created?.availability).toBe('published')
    expect(created?.dealChannel).toBe('app_payment')
    expect(useCatalogStore().discoverable.some((p) => p.id === created?.id)).toBe(true)
  })

  it('keeps delist and publish availability unchanged when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const published = await mountResourceEdit('res-prod-freight-index')
    expect(published.find('[data-testid="pause-product"]').exists()).toBe(false)
    await published.get('[data-testid="delist-product"]').trigger('click')
    expect(useCatalogStore().byId('prod-freight-index')?.availability).toBe('published')

    const unlisted = await mountResourceEdit('res-asset-truck-trajectory')
    await unlisted.get('[data-testid="product-name-input"]').setValue('货车轨迹明细数据集')
    await openTab(unlisted, 'pricing')
    await unlisted.get('[data-testid="product-free"]').setValue(true)
    await unlisted.get('[data-testid="publish-product"]').trigger('click')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeUndefined()
  })

  it('does not offer a resume bypass when the legacy risk sample is delisted and publication is blocked', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountResourceEdit('res-prod-warehouse-turnover-risk')
    expect(wrapper.find('[data-testid="resume-product"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delist-product"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="publish-product"]').exists()).toBe(false)
    expect(useCatalogStore().byId('prod-warehouse-turnover-risk')?.availability).toBe('delisted')
  })

  it('allows draft save but hides publish when listing is blocked', async () => {
    const catalog = useCatalogStore()
    const resource = catalog.resourceById('res-asset-truck-trajectory')
    expect(resource).toBeDefined()
    resource!.commercializable = false
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('不能上架的草稿')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(catalog.productForResource('res-asset-truck-trajectory')).toBeUndefined()
    expect(wrapper.find('[data-testid="publish-product"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="sales-status-bar"]').text()).toContain('仅已发布且允许商业化的资产可上架')
  })

  it('does not publish when name is empty', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('')
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeUndefined()
    expect(wrapper.text()).toContain('请填写商品名称')
  })

  it('jumps to the product tab and marks it when publish fails on name', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('')
    await openTab(wrapper, 'pricing')
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeUndefined()
    expect(wrapper.get('[data-testid="resource-edit-tab-product"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="resource-edit-tab-error-product"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('请填写商品名称')
  })

  it('shows pricing draft on unlisted resources without associate field', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await openTab(wrapper, 'pricing')
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="product-group-field"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="resource-pricing-draft-hint"]').exists()).toBe(true)
  })

  it('packs multiple products and shows them as removable tags', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await wrapper.get('[data-testid="associate-product-add"]').trigger('click')
    await wrapper.get('[data-testid="associate-product-option-prod-cold-chain-dashboard"]').trigger('click')
    await wrapper.get('[data-testid="associate-product-option-prod-port-dashboard-free"]').trigger('click')
    expect(wrapper.get('[data-testid="associate-product-selected-count"]').text()).toContain('已选 2 个')
    await wrapper.get('[data-testid="associate-product-confirm"]').trigger('click')
    const catalog = useCatalogStore()
    expect(catalog.groupMembersOf('prod-freight-index').map((item) => item.id)).toEqual([
      'prod-freight-index',
      'prod-cold-chain-dashboard',
      'prod-port-dashboard-free'
    ])
    expect(wrapper.find('[data-testid="product-group-tag-prod-cold-chain-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="product-group-tag-prod-port-dashboard-free"]').exists()).toBe(true)
    await wrapper.get('[data-testid="product-group-remove-prod-cold-chain-dashboard"]').trigger('click')
    expect(catalog.groupMembersOf('prod-freight-index').map((item) => item.id)).toEqual([
      'prod-freight-index',
      'prod-port-dashboard-free'
    ])
    expect(wrapper.find('[data-testid="product-group-tag-prod-cold-chain-dashboard"]').exists()).toBe(false)
  })

  it('shows linked-here and linked-elsewhere labels in the associate modal', async () => {
    const catalog = useCatalogStore()
    catalog.packProductsIntoGroup('prod-freight-index', ['prod-cold-chain-dashboard'])
    catalog.packProductIntoGroup('prod-logistics-monthly', 'prod-port-dashboard-free')

    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await wrapper.get('[data-testid="associate-product-add"]').trigger('click')

    expect(wrapper.get('[data-testid="associate-product-tag-prod-cold-chain-dashboard"]').text()).toBe('已关联')
    expect(wrapper.get('[data-testid="associate-product-tag-prod-port-dashboard-free"]').text()).toContain('已关联至')
    expect(wrapper.get('[data-testid="associate-product-tag-prod-port-dashboard-free"]').text()).toContain('物流')
  })

  it('resets to the product tab when opening another resource', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await openTab(wrapper, 'content')
    expect(wrapper.find('[data-testid="dashboard-config-editor"]').exists()).toBe(true)
    await wrapper.vm.$router.push('/admin/resources/res-asset-truck-trajectory')
    await flushPromises()
    expect(wrapper.get('[data-testid="resource-edit-tab-product"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="product-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-config-editor"]').exists()).toBe(false)
  })

  it('clears publish errors when switching to a listed product resource', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('')
    await openTab(wrapper, 'pricing')
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    expect(wrapper.get('[data-testid="resource-edit-tab-error-product"]').exists()).toBe(true)

    await wrapper.vm.$router.push('/admin/resources/res-prod-freight-index')
    await flushPromises()

    expect(wrapper.find('[data-testid="resource-edit-tab-error-product"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="resource-edit-tab-product"]').attributes('aria-selected')).toBe('true')
  })

  it('shows content tab empty state when no type-specific config exists', async () => {
    const wrapper = await mountResourceEdit('res-asset-warehouse-api')
    await openTab(wrapper, 'content')
    expect(wrapper.get('[data-testid="content-tab-empty"]').text()).toContain('当前资源类型暂无内容配置项')
  })

  it('shows API detail on content tab without empty state when api typeDetail exists', async () => {
    const wrapper = await mountResourceEdit('res-prod-qualification-api')
    expect(wrapper.get('[data-testid="admin-api-resource-attributes"]').text()).toContain('覆盖时间范围')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).toContain('覆盖时间范围')
    expect(wrapper.get('[data-testid="detail-compliance"]').text()).toContain('使用限制')
    expect(wrapper.get('[data-testid="api-supporting-files"]').findAll('a')).toHaveLength(3)
    await openTab(wrapper, 'content')
    expect(wrapper.text()).toContain('API 详情')
    expect(wrapper.find('[data-testid="content-tab-empty"]').exists()).toBe(false)
  })

  it('shows readonly 自有/互联 source type for space products', async () => {
    const owned = await mountResourceEdit('res-prod-enterprise-activity')
    expect(owned.get('[data-testid="space-kind-readonly"]').text()).toContain('来源类型')
    expect(owned.get('[data-testid="space-kind-readonly"]').text()).toContain('自有')
    expect(owned.get('[data-testid="space-kind-readonly"]').text()).not.toContain('互联')

    const federated = await mountResourceEdit('res-prod-space-port-throughput')
    expect(federated.get('[data-testid="space-kind-readonly"]').text()).toContain('来源类型')
    expect(federated.get('[data-testid="space-kind-readonly"]').text()).toContain('互联')
  })

  it('caps the product subtitle at 60 characters', async () => {
    const wrapper = await mountResourceEdit()
    const input = wrapper.get('[data-testid="product-subtitle-input"]')
    expect(input.attributes('maxlength')).toBe('60')
    await input.setValue(`${'看板副标题'.repeat(20)}超长`)
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(wrapper.text()).toContain('副标题不超过 60 字')
    expect(useCatalogStore().byId('prod-freight-index')?.subtitle).not.toContain('超长')
  })

  it('persists dashboard preview images for app and pc when saving dashboard config', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await openTab(wrapper, 'content')

    await wrapper.findComponent(ReportPreviewImagesEditor).vm.$emit('update:modelValue', {
      app: [png],
      pc: [png]
    })
    await flushPromises()
    await wrapper.get('[data-testid="save-dashboard-config"]').trigger('click')

    const product = useCatalogStore().byId('prod-freight-index')
    expect(product?.typeDetail.dashboard?.previewImages?.app).toEqual([png])
    expect(product?.typeDetail.dashboard?.previewImages?.pc).toEqual([png])
  })

  it('hides data profiling config on space datasets', async () => {
    const wrapper = await mountResourceEdit('res-prod-enterprise-activity')
    expect(wrapper.get('[data-testid="admin-dataset-overview"]').text()).toContain('数据粒度')
    expect(wrapper.get('[data-testid="admin-dataset-overview"]').text()).toContain('字段数')
    expect(wrapper.get('[data-testid="detail-resource-info"]').text()).toContain('地域范围')
    expect(wrapper.find('[data-testid="detail-compliance"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="detail-provider"]').exists()).toBe(false)
    await openTab(wrapper, 'content')
    expect(wrapper.find('[data-testid="profiling-config"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('留空则 APP / 门户详情不展示对应项')
  })

  it('shows compact metrics for an unlisted dataset resource', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    const overview = wrapper.get('[data-testid="admin-dataset-overview"]')
    expect(overview.text()).toContain('数据粒度')
    expect(overview.text()).toContain('时间范围')
    expect(overview.text()).toContain('数据行数')
    expect(overview.text()).toContain('字段数')
  })

  it('lets ops mark owned paid dashboard modules and button free attempts', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await openTab(wrapper, 'pricing')
    const editor = wrapper.get('[data-testid="dashboard-paywall-editor"]')
    const html = wrapper.html()
    expect(html.indexOf('data-testid="pricing-plan-editor"')).toBeLessThan(html.indexOf('data-testid="dashboard-paywall-editor"'))
    expect(editor.text()).toContain('收费内容区')
    expect(editor.text()).toContain('运价指数')
    expect(editor.text()).toContain('较上期')

    await wrapper.get('[data-testid="paywall-module-freight-index"]').setValue(true)
    expect(wrapper.get('[data-testid="paywall-field-freight-index-index"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="paywall-module-freight-index"]').setValue(false)
    await wrapper.get('[data-testid="paywall-button-freight-index-query"]').setValue(true)
    await wrapper.get('[data-testid="paywall-button-attempts-freight-index-query"]').setValue('3')
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const paywall = useCatalogStore().byId('prod-freight-index')?.typeDetail.dashboard?.paywall
    expect(paywall?.maskedButtons).toEqual([
      { moduleId: 'freight-index', buttonId: 'query', freeAttempts: 3 }
    ])
  })

  it('hides dashboard paywall config on space products', async () => {
    const wrapper = await mountResourceEdit('res-prod-enterprise-activity')
    await openTab(wrapper, 'pricing')
    expect(wrapper.find('[data-testid="dashboard-paywall-editor"]').exists()).toBe(false)
  })

  it('hides dashboard paywall config when the owned dashboard is marked free', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await openTab(wrapper, 'pricing')
    expect(wrapper.find('[data-testid="dashboard-paywall-editor"]').exists()).toBe(true)
    await wrapper.get('[data-testid="product-free"]').setValue(true)
    expect(wrapper.find('[data-testid="dashboard-paywall-editor"]').exists()).toBe(false)
  })
})
