import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedApiUsageBills } from '@/data/trustedSpace'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useApiUsageBillsStore } from '@/stores/apiUsageBills'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useEntitlementStore } from '@/stores/entitlements'
import { useCatalogStore } from '@/stores/catalog'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import type { UserContext } from '@/types/domain'
import type { SpaceOrderMirror } from '@/types/trustedSpace'
import SpaceBridge from './SpaceBridge.vue'
import ApiUsageBills from './ApiUsageBills.vue'
import ApiUsageBillDetail from './ApiUsageBillDetail.vue'
import MineEnterprise from './MineEnterprise.vue'
import Mine from './Mine.vue'

function spaceOrderMirror(over: Partial<SpaceOrderMirror> = {}): SpaceOrderMirror {
  return {
    spaceOrderId: 'SP-ORDER-001',
    purchaseIntentId: 'intent-001',
    appEnterpriseId: 'ent-wanlian-logistics',
    spaceEnterpriseId: 'space-ent-wanlian',
    operatorMemberId: 'mem-1',
    appProductId: 'prod-qualification-api',
    spaceProductNo: 'SPACE-API-20415',
    productName: '企业资质核验 API',
    rawStatus: 'DELIVERED',
    displayStatus: 'delivered',
    amount: 1280,
    currency: 'CNY',
    eventVersion: 5,
    spaceUpdatedAt: '2026-07-27T10:00:00.000Z',
    syncedAt: '2026-07-27T10:01:00.000Z',
    deliverySummary: '已开通资格核验 API 凭证',
    detailUrl: 'https://trusted-space.mock/orders/SP-ORDER-001',
    ...over
  }
}

async function mountMine(context: Partial<UserContext> = {}) {
  const user = useUserStore()
  Object.assign(user.context, context)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/mine', name: 'mine', component: Mine }]
  })
  await router.push('/app/mine')
  await router.isReady()
  const wrapper = mount(Mine, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

async function selectTab(wrapper: ReturnType<typeof mount>, tab: string) {
  const button = wrapper.findAll('button').find((item) => item.text() === tab)
  if (!button) throw new Error(`Missing tab: ${tab}`)
  await button.trigger('click')
}

async function mountSpaceBridgeWithIntent(options: { linkNow?: string; renderNow?: () => Date; returned?: boolean; redirected?: boolean } = {}) {
  let linkNow = options.linkNow ?? '2026-07-27T10:00:00.000Z'
  const adapter = new MockTrustedSpaceAdapter(() => linkNow)
  const user = useUserStore()
  user.completeEnterpriseAuth()
  await useTrustedSpaceCatalogStore().syncAll(adapter)
  const intent = await useTrustedSpacePurchaseStore().preparePurchase({
    appEnterpriseId: user.context.currentEnterpriseId!,
    operatorMemberId: user.context.currentMemberId,
    appProductId: 'prod-qualification-api',
    enterpriseAuthStatus: user.context.enterpriseAuthStatus,
    returnUrl: '/app/product/prod-qualification-api'
  }, adapter)
  if (options.linkNow || options.redirected) await useTrustedSpacePurchaseStore().createLink(intent.id, adapter)
  if (options.redirected) useTrustedSpacePurchaseStore().markRedirected(intent.id)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/space-bridge/:id', name: 'space-bridge', component: SpaceBridge }]
  })
  await router.push({
    name: 'space-bridge',
    params: { id: intent.appProductId },
    query: { intent: intent.id, ...(options.returned ? { returned: '1' } : {}) }
  })
  await router.isReady()
  const wrapper = mount(SpaceBridge, {
    global: {
      plugins: [router],
      provide: { 'trusted-space-now': options.renderNow ?? (() => new Date(linkNow)) }
    }
  })
  await flushPromises()
  return wrapper
}

describe('trusted-space purchase handoff views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows enterprise and operator before handoff and has no fake success button', async () => {
    const wrapper = await mountSpaceBridgeWithIntent()

    expect(wrapper.text()).toContain('万联供应链管理有限公司')
    expect(wrapper.text()).toContain('经办人：陈静')
    expect(wrapper.text()).not.toContain('模拟：购买成功')
  })

  it('hides an expired short link while the purchase intent remains reconnectable', async () => {
    const wrapper = await mountSpaceBridgeWithIntent({
      linkNow: '2026-07-27T10:00:00.000Z',
      renderNow: () => new Date('2026-07-27T10:06:00.000Z')
    })

    expect(wrapper.text()).not.toContain('进入可信空间')
    expect(wrapper.text()).toContain('重新连接')
  })

  it('marks a redirected intent as pending synchronization when the space returns', async () => {
    const wrapper = await mountSpaceBridgeWithIntent({ redirected: true, returned: true })

    expect(wrapper.text()).toContain('空间已受理，状态同步中')
    expect(wrapper.text()).not.toContain('进入可信空间')
  })
})

describe('API usage bill views', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('does not render the enterprise total in a member bill list', async () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/app/mine/enterprise/bills', name: 'api-usage-bills', component: ApiUsageBills }]
    })
    await router.push('/app/mine/enterprise/bills')
    await router.isReady()

    const wrapper = mount(ApiUsageBills, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('720')
    expect(wrapper.text()).not.toContain('企业总额')
    expect(wrapper.text()).not.toContain('¥1,840')
  })

  it('shows the API usage bill entry only after enterprise authentication', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app/mine/enterprise', name: 'mine-enterprise', component: MineEnterprise },
        { path: '/app/mine/enterprise/bills', name: 'api-usage-bills', component: ApiUsageBills }
      ]
    })
    await router.push('/app/mine/enterprise')
    await router.isReady()

    const wrapper = mount(MineEnterprise, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('API 用量账单')
    await wrapper.get('button[data-testid="api-usage-bills-entry"]').trigger('click')
    await router.isReady()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('api-usage-bills')
  })

  it('does not show the API usage bill entry without an authenticated enterprise context', async () => {
    const user = useUserStore()
    user.context.enterpriseAuthStatus = 'authenticated'
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/app/mine/enterprise', name: 'mine-enterprise', component: MineEnterprise }]
    })
    await router.push('/app/mine/enterprise')
    await router.isReady()

    const wrapper = mount(MineEnterprise, { global: { plugins: [router] } })
    expect(wrapper.text()).not.toContain('API 用量账单')
  })

  it('does not list or provide a detail support entry for a billing month without the member credential', async () => {
    const memberOneOnlyBill = {
      ...seedApiUsageBills[0],
      spaceBillId: 'space-bill-wanlian-2026-06',
      billingMonth: '2026-06',
      totalCalls: 1120,
      successCalls: 1108,
      totalAmount: 1120,
      lines: [seedApiUsageBills[0].lines[0]]
    }
    vi.spyOn(trustedSpaceAdapter, 'listUsageBills').mockResolvedValue([...seedApiUsageBills, memberOneOnlyBill])
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app/mine/enterprise/bills', name: 'api-usage-bills', component: ApiUsageBills },
        { path: '/app/mine/enterprise/bills/:id', name: 'api-usage-bill-detail', component: ApiUsageBillDetail }
      ]
    })
    await router.push('/app/mine/enterprise/bills')
    await router.isReady()

    const list = mount(ApiUsageBills, { global: { plugins: [router] } })
    await flushPromises()
    expect(list.text()).not.toContain('2026-06')

    await router.push('/app/mine/enterprise/bills/space-bill-wanlian-2026-06')
    const detail = mount(ApiUsageBillDetail, { global: { plugins: [router] } })
    await flushPromises()
    expect(detail.text()).toContain('未找到该账单')
    expect(detail.text()).not.toContain('账单有疑问')
  })

  it('rebuilds an expired support link before the detail page can use it', async () => {
    let clock = new Date('2026-07-27T10:00:00.000Z')
    let sequence = 0
    vi.spyOn(trustedSpaceAdapter, 'createBillSupportLink').mockImplementation(async () => ({
      url: `https://trusted-space.mock/bills/support?token=ui-${++sequence}`,
      expiresAt: new Date(clock.getTime() + 5 * 60 * 1000).toISOString()
    }))
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/app/mine/enterprise/bills/:id', name: 'api-usage-bill-detail', component: ApiUsageBillDetail }]
    })
    await router.push(`/app/mine/enterprise/bills/${seedApiUsageBills[0].spaceBillId}`)
    await router.isReady()
    const wrapper = mount(ApiUsageBillDetail, {
      global: {
        plugins: [router],
        provide: { 'trusted-space-now': () => clock }
      }
    })
    await flushPromises()

    await wrapper.findAll('button').find((item) => item.text() === '账单有疑问')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('a').attributes('href')).toContain('token=ui-1')

    clock = new Date('2026-07-27T10:05:00.000Z')
    await wrapper.get('a').trigger('click')
    await flushPromises()
    expect(wrapper.get('a').attributes('href')).toContain('token=ui-2')
  })

  it('shows the last successful bill details beside a refresh failure warning', async () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-1'
    user.completeEnterpriseAuth()
    const store = useApiUsageBillsStore()
    await store.syncBills(
      'ent-wanlian-logistics',
      'space-ent-wanlian',
      trustedSpaceAdapter,
      () => '2026-07-27T10:00:00.000Z'
    )
    vi.spyOn(trustedSpaceAdapter, 'listUsageBills').mockRejectedValue(new Error('账单网络暂不可用'))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/app/mine/enterprise/bills/:id', name: 'api-usage-bill-detail', component: ApiUsageBillDetail }]
    })
    await router.push(`/app/mine/enterprise/bills/${seedApiUsageBills[0].spaceBillId}?source=mine`)
    await router.isReady()

    const wrapper = mount(ApiUsageBillDetail, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('账单网络暂不可用')
    expect(wrapper.text()).toContain('当前展示最近一次成功同步的账单')
    expect(wrapper.text()).toContain('道路运输从业人员资格核验 API')
    expect(wrapper.text()).toContain('企业总额')
  })
})

describe('mine order views', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not render enterprise orders outside authenticated enterprise context', async () => {
    useOrderStore().list.push({
      id: 'app-enterprise-001',
      channel: 'app',
      ownerType: 'enterprise',
      ownerId: 'ent-wanlian-logistics',
      productId: 'prod-qualification-api',
      productName: '企业资质核验 API',
      amount: 1280,
      status: 'paid',
      createdAt: '2026-07-27T10:00:00.000Z'
    })
    useSpaceOrderStore().mirrors = [spaceOrderMirror()]

    const wrapper = await mountMine({ enterpriseAuthStatus: 'none' })
    await selectTab(wrapper, '企业订单')

    expect(wrapper.text()).toContain('完成企业认证后查看企业订单')
    expect(wrapper.text()).not.toContain('SP-ORDER-')
  })

  it('does not render cleared space orders after the user switches enterprise context', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    useSpaceOrderStore().mirrors = [spaceOrderMirror({
      spaceOrderId: 'SP-ORDER-ANOTHER',
      appEnterpriseId: 'ent-another'
    })]

    user.setEnterpriseContext('ent-another')
    const wrapper = await mountMine()
    await selectTab(wrapper, '企业订单')

    expect(wrapper.text()).toContain('完成企业认证后查看企业订单')
    expect(wrapper.text()).not.toContain('SP-ORDER-ANOTHER')
  })

  it('separates the current member personal orders from member-visible enterprise orders', async () => {
    useOrderStore().list.push(
      {
        id: 'personal-other',
        channel: 'app',
        ownerType: 'personal',
        ownerId: 'mem-1',
        productId: 'prod-other',
        productName: '其他成员个人订单',
        amount: 100,
        status: 'paid',
        createdAt: '2026-07-27T10:00:00.000Z'
      },
      {
        id: 'personal-current',
        channel: 'app',
        ownerType: 'personal',
        ownerId: 'mem-2',
        productId: 'prod-current',
        productName: '本人个人订单',
        amount: 200,
        status: 'paid',
        createdAt: '2026-07-27T10:00:00.000Z'
      },
      {
        id: 'enterprise-app',
        channel: 'app',
        ownerType: 'enterprise',
        ownerId: 'ent-wanlian-logistics',
        productId: 'prod-enterprise',
        productName: '企业 APP 订单',
        amount: 300,
        status: 'paid',
        createdAt: '2026-07-27T10:00:00.000Z'
      }
    )
    useSpaceOrderStore().mirrors = [
      spaceOrderMirror({ spaceOrderId: 'SP-ORDER-OTHER', operatorMemberId: 'mem-1' }),
      spaceOrderMirror({ spaceOrderId: 'SP-ORDER-MINE', operatorMemberId: 'mem-2' })
    ]

    const wrapper = await mountMine({
      currentMemberId: 'mem-2',
      currentEnterpriseId: 'ent-wanlian-logistics',
      enterpriseAuthStatus: 'authenticated',
      role: 'member'
    })
    await selectTab(wrapper, '个人订单')
    expect(wrapper.text()).toContain('本人个人订单')
    expect(wrapper.text()).not.toContain('其他成员个人订单')

    await selectTab(wrapper, '企业订单')
    expect(wrapper.text()).toContain('企业 APP 订单')
    expect(wrapper.text()).toContain('SP-ORDER-MINE')
    expect(wrapper.text()).not.toContain('SP-ORDER-OTHER')
    expect(wrapper.text()).toContain('APP 支付')
    expect(wrapper.text()).toContain('可信空间')
  })

  it('shows only the current member personal item and member entitlements in Mine', async () => {
    const user = useUserStore()
    const entitlements = useEntitlementStore()
    entitlements.list = []
    user.context.currentMemberId = 'mem-1'
    entitlements.grantMember()
    entitlements.grantItem(useCatalogStore().byId('prod-logistics-monthly')!, 'mem-1')
    user.context.currentMemberId = 'mem-2'
    entitlements.grantItem(useCatalogStore().byId('prod-freight-index')!, 'mem-2')

    const wrapper = await mountMine({ currentMemberId: 'mem-2' })

    expect(wrapper.text()).toContain('全国货运价格指数')
    expect(wrapper.text()).not.toContain('中国公路物流行业月报')
    expect(wrapper.text()).toContain('尚未开通')
    expect(wrapper.text()).not.toContain('有效期至')
  })

  it('shows enterprise content only for the current enterprise active assigned member', async () => {
    const user = useUserStore()
    const entitlements = useEntitlementStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    user.enterprise.entitledProductIds = ['prod-logistics-monthly', 'prod-freight-index']
    entitlements.list = [
      {
        id: 'current-enterprise-seat', source: 'enterprise', type: 'seat', ownerId: user.enterprise.id,
        enterpriseId: user.enterprise.id, productId: 'prod-logistics-monthly', validFrom: '2026-07-01', status: 'active'
      },
      {
        id: 'other-enterprise-seat', source: 'enterprise', type: 'seat', ownerId: 'ent-other',
        enterpriseId: 'ent-other', productId: 'prod-freight-index', validFrom: '2026-07-01', status: 'active'
      },
      {
        id: 'personal-item', source: 'personal', type: 'item', ownerId: 'mem-2',
        productId: 'prod-cold-chain-dashboard', validFrom: '2026-07-01', status: 'active'
      }
    ]
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/app/mine/enterprise', name: 'mine-enterprise', component: MineEnterprise }]
    })
    await router.push('/app/mine/enterprise')
    await router.isReady()
    const wrapper = mount(MineEnterprise, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('中国公路物流行业月报')
    expect(wrapper.text()).not.toContain('全国货运价格指数')
    expect(wrapper.text()).not.toContain('冷链物流温控合规看板')

    user.enterprise.members.find((member) => member.id === 'mem-2')!.status = 'revoked'
    await nextTick()
    expect(wrapper.text()).not.toContain('中国公路物流行业月报')
  })
})
