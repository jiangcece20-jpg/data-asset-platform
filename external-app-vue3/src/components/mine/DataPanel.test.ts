import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DataPanel from './DataPanel.vue'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'

const Dummy = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Dummy },
      { path: '/app/checkout/dataset/:id', component: Dummy },
      { path: '/app/payment/dataset/:id', component: Dummy },
      { path: '/portal/checkout/dataset/:id', component: Dummy },
      { path: '/portal/payment/dataset/:id', component: Dummy },
      { path: '/portal/product/:id', component: Dummy }
    ]
  })
}

async function mountDataPanel(props: Partial<InstanceType<typeof DataPanel>['$props']> = {}) {
  const router = makeRouter()
  router.push('/')
  await router.isReady()
  const wrapper = mount(DataPanel, {
    props: { dataTab: 'purchased', variant: 'mobile', ...props },
    global: { plugins: [router] }
  })
  return { wrapper, router }
}

describe('DataPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows purchased data and placeholder for produced tab', async () => {
    const { wrapper } = await mountDataPanel({ variant: 'mobile' })
    expect(wrapper.find('[data-testid="my-datasets"]').exists()).toBe(true)

    await wrapper.setProps({ dataTab: 'produced' })
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
  })

  it('renders the secondary tabs and emits update:dataTab on click', async () => {
    const { wrapper } = await mountDataPanel({ variant: 'mobile' })
    const purchasedTab = wrapper.find('[data-testid="data-tab-purchased"]')
    const producedTab = wrapper.find('[data-testid="data-tab-produced"]')
    expect(purchasedTab.exists()).toBe(true)
    expect(producedTab.exists()).toBe(true)

    await producedTab.trigger('click')
    expect(wrapper.emitted('update:dataTab')?.[0]).toEqual(['produced'])
  })

  it('shows purchased entitlement details under the mobile testid', async () => {
    const { wrapper } = await mountDataPanel({ variant: 'mobile' })
    const section = wrapper.find('[data-testid="my-datasets"]')
    expect(section.text()).toContain('仓储周转效率数据集')
    expect(section.text()).toContain('资产版本')
  })

  it('preserves portal entitlement and renew testids for variant=portal', async () => {
    const { wrapper, router } = await mountDataPanel({ variant: 'portal' })
    const card = wrapper.find('[data-testid="portal-dataset-entitlement"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('仓储周转效率数据集')

    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'personal', 'offer-truck-personal-updates', 36)
    commerce.pay(order.id)

    const { wrapper: portalWrapper, router: portalRouter } = await mountDataPanel({ variant: 'portal' })
    const renewButton = portalWrapper.find('[data-testid="portal-renew-dataset"]')
    expect(renewButton.exists()).toBe(true)
    await renewButton.trigger('click')
    await flushPromises()
    expect(portalRouter.currentRoute.value.path).toContain('/portal/payment/dataset/')
    expect(router).toBeTruthy()
  })
})
