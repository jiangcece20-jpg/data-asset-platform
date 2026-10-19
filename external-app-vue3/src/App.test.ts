import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import App from './App.vue'

describe('prototype startup identity', () => {
  it('opens as an enterprise member while keeping the personal demo option', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/portal/search', component: { template: '<div />' } }]
    })
    await router.push('/portal/search')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: { PortalShell: true, PhoneShell: true, AdminShell: true }
      }
    })
    await flushPromises()

    const user = useUserStore()
    expect(user.context.name).toBe('王涛')
    expect(user.currentEnterpriseMember?.role).toBe('member')
    expect(useEntitlementStore().hasTeamMembership).toBe(true)
    expect(wrapper.find('[data-testid="prototype-identity-enterprise_admin"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="prototype-identity-personal"]').exists()).toBe(true)
  })
})
