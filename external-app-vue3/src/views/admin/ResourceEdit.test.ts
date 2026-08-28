import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import ResourceEdit from './ResourceEdit.vue'

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
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('个人单品')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('企业单品')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('普通会员')
    expect(wrapper.get('[data-testid="pricing-plan-editor"]').text()).toContain('高级会员')
  })

  it('edits update frequency from a closed enum select', async () => {
    const wrapper = await mountResourceEdit()
    const select = wrapper.get('[data-testid="product-update-frequency"]')
    expect(select.element.tagName).toBe('SELECT')
    expect(select.text()).toContain('实时更新')
    expect(select.text()).toContain('每季度更新')
    expect(select.text()).toContain('不定期')
    await select.setValue('每季度更新')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(useCatalogStore().byId('prod-freight-index')?.updateFrequency).toBe('每季度更新')
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

  it('configures one personal and one enterprise item price', async () => {
    const wrapper = await mountResourceEdit()
    await openTab(wrapper, 'pricing')

    await wrapper.get('[data-testid="item-offer-personal-original-price"]').setValue('259')
    await wrapper.get('[data-testid="item-offer-personal-discount-zhe"]').setValue('8.5')
    await wrapper.get('[data-testid="item-offer-enterprise-original-price"]').setValue('2590')
    await wrapper.get('[data-testid="item-offer-enterprise-discount-zhe"]').setValue('10')
    await wrapper.get('[data-testid="sale-period-months"]').setValue('18')
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-freight-index')
    expect(product?.commerceOffers).toHaveLength(2)
    expect(product?.commerceOffers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: '个人单品',
        subject: 'personal',
        price: 220.2,
        originalPrice: 259,
        discountZhe: 8.5,
        serviceMode: 'one_time'
      }),
      expect.objectContaining({
        name: '企业单品',
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
    expect(wrapper.get<HTMLInputElement>('[data-testid="item-offer-personal-enabled"]').element.disabled).toBe(true)
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
    expect(product?.datasetOffers).toHaveLength(2)
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

  it('lets an unlisted resource edit product fields and save as draft', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    expect(wrapper.get('[data-testid="save-product"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('尚未包装为商品')
    await wrapper.get('[data-testid="product-name-input"]').setValue('货车轨迹商品草稿')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    const catalog = useCatalogStore()
    const created = catalog.productForResource('res-asset-truck-trajectory')
    expect(created?.name).toBe('货车轨迹商品草稿')
    expect(created?.availability).toBe('preparing')
    expect(created?.status).toBe('draft')
    expect(catalog.discoverable.some((p) => p.id === created?.id)).toBe(false)
  })

  it('persists dataset metrics when first-saving an unlisted resource', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await openTab(wrapper, 'content')
    await wrapper.get('[data-testid="dataset-metric-granularity"]').setValue('车辆 × 日')
    await wrapper.get('[data-testid="dataset-metric-time-range"]').setValue('近 6 个月')
    await wrapper.get('[data-testid="dataset-metric-row-count"]').setValue('1280000')
    await wrapper.get('[data-testid="dataset-metric-field-count"]').setValue('8')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    const created = useCatalogStore().productForResource('res-asset-truck-trajectory')
    expect(created?.typeDetail.dataset).toMatchObject({
      granularity: '车辆 × 日',
      timeRange: '近 6 个月',
      rowCount: 1280000,
      fieldCount: 8
    })
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

  it('shows draft actions then publishes after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('货车轨迹明细数据集')
    await openTab(wrapper, 'pricing')
    await wrapper.get('[data-testid="associate-product-btn"]').trigger('click')
    await wrapper.get('[data-testid="associate-product-create"]').trigger('click')
    await wrapper.get('[data-testid="product-free"]').setValue(true)
    await wrapper.get('[data-testid="publish-product"]').trigger('click')
    const created = useCatalogStore().productForResource('res-asset-truck-trajectory')
    expect(created?.availability).toBe('published')
    expect(created?.dealChannel).toBe('app_payment')
    expect(useCatalogStore().discoverable.some((p) => p.id === created?.id)).toBe(true)
  })

  it('keeps pause and publish availability unchanged when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const published = await mountResourceEdit('res-prod-freight-index')
    await published.get('[data-testid="pause-product"]').trigger('click')
    expect(useCatalogStore().byId('prod-freight-index')?.availability).toBe('published')

    const unlisted = await mountResourceEdit('res-asset-truck-trajectory')
    await unlisted.get('[data-testid="product-name-input"]').setValue('货车轨迹明细数据集')
    await openTab(unlisted, 'pricing')
    await unlisted.get('[data-testid="associate-product-btn"]').trigger('click')
    await unlisted.get('[data-testid="associate-product-create"]').trigger('click')
    await unlisted.get('[data-testid="product-free"]').setValue(true)
    await unlisted.get('[data-testid="publish-product"]').trigger('click')
    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')?.availability).toBe('preparing')
  })

  it('shows resume and delist for a paused asset-platform product even when listing is blocked', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountResourceEdit('res-prod-warehouse-turnover-risk')
    expect(wrapper.find('[data-testid="resume-product"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="delist-product"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="publish-product"]').exists()).toBe(false)
    await wrapper.get('[data-testid="resume-product"]').trigger('click')
    expect(useCatalogStore().byId('prod-warehouse-turnover-risk')?.availability).toBe('published')
  })

  it('shows listing block reason instead of silently skipping draft save', async () => {
    const catalog = useCatalogStore()
    const resource = catalog.resourceById('res-asset-truck-trajectory')
    expect(resource).toBeDefined()
    resource!.commercializable = false
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await wrapper.get('[data-testid="product-name-input"]').setValue('不能上架的草稿')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(catalog.productForResource('res-asset-truck-trajectory')).toBeUndefined()
    expect(wrapper.get('[data-testid="listing-block-error"]').text()).toContain('仅已发布且允许商业化的资产可上架')
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

  it('gates pricing config behind associate-product for unlisted resources', async () => {
    const wrapper = await mountResourceEdit('res-asset-truck-trajectory')
    await openTab(wrapper, 'pricing')
    expect(wrapper.find('[data-testid="associate-product-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(false)

    await wrapper.get('[data-testid="associate-product-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="associate-product-modal"]').exists()).toBe(true)
    await wrapper.get('[data-testid="associate-product-create"]').trigger('click')

    expect(useCatalogStore().productForResource('res-asset-truck-trajectory')).toBeDefined()
    expect(wrapper.find('[data-testid="pricing-plan-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="associate-product-btn"]').exists()).toBe(false)
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

  it('lets ops upload dashboard preview screenshots', async () => {
    const wrapper = await mountResourceEdit('res-prod-freight-index')
    await openTab(wrapper, 'content')
    expect(wrapper.find('[data-testid="seller-listing-shots"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="seller-listing-custom-shots"]').exists()).toBe(true)
    await wrapper.get('[data-testid="fill-example-shots"]').trigger('click')
    await wrapper.get('[data-testid="save-product"]').trigger('click')
    expect(useCatalogStore().byId('prod-freight-index')?.sellingShots?.length).toBeGreaterThan(0)
  })

  it('hides data profiling config on space datasets', async () => {
    const wrapper = await mountResourceEdit('res-prod-enterprise-activity')
    await openTab(wrapper, 'content')
    expect(wrapper.find('[data-testid="profiling-config"]').exists()).toBe(false)
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
