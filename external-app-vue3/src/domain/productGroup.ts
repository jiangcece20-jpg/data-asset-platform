import type { Product } from '@/types/domain'

export type ProductPackagingStatus = 'available' | 'linked_here' | 'linked_elsewhere'

export interface ProductPackCandidate {
  product: Product
  selectable: boolean
  packagingStatus: ProductPackagingStatus
  /** 已在其它打包组时，展示关联到的组内代表商品名 */
  linkedToLabel?: string
}

export function groupMembers(products: Product[], productId: string): Product[] {
  const product = products.find((item) => item.id === productId)
  if (!product?.productGroupId) return product ? [product] : []
  return products.filter((item) => item.productGroupId === product.productGroupId)
}

export function isPackagedProduct(products: Product[], productId: string): boolean {
  return groupMembers(products, productId).length > 1
}

function linkedToLabel(products: Product[], productId: string): string {
  const others = groupMembers(products, productId).filter((item) => item.id !== productId)
  if (!others.length) return '其它商品'
  if (others.length === 1) return others[0].name
  return `${others[0].name} 等 ${others.length} 个`
}

export function packCandidates(
  products: Product[],
  editorProductId: string
): ProductPackCandidate[] {
  const editor = products.find((item) => item.id === editorProductId)
  if (!editor) return []
  const editorGroupId = editor.productGroupId
  const editorMemberIds = new Set(groupMembers(products, editorProductId).map((item) => item.id))

  return products
    .filter((item) => item.id !== editorProductId)
    .map((item) => {
      if (editorMemberIds.has(item.id)) {
        return {
          product: item,
          selectable: false,
          packagingStatus: 'linked_here'
        }
      }
      const inOtherPack =
        Boolean(item.productGroupId)
        && item.productGroupId !== editorGroupId
        && isPackagedProduct(products, item.id)
      if (inOtherPack) {
        return {
          product: item,
          selectable: false,
          packagingStatus: 'linked_elsewhere',
          linkedToLabel: linkedToLabel(products, item.id)
        }
      }
      return {
        product: item,
        selectable: true,
        packagingStatus: 'available'
      }
    })
}

export function packagingStatusLabel(candidate: ProductPackCandidate): string {
  if (candidate.packagingStatus === 'linked_here') return '已关联'
  if (candidate.packagingStatus === 'linked_elsewhere') {
    return candidate.linkedToLabel ? `已关联至「${candidate.linkedToLabel}」` : '已在其它打包组'
  }
  return '未打包'
}
