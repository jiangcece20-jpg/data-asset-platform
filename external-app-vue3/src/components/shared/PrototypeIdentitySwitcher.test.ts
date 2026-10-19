import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import PrototypeIdentitySwitcher from './PrototypeIdentitySwitcher.vue'

describe('PrototypeIdentitySwitcher', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('switches the mock login identity from the prototype toolbar', async () => {
    const wrapper = mount(PrototypeIdentitySwitcher)
    const user = useUserStore()

    expect(wrapper.get('[data-testid="prototype-identity-switcher"]').text()).toContain('原型身份')
    expect(wrapper.find('[data-testid="prototype-identity-enterprise_admin"]').exists()).toBe(false)

    await wrapper.get('[data-testid="prototype-identity-enterprise_member"]').trigger('click')
    await flushPromises()
    expect(user.context.name).toBe('王涛')
    expect(user.currentEnterpriseMember?.role).toBe('member')
    expect(useEntitlementStore().hasTeamMembership).toBe(true)

    await wrapper.get('[data-testid="prototype-identity-personal"]').trigger('click')
    await flushPromises()
    expect(user.context.currentEnterpriseId).toBeUndefined()
    expect(user.context.name).toBe('陈静')
  })
})
