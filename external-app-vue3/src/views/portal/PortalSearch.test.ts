import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PortalSearch from './PortalSearch.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'

async function screen(url = '/portal/search') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/portal/search', component: PortalSearch },
    { path: '/portal/product/:id', component: { template: '<div />' } },
    { path: '/portal/mine', component: { template: '<div />' } },
    { path: '/portal/ai-chat', component: { template: '<div />' } },
    { path: '/portal/data-prepare/datasets', component: { template: '<div />' } }
  ] })
  await router.push(url)
  const wrapper = mount(PortalSearch, { global: { plugins: [router] } })
  await flushPromises()
  const click = async (label: string) => {
    const button = wrapper.findAll('button').find(b => b.text() === label)
    expect(button, label).toBeTruthy()
    await button!.trigger('click'); await flushPromises()
  }
  return { wrapper, router, click }
}

describe('PC找数列表完整链路', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
  it('输入草稿不立即过滤，提交后搜索并能清空恢复', async () => {
    const { wrapper, click } = await screen()
    await wrapper.get('[data-testid="portal-search-input"]').setValue('不存在xyz')
    expect(wrapper.findAll('.product-tile').length).toBeGreaterThan(0)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(wrapper.findAll('.product-tile')).toHaveLength(0)
    await click('清空搜索')
    expect(wrapper.findAll('.product-tile').length).toBeGreaterThan(0)
  })
  it('筛选同步URL且其他类别分面不错误清零', async () => {
    const { wrapper, router } = await screen()
    const buttons = wrapper.findAll('.filter-chip-options button')
    const before = buttons[2].text()
    await buttons[1].trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.type).toBe('dataset')
    expect(wrapper.findAll('.filter-chip-options button')[2].text()).toBe(before)
  })
  it('可从URL恢复来源、运营标签、视图和排序', async () => {
    const { wrapper } = await screen('/portal/search?source=space&ops=热门&sort=latest&view=list')
    expect(wrapper.find('.market-list-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('重置筛选（2）')
  })
  it('路由参数改变时类别能同步，非法类别回落全部', async () => {
    const { wrapper, router } = await screen('/portal/search?type=dataset')
    await router.push('/portal/search?type=api'); await flushPromises()
    expect(wrapper.findAll('.filter-chip-options button')[2].attributes('aria-pressed')).toBe('true')
    await router.push('/portal/search?type=bad'); await flushPromises()
    expect(wrapper.findAll('.product-tile').length).toBeGreaterThan(0)
  })
  it('长卡收藏的Enter不冒泡打开详情', async () => {
    const { wrapper, router } = await screen()
    await wrapper.get('[aria-label="长卡视图"]').trigger('click'); await flushPromises()
    await wrapper.get('.market-list-card button[aria-label="收藏"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/search')
  })
  it('所有无结果状态都提供提交需求入口', async () => {
    const { wrapper, router } = await screen('/portal/search?q=不存在xyz')
    await wrapper.get('[data-testid="portal-usable-filter"]').trigger('click'); await flushPromises()
    const submit = wrapper.findAll('button').find(b => b.text() === '提交需求')
    expect(submit).toBeTruthy()
    await submit!.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ menu: 'demands', submitDemand: '1' })
  })
  it('个人身份不召回企业内部视图', async () => {
    const { wrapper } = await screen('/portal/search?q=司机绩效周报')
    expect(wrapper.findAll('.product-tile')).toHaveLength(0)
  })
  it('内部视图的本地示例入口不打开不存在的BI地址', async () => {
    useUserStore().completeEnterpriseAuth()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { wrapper } = await screen('/portal/search?q=司机绩效周报')
    await wrapper.get('.product-tile').trigger('click'); await flushPromises()
    expect(open).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    open.mockRestore()
  })
  it('最新按上架日期排列，不使用数据更新时间', async () => {
    const catalog = useCatalogStore()
    const a = structuredClone(JSON.parse(JSON.stringify(catalog.products[0])))
    const b = structuredClone(a)
    a.id = 'new-listing'; a.name = '新上架'; a.listedAt = '2026-10-31'; a.updatedAt = '2026-01-01'
    b.id = 'old-listing'; b.name = '旧上架'; b.listedAt = '2026-01-01'; b.updatedAt = '2026-10-31'
    catalog.products = [b, a]
    const { wrapper, click } = await screen()
    await click('最新')
    expect(wrapper.findAll('.tile-heading h2')[0].text()).toBe('新上架')
  })
  it('价格按卡片实际起价排序，待报价放在有价格商品后', async () => {
    const catalog = useCatalogStore()
    const base = JSON.parse(JSON.stringify(catalog.products[0]))
    catalog.products = [
      { ...structuredClone(base), id: 'expensive', name: '高价', dealChannel: 'space_purchase', price: { model: 'quote', itemPrice: 0 }, commerceOffers: [{ id: 'a', price: 180 }] },
      { ...structuredClone(base), id: 'cheap', name: '低价', dealChannel: 'space_purchase', price: { model: 'quote', itemPrice: 999 }, commerceOffers: [{ id: 'b', price: 40 }] },
      { ...structuredClone(base), id: 'quote', name: '待报价', dealChannel: 'space_purchase', price: { model: 'quote' }, commerceOffers: [], datasetOffers: [] }
    ]
    const { wrapper, click } = await screen()
    await click('价格 ↑')
    expect(wrapper.findAll('.tile-heading h2').map(n => n.text())).toEqual(['低价', '高价', '待报价'])
  })
  it('分页、排序和视图可以刷新恢复，切换筛选回到第一页', async () => {
    const { wrapper, router, click } = await screen('/portal/search?view=list&sort=latest&page=2')
    expect(wrapper.findAll('.market-list-card').length).toBeGreaterThan(0)
    expect(wrapper.findAll('button').find(b => b.text() === '上一页')!.attributes('disabled')).toBeUndefined()
    await wrapper.get('[aria-label="豆腐块视图"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.page).toBe('2')
    await click('自营产品14')
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })
  it('无效和过大的页码不会得到假空列表', async () => {
    const { wrapper, router } = await screen('/portal/search?page=999')
    expect(wrapper.findAll('.product-tile').length).toBeGreaterThan(0)
    await router.push('/portal/search?page=-10'); await flushPromises()
    expect(wrapper.findAll('.product-tile')).toHaveLength(10)
  })
  it('从商品详情返回保留筛选和视图', async () => {
    const { wrapper, router } = await screen('/portal/search?type=dataset&view=list&sort=latest&page=2')
    await wrapper.get('.market-list-card').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toMatch(/^\/portal\/product\//)
    router.back(); await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ type: 'dataset', view: 'list', sort: 'latest', page: '2' })
  })
  it('来源深链有重置入口，重置不会残留隐藏筛选', async () => {
    const { wrapper, router } = await screen('/portal/search?venue=不存在空间')
    const reset = wrapper.findAll('button').find(b => b.text() === '重置筛选（1）')!
    expect(reset).toBeTruthy()
    await reset.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.venue).toBeUndefined()
    expect(wrapper.findAll('.product-tile').length).toBeGreaterThan(0)
  })
  it('AI入口携带草稿但不修改已提交关键词', async () => {
    const { wrapper, router } = await screen('/portal/search?q=物流')
    await wrapper.get('[data-testid="portal-search-input"]').setValue('煤炭运价')
    await wrapper.get('[data-testid="portal-go-ai"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value).toMatchObject({ path: '/portal/ai-chat', query: { q: '煤炭运价', entry: 'ai' } })
  })
  it('空目录也有提交需求入口', async () => {
    useCatalogStore().products = []
    useCatalogStore().resources = []
    const { wrapper } = await screen()
    expect(wrapper.text()).toContain('暂无上架商品')
    expect(wrapper.findAll('button').some(b => b.text() === '提交需求')).toBe(true)
  })
  it('商品收藏反馈与跨页面共享状态完整', async () => {
    const { wrapper, router } = await screen()
    await wrapper.get('button[aria-label="收藏"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('已收藏')
    const card = wrapper.get('.product-tile')
    expect(card.find('[aria-label="取消收藏"]').exists()).toBe(true)
    expect(router.currentRoute.value.path).toBe('/portal/search')
    expect(useCatalogStore().products.some(p => p.favorite)).toBe(true)
  })
})
