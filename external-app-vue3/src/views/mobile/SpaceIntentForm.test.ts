import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useUserStore } from '@/stores/user'
import SpaceIntentForm from './SpaceIntentForm.vue'

async function mountForm(path = '/app/space-intent/prod-qualification-api') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/space-intent/:id', name: 'space-intent', component: SpaceIntentForm },
      { path: '/app/mine', name: 'mine', component: { template: '<div />' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(SpaceIntentForm, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('SpaceIntentForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSpaceIntentStore().list = []
  })

  it('submits an unclaimed intent and shows 已提交', async () => {
    const wrapper = await mountForm()
    await wrapper.get('[data-testid="contact-name"]').setValue('陈静')
    await wrapper.get('[data-testid="contact-phone"]').setValue('13800000000')
    await wrapper.get('[data-testid="scenario"]').setValue('司机核验')
    expect(wrapper.get('[data-testid="requested-enterprise"]').text()).toBe('个人')
    await wrapper.get('[data-testid="submit-intent"]').trigger('click')
    await flushPromises()

    const store = useSpaceIntentStore()
    expect(store.list).toHaveLength(1)
    expect(store.list[0]).toMatchObject({
      productId: 'prod-qualification-api',
      opsStatus: 'unclaimed',
      requestedEnterpriseName: '个人',
      enterpriseId: undefined
    })
    expect(wrapper.text()).toContain('已提交')
  })

  it('shows 请先登录 and does not submit when logged out', async () => {
    useUserStore().context.loggedIn = false
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('请先登录')
    expect(wrapper.find('[data-testid="submit-intent"]').exists()).toBe(false)
    expect(useSpaceIntentStore().list).toHaveLength(0)
  })

  it('fills the current enterprise from the active identity and does not allow editing', async () => {
    useUserStore().completeEnterpriseAuth()
    const wrapper = await mountForm()
    expect(wrapper.get('[data-testid="requested-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(wrapper.find('input[data-testid="requested-enterprise"]').exists()).toBe(false)

    await wrapper.get('[data-testid="contact-phone"]').setValue('13800000000')
    await wrapper.get('[data-testid="scenario"]').setValue('企业核验')
    await wrapper.get('[data-testid="submit-intent"]').trigger('click')
    await flushPromises()

    expect(useSpaceIntentStore().list[0]).toMatchObject({
      requestedEnterpriseName: '万联供应链管理有限公司',
      enterpriseId: 'ent-wanlian-logistics'
    })
  })
})
