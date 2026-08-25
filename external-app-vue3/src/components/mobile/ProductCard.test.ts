import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProductCard from './ProductCard.vue'
import { seedProducts } from '@/data/products'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'

const Dummy = { template: '<div />' }

async function mountCard(id: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Dummy },
      { path: '/app/product/:id', component: Dummy }
    ]
  })
  await router.push('/')
  await router.isReady()
  const product = seedProducts.find((item) => item.id === id)!
  return mount(ProductCard, {
    props: { product },
    global: { plugins: [router] }
  })
}

describe('ProductCard list chips', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows type, space name and one campaign without channel or trial chips', async () => {
    const wrapper = await mountCard('prod-qualification-api')
    const row = wrapper.get('[data-testid="product-chips"]')

    expect(row.text()).toContain('API')
    expect(row.text()).toContain(OWNED_SPACE_NAME)
    expect(row.text()).toContain('合规首选')
    expect(row.text()).not.toContain('可信空间购买')
    expect(row.text()).not.toContain('有试用接口')
    expect(row.text()).not.toContain('空间商品')
  })

  it('omits venue for self-operated products', async () => {
    const wrapper = await mountCard('prod-freight-index')
    const row = wrapper.get('[data-testid="product-chips"]')

    expect(row.text()).toContain('自有看板')
    expect(row.text()).toContain('热门')
    expect(row.text()).not.toContain('APP 支付')
  })

  it('uses seller name instead of 入驻商家', async () => {
    const wrapper = await mountCard('prod-seller-route-board')
    const row = wrapper.get('[data-testid="product-chips"]')

    expect(row.text()).toContain('数据集')
    expect(row.text()).toContain('陈静')
    expect(row.text()).not.toContain('入驻商家')
  })
})
