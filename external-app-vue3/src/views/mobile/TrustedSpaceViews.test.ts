import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'
import SpaceBridge from './SpaceBridge.vue'
import ApiUsageBills from './ApiUsageBills.vue'
import MineEnterprise from './MineEnterprise.vue'

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
  if (options.linkNow) await useTrustedSpacePurchaseStore().createLink(intent.id, adapter)
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
})
