import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'
import PublicDatasetPublish from './PublicDatasetPublish.vue'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'
import { useCatalogStore } from '@/stores/catalog'

afterEach(() => { document.body.innerHTML = '' })
async function setup(incomplete = false) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useCatalogStore()
  const source = publicUseDatasetSample()
  store.syncUsePublicDatasets([{ ...source, description: incomplete ? '' : source.description }])
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/admin/resources')
  const wrapper = mount(PublicDatasetPublish, { props: { resourceId: source.resourceId }, global: { plugins: [pinia, router] } })
  return { wrapper, store, router, id: source.resourceId }
}
describe('public publication confirmation', () => {
  it('cancels without creating and confirms into the resource detail', async () => {
    const { wrapper, store, router, id } = await setup()
    await wrapper.get('button').trigger('click')
    expect(document.body.textContent).toContain('会员免费')
    const cancel = Array.from(document.querySelectorAll('button')).find(b => b.textContent === '取消')!
    cancel.click()
    await flushPromises()
    expect(store.productForResource(id)).toBeUndefined()
    await wrapper.get('button').trigger('click')
    document.querySelector<HTMLButtonElement>('[data-testid="confirm-public-publish"]')!.click()
    await flushPromises()
    expect(store.productForResource(id)?.availability).toBe('published')
    expect(router.currentRoute.value.path).toBe(`/admin/resources/${id}`)
    expect(wrapper.text()).toContain('查看商品')
    wrapper.unmount()
  })
  it('shows missing fields and disables publication', async () => {
    const { wrapper, store, id } = await setup(true)
    await wrapper.get('button').trigger('click')
    expect(document.body.textContent).toContain('缺少简介')
    expect(document.querySelector<HTMLButtonElement>('[data-testid="confirm-public-publish"]')!.disabled).toBe(true)
    expect(store.productForResource(id)).toBeUndefined()
    wrapper.unmount()
  })
})
