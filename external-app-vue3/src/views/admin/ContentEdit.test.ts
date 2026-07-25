import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import ContentEdit from './ContentEdit.vue'
import { useCatalogStore } from '@/stores/catalog'

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/content/:id', name: 'admin-content-edit', component: ContentEdit }]
  })
}

async function mountFor(id: string) {
  const router = makeRouter()
  router.push(`/admin/content/${id}`)
  await router.isReady()
  return mount(ContentEdit, { global: { plugins: [router] } })
}

describe('ContentEdit', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('registers the content edit route', () => {
    expect(makeRouter().hasRoute('admin-content-edit')).toBe(true)
  })

  it('edits a report block and persists it to the product', async () => {
    const catalog = useCatalogStore()
    const report = catalog.products.find((p) => p.type === 'report' && p.typeDetail.report)!
    const wrapper = await mountFor(report.id)
    // add a block, edit its title, save
    await wrapper.find('[data-testid="add-block"]').trigger('click')
    const rows = wrapper.findAll('[data-testid="block-row"]')
    const lastTitle = rows[rows.length - 1].find('input')
    await lastTitle.setValue('新增章节 A')
    await wrapper.find('[data-testid="save"]').trigger('click')
    await flushPromises()
    const updated = catalog.byId(report.id)!
    expect(updated.typeDetail.report!.blocks.some((b) => b.title === '新增章节 A')).toBe(true)
    expect(wrapper.find('[data-testid="saved"]').exists()).toBe(true)
  })

  it('edits a dashboard panel and persists it', async () => {
    const catalog = useCatalogStore()
    const dash = catalog.products.find((p) => p.type === 'dashboard' && p.typeDetail.dashboard)!
    const wrapper = await mountFor(dash.id)
    await wrapper.find('[data-testid="add-panel"]').trigger('click')
    const rows = wrapper.findAll('[data-testid="panel-row"]')
    await rows[rows.length - 1].find('input').setValue('运价热力面板')
    await wrapper.find('[data-testid="save"]').trigger('click')
    await flushPromises()
    const updated = catalog.byId(dash.id)!
    expect(updated.typeDetail.dashboard!.panels.some((p) => p.title === '运价热力面板')).toBe(true)
  })
})
