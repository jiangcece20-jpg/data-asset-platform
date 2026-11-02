import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import AiFindPrototypePage from './AiFindPrototypePage.vue'
import DiscoverHome from '../mobile/DiscoverHome.vue'
import ProductDetail from '../mobile/ProductDetail.vue'
import PortalProductDetail from '../portal/PortalProductDetail.vue'
import PhoneShell from '@/layouts/PhoneShell.vue'
import KeywordProductCard from '@/components/mobile/ProductCard.vue'
import { useDemoConversation } from '@/components/ai-v104/demoConversation'
import { useCatalogStore } from '@/stores/catalog'

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); useDemoConversation('pc').newSession(); useDemoConversation('mobile').newSession() })
afterEach(() => vi.useRealTimers())

describe.each([
  { path: '/portal/ai-chat', detailPath: '/portal/product/preview-coal', component: AiFindPrototypePage, detail: PortalProductDetail },
  { path: '/app/discover', detailPath: '/app/product/preview-coal', component: DiscoverHome, detail: ProductDetail }
])('AI card product navigation from $path', ({ path, detailPath, component, detail }) => {
  it('opens the existing marketplace detail for the same product, preserves the conversation, and reloads its identity', async () => {
    localStorage.setItem('ai-v104-mobile-mode', 'ai')
    const pinia = createPinia(); setActivePinia(pinia)
    useCatalogStore().activateFavoriteOwner('test-user')
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path, component }, { path: detailPath.replace('/preview-coal', '/:id'), component: detail },
      { path: '/app/home', component: { template: '<div />' } }, { path: '/app/mine', component: { template: '<div />' } }
    ] })
    await router.push(path); await router.isReady()
    const wrapper = mount(path.startsWith('/app') ? PhoneShell : RouterView, { global: { plugins: [pinia, router], stubs: { transition: false } } })
    await flushPromises()
    await wrapper.get('textarea[aria-label="描述数据需求"]').setValue('找2025年煤炭运价，按月查看')
    await wrapper.get('form.composer-box').trigger('submit'); await vi.runAllTimersAsync(); await flushPromises()
    expect(wrapper.find('[aria-label="我的收藏"]').exists()).toBe(false)
    await wrapper.get('.preview-product .favorite').trigger('click')
    expect(wrapper.get('.preview-product .favorite').attributes('aria-pressed')).toBe('true')
    const keywordCard = mount(KeywordProductCard, { props: { product: useCatalogStore().byId('preview-coal')! }, global: { plugins: [pinia, router] } })
    await keywordCard.get('[aria-label="取消收藏"]').trigger('click')
    expect(wrapper.get('.preview-product .favorite').attributes('aria-pressed')).toBe('false')
    await keywordCard.get('[aria-label="收藏"]').trigger('click')
    expect(wrapper.get('.preview-product .favorite').attributes('aria-pressed')).toBe('true')
    keywordCard.unmount()
    await wrapper.get('.preview-product .secondary-action').trigger('click'); await flushPromises(); await vi.runAllTimersAsync(); await flushPromises()
    expect(router.currentRoute.value.path).toBe(detailPath)
    expect(wrapper.findComponent(detail).exists()).toBe(true)
    expect(wrapper.text()).toContain('煤炭公路运价明细数据集')
    expect(wrapper.find('.demo-dialog').exists()).toBe(false)
    expect(wrapper.text()).toContain('2,400')
    expect(wrapper.text()).not.toContain('24,000')
    expect(useCatalogStore().byId('preview-coal')).toMatchObject({ name: '煤炭公路运价明细数据集', price: { itemPrice: 2400 } })
    expect(useCatalogStore().byId('preview-coal')?.favorite).toBe(true)
    useCatalogStore().toggleFavorite('preview-coal')
    if (path.startsWith('/portal')) await wrapper.findAll('button').find(b => b.text() === '返回AI找数')!.trigger('click')
    else await wrapper.get('[aria-label="返回"]').trigger('click')
    await flushPromises(); await vi.runAllTimersAsync(); await flushPromises()
    expect(wrapper.get('[data-testid="prototype-product-list"]').text()).toContain('煤炭公路运价明细数据集')
    expect(wrapper.get('.preview-product .favorite').attributes('aria-pressed')).toBe('false')
    wrapper.unmount()
    // A fresh store resolves the same ID from the existing saved conversation, without a substitute product.
    setActivePinia(createPinia())
    expect(useCatalogStore().byId('preview-coal')).toMatchObject({ name: '煤炭公路运价明细数据集', type: 'dataset', price: { itemPrice: 2400 } })
  })
})
