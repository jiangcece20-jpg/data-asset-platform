import type { Product } from '@/types/domain'

export function productDirectoryOptions(products: Product[]): string[] {
  return [...new Set(products.flatMap((product) => product.scenarios.map((value) => value.trim()).filter(Boolean)))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function productInDirectory(product: Product, directory: string): boolean {
  return !directory || product.scenarios.some((scenario) => scenario.trim() === directory)
}
