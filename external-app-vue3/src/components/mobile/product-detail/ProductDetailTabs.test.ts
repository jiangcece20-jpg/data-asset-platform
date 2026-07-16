import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProductDetailTabs from './ProductDetailTabs.vue'

describe('ProductDetailTabs', () => {
  it('renders one active tab and emits the selected key', async () => {
    const wrapper = mount(ProductDetailTabs, {
      props: {
        modelValue: 'basic',
        tabs: [
          { key: 'basic', label: '基本信息' },
          { key: 'fields', label: '字段信息' }
        ]
      }
    })
    expect(wrapper.find('[aria-selected="true"]').text()).toBe('基本信息')
    await wrapper.get('button[data-tab="fields"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['fields'])
  })
})
