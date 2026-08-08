import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import BuyDataOrders from './BuyDataOrders.vue'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'

function mountBuyDataOrders(props: Partial<InstanceType<typeof BuyDataOrders>['$props']> = {}) {
  const goProduct = vi.fn()
  const pay = vi.fn()
  const openBills = vi.fn()
  const wrapper = mount(BuyDataOrders, {
    props: {
      variant: 'mobile',
      subjectFilter: 'all',
      goProduct,
      pay,
      openBills,
      ...props
    }
  })
  return { wrapper, goProduct, pay, openBills }
}

describe('BuyDataOrders', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists only dataset buy-data orders and keeps status filters', async () => {
    // 种子数据中没有会员/VIP 订单（购买会员走 productId === 'membership'，无 productType，
    // 因此不会通过 filterBuyDataOrders 的 productType === 'dataset' 判定）。
    // 这里显式注入一条“标准VIP”会员订单，验证它绝不出现在买数列表中。
    useUserStore().completeEnterpriseAuth()
    useOrderStore().purchaseMember(12, 'standard')

    const { wrapper, openBills } = mountBuyDataOrders()

    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('标准VIP')
    expect(wrapper.text()).not.toContain('会员')
    expect(wrapper.text()).toContain('order-enterprise-dataset-001')
    // 报告订单（order-history-001）非数据集，不应出现
    expect(wrapper.text()).not.toContain('中国公路物流行业月报')

    await wrapper.find('[data-testid="api-bills-order-entry"]').trigger('click')
    expect(openBills).toHaveBeenCalledTimes(1)

    const completedChip = wrapper.findAll('button').find((btn) => btn.text() === '已完成')
    expect(completedChip).toBeTruthy()
    await completedChip!.trigger('click')

    expect(wrapper.text()).toContain('order-enterprise-dataset-001')
    expect(wrapper.text()).not.toContain('标准VIP')
  })

  it('does not render a product-type select', () => {
    const { wrapper } = mountBuyDataOrders()
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(false)
  })

  it('keeps subject and channel filters and emits update:subjectFilter', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = mountBuyDataOrders({ subjectFilter: 'all' })

    expect(wrapper.find('[aria-label="成交渠道筛选"]').exists()).toBe(true)

    const enterpriseButton = wrapper.findAll('button').find((btn) => btn.text() === '企业')
    await enterpriseButton!.trigger('click')

    expect(wrapper.emitted('update:subjectFilter')?.[0]).toEqual(['enterprise'])
  })

  it('emits view-purchased-data when a completed order links to my data', async () => {
    const { wrapper } = mountBuyDataOrders()
    const link = wrapper.findAll('button').find((btn) => btn.text() === '查看我的数据')
    expect(link).toBeTruthy()
    await link!.trigger('click')
    expect(wrapper.emitted('view-purchased-data')).toBeTruthy()
  })

  it('renders portal enterprise context, export and operator filter testids for variant=portal', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = mountBuyDataOrders({ variant: 'portal', subjectFilter: 'enterprise' })

    expect(wrapper.find('[data-testid="portal-enterprise-order-filter-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="export-enterprise-orders"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="经办人筛选"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="商品类型筛选"]').exists()).toBe(false)

    // order-enterprise-dataset-001 已交付且有 downloadUrl，需在 portal 视图展示"下载数据"入口
    const downloadLink = wrapper.findAll('a').find((link) => link.text() === '下载数据')
    expect(downloadLink).toBeTruthy()
    expect(downloadLink!.attributes('href')).toContain('/download/dataset/')
  })
})
