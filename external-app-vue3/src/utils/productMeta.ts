import type { ProductType, DealChannel, ProductOrigin } from '@/types/domain'

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
  trusted_space: '可信空间'
} satisfies Record<ProductOrigin, string>
