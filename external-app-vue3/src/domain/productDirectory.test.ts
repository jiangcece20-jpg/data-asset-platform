import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import { productDirectoryOptions, productInDirectory } from './productDirectory'

const product = (scenarios: string[]) => ({ scenarios } as Product)

describe('product business directory', () => {
  it('builds a deduplicated browse directory from currently available products', () => {
    expect(productDirectoryOptions([
      product(['运价趋势研判', '物流成本分析']),
      product(['运价趋势研判', ' 港口运营分析 ']),
      product([])
    ])).toEqual(['港口运营分析', '物流成本分析', '运价趋势研判'])
  })

  it('filters a product into its chosen directory without excluding other categories', () => {
    expect(productInDirectory(product(['运价趋势研判', '物流成本分析']), '运价趋势研判')).toBe(true)
    expect(productInDirectory(product(['运价趋势研判']), '港口运营分析')).toBe(false)
    expect(productInDirectory(product([]), '')).toBe(true)
  })
})
