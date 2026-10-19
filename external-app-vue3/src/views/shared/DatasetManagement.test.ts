import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import DatasetManagement from './DatasetManagement.vue'
import DatasetUse from './DatasetUse.vue'
import PortalProductDetail from '@/views/portal/PortalProductDetail.vue'
import ProductDetail from '@/views/mobile/ProductDetail.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'

function grant(productId: string, patch = {}) {
  const user = useUserStore()
  useEntitlementStore().list.push({
    id: `access-${productId}`, type: 'dataset', source: 'enterprise', productId,
    ownerId: user.enterprise.id, enterpriseId: user.enterprise.id, status: 'active',
    validFrom: '2026-01-01', accessScope: 'enterprise_wide', allowDownload: true, ...patch
  })
}

async function open(client: string, suffix: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: `/${client}/data-prepare/datasets`, component: DatasetManagement },
    { path: `/${client}/use/dataset/:id`, component: DatasetUse }
  ] })
  await router.push(`/${client}/${suffix}`)
  await router.isReady()
  return { router, wrapper: mount(router.currentRoute.value.params.id ? DatasetUse : DatasetManagement, { global: { plugins: [router] } }) }
}

describe('purchased dataset entry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    useEntitlementStore().list = []
  })

  it.each(['app', 'portal'])('selects purchased datasets and opens the selected dataset on %s', async client => {
    const id = 'prod-warehouse-turnover-risk'
    grant(id)
    grant('prod-seller-route-board', { updateValidTo: '2026-09-30' })
    grant('prod-public-freight-dataset')
    grant('prod-enterprise-activity')
    const { wrapper, router } = await open(client, `data-prepare/datasets?tab=purchased&product=${id}`)
    expect(wrapper.get('[data-tab="purchased"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('[data-testid="purchased-dataset"]')).toHaveLength(2)
    expect(wrapper.get(`[data-product="${id}"]`).attributes('aria-current')).toBe('true')
    await wrapper.get(`[data-product="${id}"] button`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/${client}/use/dataset/${id}`)
    wrapper.unmount()
  })

  it.each(['app', 'portal'])('denies expired access even with a delivery record on %s', async client => {
    const id = 'prod-warehouse-turnover-risk'
    grant(id, { validTo: '2026-09-30' })
    const commerce = useDatasetCommerceStore()
    commerce.deliveries.push({
      ...commerce.deliveries[0]!, id: 'delivery-old', productId: id,
      ownerType: 'enterprise', ownerId: useUserStore().enterprise.id, status: 'delivered'
    })
    const { wrapper } = await open(client, `use/dataset/${id}`)
    expect(wrapper.text()).toContain('暂无该数据集使用权限')
    expect(wrapper.text()).not.toContain('样本数据')
    wrapper.unmount()
  })

  it.each(['app', 'portal'].flatMap(client => [
    { client, delisted: false, expired: true },
    { client, delisted: true, expired: true },
    { client, delisted: true, expired: false }
  ]))('retains dataset use independently of updates on $client (delisted=$delisted, expired=$expired)', async ({ client, delisted, expired }) => {
    const id = 'prod-warehouse-turnover-risk'
    const product = useCatalogStore().byId(id)!
    product.availability = product.status = delisted ? 'delisted' : 'published'
    product.serviceStatus = 'degraded'
    grant(id, { updateValidTo: expired ? '2000-01-01' : '2999-01-01' })
    const { wrapper, router } = await open(client, `data-prepare/datasets?tab=purchased&product=${id}`)
    await wrapper.get(`[data-product="${id}"] button`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/${client}/use/dataset/${id}`)
    const usage = mount(DatasetUse, { global: { plugins: [router] } })
    expect(usage.text()).toContain('样本数据')
    expect(usage.find('table tbody tr').exists()).toBe(true)
    const notice = usage.get('[data-testid="dataset-retention-notice"]')
    expect(notice.text()).toContain(expired ? '快照' : '实际履约')
    expect(usage.text()).not.toContain('当前身份暂无该数据集使用权限')
    usage.unmount()
    wrapper.unmount()
  })

  it('does not substitute edit or profiling timestamps for the source dataset time', async () => {
    const id = 'prod-warehouse-turnover-risk'
    grant(id)
    const detail = useCatalogStore().byId(id)!.typeDetail.dataset!
    detail.dataUpdatedAt = undefined
    const { wrapper } = await open('portal', 'data-prepare/datasets?tab=purchased')
    expect(wrapper.get(`[data-product="${id}"]`).text()).toContain('数据更新时间 未返回')
    detail.dataUpdatedAt = '2026-10-12T08:00:00'
    await nextTick()
    expect(wrapper.get(`[data-product="${id}"]`).text()).toContain('数据更新时间 2026-10-12 08:00')
    wrapper.unmount()
  })

  it.each(['app', 'portal'])('keeps order context only when opening its associated product on %s', async client => {
    const id = 'prod-warehouse-turnover-risk'
    grant(id)
    grant('prod-seller-route-board')
    const { wrapper, router } = await open(client, `data-prepare/datasets?tab=purchased&product=${id}&order=original-order`)
    await wrapper.get(`[data-product="${id}"] button`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.order).toBe('original-order')
    await router.push(`/${client}/data-prepare/datasets?tab=purchased&product=${id}&order=original-order`)
    await wrapper.get('[data-product="prod-seller-route-board"] button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.order).toBeUndefined()
    wrapper.unmount()
  })

  it('removes revoked or wrong-enterprise rights without renaming-based matching', async () => {
    const id = 'prod-warehouse-turnover-risk'
    grant(id)
    const { wrapper } = await open('portal', `data-prepare/datasets?tab=purchased&product=${id}`)
    useCatalogStore().byId(id)!.name = '修改后的名称'
    await nextTick()
    expect(wrapper.get(`[data-product="${id}"]`).text()).toContain('修改后的名称')
    useEntitlementStore().list[0]!.status = 'revoked'
    await nextTick()
    expect(wrapper.findAll('[data-testid="purchased-dataset"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('暂无可用的已购数据集')
    useEntitlementStore().list[0]!.status = 'active'
    useUserStore().context.currentEnterpriseId = 'other-enterprise'
    await nextTick()
    expect(wrapper.findAll('[data-testid="purchased-dataset"]')).toHaveLength(0)
    wrapper.unmount()
  })

  it.each(['app', 'portal'].flatMap(client => ['prod-warehouse-turnover-risk', 'prod-seller-route-board'].flatMap(id =>
    ['missing', 'expired', 'revoked', 'future'].map(state => ({ client, id, state }))
  )))('hides the detail usage entry for $state rights on $client/$id', async ({ client, id, state }) => {
    if (state !== 'missing') grant(id, state === 'expired' ? { validTo: '2026-09-30' }
      : state === 'revoked' ? { status: 'revoked' } : { validFrom: '2099-01-01' })
    const component = client === 'portal' ? PortalProductDetail : ProductDetail
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: `/${client}/product/:id`, component }] })
    await router.push(`/${client}/product/${id}`)
    const wrapper = mount(component, { global: { plugins: [router] } })
    await flushPromises()
    const buttons = wrapper.findAll('[data-testid="product-action-area"] button').map(button => button.text())
    expect(buttons).not.toContain('前往用数')
    expect(buttons).not.toContain('查看已交付数据')
    wrapper.unmount()
  })
})
