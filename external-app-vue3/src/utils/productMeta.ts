import type { ProductType, DealChannel, ProductOrigin, Product } from '@/types/domain'

export const typeMeta = {
  dataset: { label: '数据集', icon: '🗄️' },
  api: { label: 'API', icon: '🔌' },
  report: { label: '行业报告', icon: '📘' },
  dashboard: { label: '自有看板', icon: '📊' }
} satisfies Record<ProductType, { label: string; icon: string }>

export const dealChannelMeta: Record<DealChannel, { label: string; tone: string }> = {
  app_payment: { label: 'APP 支付', tone: 'bg-blue-50 text-blue-600' },
  space_purchase: { label: '可信空间购买', tone: 'bg-purple-50 text-purple-600' }
}

export const originMeta = {
  asset_platform: '资产平台',
  app_content: 'APP 自有内容',
  trusted_space: '可信空间',
  user_created: '用户创建'
} satisfies Record<ProductOrigin, string>

export interface PriceDisplay {
  label: string
  tone: string
}

/** 列表/卡片价格标签：覆盖全部 PriceModel；quote 报价商品有套餐时取最低单价展示「起」，无套餐时展示「按报价」 */
export function priceDisplay(p: Product): PriceDisplay {
  const price = p.price
  if (price.model === 'free') return { label: '免费', tone: 'text-emerald-600' }
  if (price.model === 'member_free') return { label: '会员免费', tone: 'text-amber-600' }
  if (price.model === 'quote') {
    let lowest: { value: number; text: string } | null = null
    for (const plan of p.typeDetail.api?.pricingPlans ?? []) {
      const m = plan.price.match(/¥([\d,.]+)(\/\S*)?/)
      if (!m) continue
      const value = Number(m[1].replace(/,/g, ''))
      if (Number.isFinite(value) && (!lowest || value < lowest.value)) {
        lowest = { value, text: `¥${m[1]}${m[2] ?? ''}` }
      }
    }
    return lowest
      ? { label: `${lowest.text} 起`, tone: 'text-brand-600' }
      : { label: '按报价', tone: 'text-slate-500' }
  }
  return { label: `¥${price.itemPrice}`, tone: 'text-brand-600' }
}
