import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteComponent } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'
import appRouter from '@/router'

async function openPublicDataset(client = 'portal', query = 'category=public&resource=res-prod-public-freight-dataset&product=prod-public-freight-dataset') {
  const path = `/${client}/data-prepare/datasets/public`
  const record = appRouter.getRoutes().find((item) => item.path === path)
  expect(record, 'public management route must exist').toBeDefined()
  const load = record!.components!.default as () => Promise<{ default: RouteComponent }>
  const component = (await load()).default
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path, component }] })
  await router.push(`${path}?${query}`)
  const wrapper = mount(component, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('public dataset management target', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    useEntitlementStore().grantTeamMember()
  })

  it.each(['app', 'portal'])('opens the specific public dataset with preview and fields on %s without orders', async (client) => {
    const catalog = useCatalogStore()
    const source = publicUseDatasetSample()
    catalog.syncUsePublicDatasets([source])
    const product = catalog.generatePublicDatasetProduct(source.resourceId)
    product.name = 'Renamed product'
    const resource = catalog.resourceById(source.resourceId)!
    resource.resourceName = 'Selected public dataset'
    // A same-name resource must never determine selection.
    catalog.resourceById('res-prod-public-freight-dataset')!.resourceName = resource.resourceName
    const ordersBefore = JSON.parse(JSON.stringify(useOrderStore().$state))
    const { wrapper } = await openPublicDataset(client, `category=public&resource=${source.resourceId}&product=${product.id}`)
    expect(wrapper.get('[data-testid="dataset-management-path"]').text()).toContain('用数 · 数据准备 · 数据集管理')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('公开数据集')
    expect(wrapper.get('[data-testid="selected-public-dataset"]').attributes('data-resource-id')).toBe(source.resourceId)
    expect(wrapper.get('[data-testid="public-data-preview"]').text()).toContain('北京')
    expect(wrapper.text()).not.toContain('查看我的订单')
    expect(wrapper.text()).not.toContain('购买')
    await wrapper.get('[role="tab"][data-tab="fields"]').trigger('click')
    expect(wrapper.get('[data-testid="public-dataset-fields"]').text()).toContain('货运量')
    expect(wrapper.find('[data-testid="public-data-preview"]').exists()).toBe(false)
    expect(useOrderStore().$state).toEqual(ordersBefore)
    wrapper.unmount()
  })

  it.each([
    ['missing resource', 'category=public&product=prod-public-freight-dataset'],
    ['missing product', 'category=public&resource=res-prod-public-freight-dataset'],
    ['unknown resource', 'category=public&resource=missing&product=prod-public-freight-dataset'],
    ['mismatched resource', 'category=public&resource=res-prod-truck-trajectory&product=prod-public-freight-dataset'],
    ['wrong category', 'category=purchased&resource=res-prod-public-freight-dataset&product=prod-public-freight-dataset'],
    ['duplicate resource', 'category=public&resource=res-prod-public-freight-dataset&resource=res-prod-truck-trajectory&product=prod-public-freight-dataset'],
    ['private dataset', 'category=public&resource=res-prod-truck-trajectory&product=prod-truck-trajectory']
  ])('shows unavailable feedback with no fallback for %s', async (_reason, query) => {
    const { wrapper } = await openPublicDataset('portal', query)
    expect(wrapper.get('[role="alert"]').text()).toContain('不可用')
    expect(wrapper.find('[data-testid="selected-public-dataset"]').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each(['app', 'portal'])('shows only the source data time and never the quality time on %s', async (client) => {
    const detail = useCatalogStore().resourceById('res-prod-public-freight-dataset')!.typeDetail.dataset!
    detail.dataUpdatedAt = undefined
    detail.qualityUpdatedAt = '1999-01-01'
    const { wrapper } = await openPublicDataset(client)
    expect(wrapper.text()).toContain('数据更新时间 未返回')
    expect(wrapper.text()).not.toContain('1999-01-01')
    detail.dataUpdatedAt = '2026-10-12 08:00'
    await flushPromises()
    expect(wrapper.text()).toContain('数据更新时间 2026-10-12 08:00')
    expect(wrapper.text()).not.toContain('1999-01-01')
    wrapper.unmount()
  })

  it.each(['logout', 'personal', 'inactive member', 'different enterprise', 'membership revoked', 'membership not started', 'membership expired', 'unpublished', 'draft status', 'source private', 'source unavailable', 'source missing', 'service suspended'])('removes data immediately after %s', async (reason) => {
    const { wrapper } = await openPublicDataset()
    expect(wrapper.find('[data-testid="selected-public-dataset"]').exists()).toBe(true)
    const catalog = useCatalogStore()
    const user = useUserStore()
    const resource = catalog.resourceById('res-prod-public-freight-dataset')!
    const product = catalog.byId('prod-public-freight-dataset')!
    const memberships = useEntitlementStore().list.filter((item) => item.type === 'member')
    if (reason === 'logout') user.context.loggedIn = false
    if (reason === 'personal') user.clearEnterpriseContext()
    if (reason === 'inactive member') user.currentEnterpriseMember!.status = 'revoked'
    if (reason === 'different enterprise') user.context.currentEnterpriseId = 'another-enterprise'
    if (reason === 'membership revoked') memberships.forEach((item) => { item.status = 'revoked' })
    if (reason === 'membership not started') memberships.forEach((item) => { item.validFrom = '2999-01-01' })
    if (reason === 'membership expired') memberships.forEach((item) => { item.validTo = '2000-01-01' })
    if (reason === 'unpublished') product.availability = 'delisted'
    if (reason === 'draft status') product.status = 'draft'
    if (reason === 'source private') resource.sourcePublicDataset = false
    if (reason === 'source unavailable') resource.sourceDatasetAvailable = false
    if (reason === 'source missing') catalog.resources = catalog.resources.filter((item) => item.id !== resource.id)
    if (reason === 'service suspended') product.serviceStatus = 'suspended'
    await flushPromises()
    expect(wrapper.find('[data-testid="selected-public-dataset"]').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toBeTruthy()
    wrapper.unmount()
  })

  it.each(['app', 'portal'])('retains the public target after metadata sync failure until the source becomes unavailable on %s', async (client) => {
    const catalog = useCatalogStore()
    const source = publicUseDatasetSample()
    catalog.syncUsePublicDatasets([source])
    const product = catalog.generatePublicDatasetProduct(source.resourceId)
    const ordersBefore = JSON.parse(JSON.stringify(useOrderStore().$state))
    const { wrapper } = await openPublicDataset(client, `category=public&resource=${source.resourceId}&product=${product.id}`)

    catalog.recordPublicDatasetSyncFailure(source.resourceId, 'Metadata sync failed')
    await flushPromises()
    const resource = catalog.resourceById(source.resourceId)!
    expect(resource.sourcePublicDataset).toBe(true)
    expect(resource.sourceDatasetAvailable).toBe(true)
    expect(resource.publicSyncError).toBeTruthy()
    expect(wrapper.get('[data-testid="selected-public-dataset"]').attributes('data-resource-id')).toBe(source.resourceId)
    expect(wrapper.get('[data-testid="public-data-preview"]').text()).toContain('北京')
    await wrapper.get('[data-tab="fields"]').trigger('click')
    expect(wrapper.get('[data-testid="public-dataset-fields"]').text()).toContain('货运量')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    resource.sourceDatasetAvailable = false
    await flushPromises()
    expect(wrapper.find('[data-testid="selected-public-dataset"]').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('源端数据暂不可用')
    expect(useOrderStore().$state).toEqual(ordersBefore)
    wrapper.unmount()
  })

  it('reacts to a new precise route selection without retaining the previous fields tab', async () => {
    const catalog = useCatalogStore()
    const source = publicUseDatasetSample()
    catalog.syncUsePublicDatasets([source])
    const product = catalog.generatePublicDatasetProduct(source.resourceId)
    const { wrapper, router } = await openPublicDataset()
    await wrapper.get('[data-tab="fields"]').trigger('click')
    await router.push({ path: '/portal/data-prepare/datasets/public', query: { category: 'public', resource: source.resourceId, product: product.id } })
    await flushPromises()
    expect(wrapper.get('[data-testid="selected-public-dataset"]').attributes('data-resource-id')).toBe(source.resourceId)
    expect(wrapper.get('[data-testid="public-data-preview"]').text()).toContain('北京')
    wrapper.unmount()
  })

  it('shows empty states for the selected resource instead of borrowing another product sample', async () => {
    const catalog = useCatalogStore()
    const resource = catalog.resourceById('res-prod-public-freight-dataset')!
    resource.typeDetail = { dataset: { ...resource.typeDetail.dataset!, fields: [], sampleColumns: [], sampleRows: [] } }
    const { wrapper } = await openPublicDataset()
    expect(wrapper.text()).toContain('暂无预览数据')
    await wrapper.get('[data-tab="fields"]').trigger('click')
    expect(wrapper.text()).toContain('暂无字段信息')
    wrapper.unmount()
  })

  it('supports keyboard navigation between the preview and fields tabs', async () => {
    const { wrapper } = await openPublicDataset()
    await wrapper.get('[data-tab="preview"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-tab="fields"]').attributes('aria-selected')).toBe('true')
    await wrapper.get('[data-tab="fields"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-tab="preview"]').attributes('aria-selected')).toBe('true')
    wrapper.unmount()
  })
})
