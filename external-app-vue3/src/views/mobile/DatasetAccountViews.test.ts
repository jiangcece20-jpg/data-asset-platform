import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Mine from './Mine.vue'
import MineEnterprise from './MineEnterprise.vue'
import PortalMine from '@/views/portal/PortalMine.vue'
import PortalBills from '@/views/portal/PortalBills.vue'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'

const Dummy = { template: '<div />' }

async function mountPage(path: string, component: any) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/mine', component: Mine },
      { path: '/app/mine/enterprise', component: MineEnterprise },
      { path: '/app/mine/enterprise/bills', component: Dummy },
      { path: '/app/enterprise-auth', component: Dummy },
      { path: '/portal/mine', component: PortalMine },
      { path: '/portal/bills', component: Dummy },
      { path: '/portal/product/:id', component: Dummy },
      { path: '/portal/search', component: Dummy }
    ]
  })
  router.push(path)
  await router.isReady()
  return mount(component, { global: { plugins: [router] } })
}

describe('dataset account views', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lands old mobile my-data links on buy-data orders with delivered dataset actions', async () => {
    const wrapper = await mountPage('/app/mine?tab=我的数据', Mine)
    expect(wrapper.find('[data-testid="my-datasets"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mine-menu-data"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('仓储周转效率数据集')
    expect(wrapper.text()).toContain('进入用数模块')
    expect(wrapper.text()).toContain('下载数据')
  })

 it('lets an enterprise admin configure purchase policy and approve a member request', async () => {
   const user = useUserStore()
   user.context.currentMemberId = 'mem-2'
   user.completeEnterpriseAuth()
    user.enterprise.purchasePolicy.memberPurchaseApprovalRequired = true
    const request = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'enterprise').approvalRequest!
    user.switchMockEnterpriseMember('mem-1')
    const wrapper = await mountPage('/app/mine/enterprise', MineEnterprise)
    expect(wrapper.find('[data-testid="enterprise-purchase-policy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-enterprise-orders"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="enterprise-orders-and-bills"]').text()).toContain('API 调用与费用账单')
    expect(wrapper.find('[data-testid="enterprise-purchase-policy"]').text()).toContain('生产首期优先落地一种正式企业支付路径')
    expect(wrapper.text()).toContain('企业授权范围内费用')
    expect(wrapper.text()).not.toContain('BI 模块')
    expect(wrapper.find('[data-testid="purchase-approval-list"]').text()).toContain('全国货车轨迹热力数据集')
    await wrapper.find('[data-testid="approve-dataset-purchase"]').trigger('click')
    await flushPromises()
    expect(request.status).toBe('approved')
    user.switchMockEnterpriseMember('mem-2')
    await flushPromises()
    expect(wrapper.find('[data-testid="my-enterprise-purchases"]').text()).toContain('审批通过')
    expect(wrapper.find('[data-testid="continue-enterprise-dataset-payment"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="continue-enterprise-dataset-payment"]').text()).toBe('继续企业付款')
  })

  it('sends delivered enterprise purchases to my orders', async () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    user.enterprise.purchasePolicy.memberPurchaseApprovalRequired = true
    const { order, approvalRequest } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'enterprise')
    user.switchMockEnterpriseMember('mem-1')
    useDatasetCommerceStore().approve(approvalRequest!.id)
    order.status = 'entitlement_active'
    user.switchMockEnterpriseMember('mem-2')

    const wrapper = await mountPage('/app/mine/enterprise', MineEnterprise)
    const cta = wrapper.findAll('button').find((btn) => btn.text() === '查看已交付数据')
    expect(cta).toBeTruthy()
    await cta!.trigger('click')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/app/mine')
    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({ menu: 'orders' })
  })

  it('keeps enterprise member management read-only for ordinary members', async () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    const wrapper = await mountPage('/app/mine/enterprise', MineEnterprise)

    expect(wrapper.find('[data-testid="enterprise-purchase-policy"]').text()).toContain('仅查看')
    expect(wrapper.find('[data-testid="assign-enterprise-seat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="revoke-enterprise-seat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="invite-enterprise-member"]').exists()).toBe(false)
  })

  it('lands old portal my-data links on buy-data orders with delivered dataset actions', async () => {
    const wrapper = await mountPage('/portal/mine?tab=data', PortalMine)
    expect(wrapper.find('[data-testid="portal-my-data-tab"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="portal-my-orders"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('仓储周转效率数据集')
    expect(wrapper.text()).toContain('进入用数模块')
    expect(wrapper.text()).toContain('下载数据')
  })

  it('applies the same enterprise order context and management filters in the PC portal', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const wrapper = await mountPage('/portal/mine?tab=orders&subject=enterprise', PortalMine)
    expect(wrapper.find('[data-testid="portal-enterprise-order-filter-context"]').text()).toContain(user.enterprise.name)
    expect(wrapper.find('[data-testid="order-card-app-order-enterprise-dataset-001"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-card-app-order-history-001"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="export-enterprise-orders"]').exists()).toBe(true)
  })

  it('keeps PC enterprise order management scoped for ordinary members', async () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    const wrapper = await mountPage('/portal/mine?tab=orders&subject=enterprise', PortalMine)
    expect(wrapper.find('[aria-label="经办人筛选"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('本人经办')
    expect(wrapper.find('[data-testid="export-enterprise-orders"]').exists()).toBe(false)
  })

  it('traces PC API charges to orders and sends bill actions to trusted space', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const wrapper = await mountPage('/portal/bills', PortalBills)
    await flushPromises()

    const lines = wrapper.findAll('[data-testid="portal-api-bill-order-line"]')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0].text()).toContain('space-order-qualification-001')
    expect(lines[0].text()).toContain('道路运输从业人员资格核验 API')
    expect(lines[0].text()).toContain('credential-mem-1')

    await wrapper.find('[data-testid="portal-download-api-bill"]').trigger('click')
    await wrapper.find('[data-testid="portal-api-bill-support"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('下载完整账单')
    expect(wrapper.text()).toContain('前往可信空间处理账单异议')
  })

  it('hides enterprise API totals and exports from ordinary members on PC', async () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    const wrapper = await mountPage('/portal/bills', PortalBills)
    await flushPromises()

    expect(wrapper.text()).toContain('本人调用量')
    expect(wrapper.find('[data-testid="portal-download-api-bill"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('credential-mem-2')
    expect(wrapper.text()).not.toContain('credential-mem-1')
  })
})
