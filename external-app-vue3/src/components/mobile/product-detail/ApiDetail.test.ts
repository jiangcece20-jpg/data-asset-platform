import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApiDetail from './ApiDetail.vue'
import { seedProducts } from '@/data/products'

const api = seedProducts.find((product) => product.id === 'prod-qualification-api')!

describe('ApiDetail sandbox', () => {
  it('rejects missing required parameters', async () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'sandbox' } })
    await wrapper.get('[data-testid="sandbox-send"]').trigger('click')
    expect(wrapper.text()).toContain('请输入 idCardNo')
  })

  it('returns the fixed sandbox response without a real request', async () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'sandbox' } })
    await wrapper.get('[data-param="idCardNo"]').setValue('110101199001010011')
    await wrapper.get('[data-param="certificateNo"]').setValue('CERT-A2-001')
    await wrapper.get('[data-testid="sandbox-send"]').trigger('click')
    expect(wrapper.text()).toContain('sandbox-demo-001')
    expect(wrapper.text()).toContain('不调用真实服务')
  })

  it('keeps parameters when a simulated sandbox failure is selected', async () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'sandbox' } })
    await wrapper.get('[data-param="idCardNo"]').setValue('110101199001010011')
    await wrapper.get('[data-param="certificateNo"]').setValue('CERT-A2-001')
    await wrapper.get('[data-testid="sandbox-fail"]').trigger('click')
    expect(wrapper.text()).toContain('沙箱服务暂时繁忙，请重试')
    expect((wrapper.get('[data-param="idCardNo"]').element as HTMLInputElement).value).toBe('110101199001010011')
  })
})

describe('ApiDetail docs', () => {
  it('puts error messages under docs without error code values for space APIs', () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'docs' } })
    const errorCodes = wrapper.get('[data-testid="api-error-codes"]')
    expect(errorCodes.text()).toContain('错误码')
    expect(errorCodes.text()).toContain('参数缺失')
    expect(errorCodes.text()).toContain('证件不存在')
    expect(errorCodes.text()).not.toContain('40001')
    expect(errorCodes.text()).not.toContain('40401')
    expect(wrapper.text()).not.toContain('SLA：')
  })
})
