import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import ContentUse from './ContentUse.vue'
import { useOrderStore } from '@/stores/orders'

async function mountBoundDashboard(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/bi/dashboard/:id', component: ContentUse },
      { path: '/portal/bi/dashboard/:id', component: ContentUse }
    ]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ContentUse, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('bound dashboard use entry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('resolves the product by its registered source ID and keeps the access gate', async () => {
    const product = useCatalogStore().byId('prod-freight-index')!
    product.typeDetail.dashboard!.boundAssetId = 'bi-freight-123'
    product.typeDetail.dashboard!.mobileEntryPath = '/app/bi/dashboard/bi-freight-123'
    const trial = await mountBoundDashboard('/app/bi/dashboard/bi-freight-123')
    expect(trial.text()).toContain(product.name)
    expect(trial.text()).toContain('当前身份暂无查看权限')
    trial.unmount()

    useUserStore().switchMockPurchaseIdentity('enterprise_member')
    useEntitlementStore().grantEnterpriseSeat(product.id, useUserStore().context.currentEnterpriseId!)
    const member = await mountBoundDashboard('/app/bi/dashboard/bi-freight-123')
    expect(member.text()).toContain(product.name)
    expect(member.text()).not.toContain('当前身份暂无查看权限')
  })

  it.each(['app', 'portal'])('blocks an expired paid dashboard at the direct %s use URL', async client => {
    const user = useUserStore()
    user.switchMockPurchaseIdentity('enterprise_member')
    const product = useCatalogStore().byId('prod-cold-chain-dashboard')!
    product.availability = product.status = 'published'
    product.typeDetail.dashboard!.boundAssetId = 'expired-board'
    useEntitlementStore().grantEnterpriseSeat(product.id, user.context.currentEnterpriseId!)
    const entitlement = useEntitlementStore().list.find(item => item.productId === product.id && item.type === 'seat')!
    entitlement.validFrom = '2000-01-01'
    entitlement.updateValidTo = '2000-12-31'
    const wrapper = await mountBoundDashboard(`/${client}/bi/dashboard/expired-board`)
    expect(wrapper.text()).toContain('当前身份暂无查看权限')
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('异常事件数')
    wrapper.unmount()
  })
})

it.each(['app', 'portal'])('blocks delisted free dashboards through the direct %s URL', async client => {
  setActivePinia(createPinia())
  useUserStore().switchMockPurchaseIdentity('enterprise_admin')
  useEntitlementStore().grantTeamMember()
  const product = useCatalogStore().byId('prod-freight-index')!
  product.status = product.availability = 'delisted'
  product.typeDetail.dashboard!.boundAssetId = 'delisted-free'
  const wrapper = await mountBoundDashboard(`/${client}/bi/dashboard/delisted-free`)
  expect(wrapper.text()).toContain('当前身份暂无查看权限')
  expect(wrapper.text()).not.toContain('异常事件数')
  wrapper.unmount()
})

it.each(['app', 'portal'])('blocks a delisted paid board at the direct %s URL despite active rights', async client => {
  setActivePinia(createPinia())
  const user = useUserStore()
  user.switchMockPurchaseIdentity('enterprise_admin')
  const product = useCatalogStore().byId('prod-cold-chain-dashboard')!
  product.typeDetail.dashboard!.boundAssetId = 'paid-delisted'
  useEntitlementStore().grantEnterpriseSeat(product.id, user.context.currentEnterpriseId!)
  product.status = product.availability = 'delisted'
  const wrapper = await mountBoundDashboard(`/${client}/bi/dashboard/paid-delisted`)
  expect(wrapper.text()).toContain('当前身份暂无查看权限')
  expect(wrapper.text()).not.toContain('异常事件数')
  wrapper.unmount()
})

it.each(['app', 'portal'])('opens the expired original order as a mask on %s, without borrowing newer rights', async client => {
  setActivePinia(createPinia())
  const user = useUserStore()
  user.switchMockPurchaseIdentity('enterprise_admin')
  const product = useCatalogStore().byId('prod-cold-chain-dashboard')!
  product.status = product.availability = 'published'
  product.typeDetail.dashboard!.boundAssetId = 'original-expired-board'
  const orders = useOrderStore()
  orders.list.push({ ...orders.list[0]!, id: 'expired-original', productId: product.id, productType: 'dashboard',
    ownerType: 'enterprise', ownerId: user.context.currentEnterpriseId!, operatorMemberId: user.context.currentMemberId,
    status: 'entitlement_active' })
  const right = { id: 'expired-board-right', orderId: 'expired-original', productId: product.id,
    source: 'enterprise' as const, type: 'seat' as const, ownerId: user.context.currentEnterpriseId!,
    status: 'active' as const, accessScope: 'enterprise_wide' as const, validFrom: '2000-01-01', updateValidTo: '2000-12-31' }
  useEntitlementStore().list.push(right, { ...right, id: 'new-board-right', orderId: 'new-order', updateValidTo: '2099-12-31' })
  const wrapper = await mountBoundDashboard(`/${client}/bi/dashboard/original-expired-board?orderId=expired-original`)
  expect(wrapper.get('[data-testid="dashboard-no-entitlement-mask"]').text()).toContain('权益已到期')
  expect(wrapper.findComponent({ name: 'PortalDashboardDetail' }).exists()).toBe(false)
  expect(wrapper.text()).not.toContain('异常事件数')
  wrapper.unmount()
  const invalid = await mountBoundDashboard(`/${client}/bi/dashboard/original-expired-board?orderId=another-company-order`)
  expect(invalid.find('[data-testid="dashboard-no-entitlement-mask"]').exists()).toBe(false)
  expect(invalid.text()).toContain('当前身份暂无查看权限')
  invalid.unmount()
})
