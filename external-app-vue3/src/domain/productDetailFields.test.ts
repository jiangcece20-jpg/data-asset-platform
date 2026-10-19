import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import {
  apiComplianceFields,
  apiProviderFields,
  apiResourceInfoFields,
  apiSupportingFiles
} from './productDetailFields'

const api = seedProducts.find((product) => product.id === 'prod-qualification-api')!

describe('API basic detail fields', () => {
  it('shows missing trusted-space values as dashes without fabricated defaults', () => {
    const product = {
      ...api,
      spaceMeta: {
        ...api.spaceMeta,
        industryCategory: undefined,
        classificationStandard: undefined,
        providerName: undefined
      }
    }

    expect(apiResourceInfoFields(product).find((item) => item.label === '行业分类')?.value).toBe('—')
    expect(apiComplianceFields(product).find((item) => item.label === '分类标准')?.value).toBe('—')
    expect(apiProviderFields(product).find((item) => item.label === '提供方')?.value).toBe('—')
  })

  it('lists only available supporting files', () => {
    const product = { ...api, spaceMeta: { ...api.spaceMeta, deliveryNoteUrl: undefined } }
    expect(apiSupportingFiles(product).map((item) => item.label)).toEqual(['合规声明文件', '数据来源声明'])
    expect(apiSupportingFiles(product).every((item) => item.value === '下载' && item.href)).toBe(true)
  })
})
