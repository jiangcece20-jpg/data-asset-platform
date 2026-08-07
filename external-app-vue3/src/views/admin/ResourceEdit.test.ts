import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
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

describe('ResourceEdit product-detail mapping', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('previews generated dataset summary without adding a summary input', async () => {
    const wrapper = await mountResourceEdit('res-prod-truck-trajectory')

    expect(wrapper.get('[data-testid="product-content-summary"]').text()).toContain('货车轨迹')
    expect(wrapper.find('[data-testid="product-content-summary-input"]').exists()).toBe(false)
  })

  it('edits the fallback subtitle and preferred recommendation copy separately', async () => {
    const wrapper = await mountResourceEdit()

    await wrapper.get('[data-testid="product-subtitle-input"]').setValue('看板基础副标题')
    await wrapper.get('[data-testid="product-recommend-input"]').setValue('详情页优先推荐语')
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const product = useCatalogStore().byId('prod-freight-index')
    expect(product?.subtitle).toBe('看板基础副标题')
    expect(product?.recommendText).toBe('详情页优先推荐语')
    expect(wrapper.text()).toContain('导出规则')
    expect(wrapper.text()).toContain('货运价格指数')
    expect(wrapper.text()).toContain('全国运价趋势')
  })

  it('configures public metric descriptions and syncs product and resource summaries', async () => {
    const wrapper = await mountResourceEdit()

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

  it('configures personal and enterprise one-time and finite continuous plans for a dashboard', async () => {
    const wrapper = await mountResourceEdit()
    const planForms = wrapper.findAll('[data-testid^="commerce-offer-form-"]')

    expect(planForms).toHaveLength(4)
    const personalContinuous = planForms.find((item) => item.text().includes('个人 · 持续服务'))!
    await personalContinuous.get('[data-testid="max-term-months"]').setValue('24')
    await wrapper.get('[data-testid="save-product"]').trigger('click')

    const plan = useCatalogStore().byId('prod-freight-index')?.commerceOffers
      ?.find((item) => item.subject === 'personal' && item.serviceMode === 'continuous')
    expect(plan).toMatchObject({ billingPeriodMonths: 12, maxTermMonths: 24 })
  })
})
