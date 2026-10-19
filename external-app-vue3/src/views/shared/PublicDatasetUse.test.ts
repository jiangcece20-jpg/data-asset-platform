import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import DatasetUse from './DatasetUse.vue'
import { publicUseDatasetSample } from '@/data/publicUseDatasets'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'

describe('public direct access', () => {
  it.each(['app', 'portal'])('stops access after source cancellation and restores without orders on %s', async (client) => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const catalog = useCatalogStore()
    const source = publicUseDatasetSample()
    catalog.syncUsePublicDatasets([source])
    const product = catalog.generatePublicDatasetProduct(source.resourceId)
    useUserStore().completeEnterpriseAuth()
    useEntitlementStore().grantTeamMember()
    const orderCount = useOrderStore().list.length
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: `/${client}/dataset/:id`, component: DatasetUse }] })
    await router.push(`/${client}/dataset/${product.id}`)
    const wrapper = mount(DatasetUse, { global: { plugins: [pinia, router] } })
    expect(wrapper.text()).toContain('下载样本 CSV')
    catalog.syncUsePublicDatasets([{ ...source, isPublic: false }])
    await nextTick()
    expect(wrapper.text()).toContain('暂无该数据集使用权限')
    expect(wrapper.text()).not.toContain('下载样本 CSV')
    catalog.syncUsePublicDatasets([source])
    await nextTick()
    expect(wrapper.text()).toContain('下载样本 CSV')
    expect(useOrderStore().list).toHaveLength(orderCount)
    wrapper.unmount()
  })
})
