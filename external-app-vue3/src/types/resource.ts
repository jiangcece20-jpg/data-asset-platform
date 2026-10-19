// 资源领域模型 —— 底层数据资产，与 Product（售卖实例）分离
// 关系：1 Resource : 0..1 Product

import type {
  StandardProductType,
  ProductOrigin,
  PriceModel,
  AcquisitionOption,
  DatasetDetail,
  ApiDetail,
  ReportDetail,
  DashboardDetail,
  DashboardPaywallModule,
  DashboardPaywallSelection
} from './domain'
import type { AssetChangeRisk } from './domain'

/** 资源类型（在 StandardProductType 基础上增加 user_view） */
export type ResourceType = StandardProductType | 'user_view'

/** 资源来源（与 ProductOrigin 一致） */
export type ResourceOrigin = ProductOrigin

/** 用数模块产出的用户视图详情 */
export interface UserViewDetail {
  sourceModule: string
  externalId: string
  externalUrl: string
  chartType: string
  dataSourceName: string
  lastViewedAt?: string
  viewCount?: number
}

/** 资源类型详情（在 ProductTypeDetail 基础上增加 userView） */
export interface ResourceTypeDetail {
  dataset?: DatasetDetail
  api?: ApiDetail
  report?: ReportDetail
  dashboard?: DashboardDetail
  userView?: UserViewDetail
}

/** 资源实体 */
export interface Resource {
  id: string
  resourceName: string
  /** 建品前保存的商品名称，与资源原名独立。 */
  productNameDraft?: string
  description?: string
  type: ResourceType
  origin: ResourceOrigin
  typeDetail: ResourceTypeDetail
  createdBy?: string
  enterpriseId?: string
  createdAt: string
  updatedAt: string
  /** 用数模块公开状态的最近同步值；公开并不等于已上架为商品。 */
  sourcePublicDataset?: boolean
  sourceDatasetAvailable?: boolean
  /** 用数公开数据集的展示资料；由源端同步维护。 */
  publicDatasetMetadata?: PublicDatasetMetadata
  /** 仅保存运营修改过的展示字段，后续同步不得覆盖。 */
  publicDatasetOverrides?: Partial<PublicDatasetDisplay>
  publicSyncError?: string
  /** 人工下架保留至人工恢复；仅源端造成的下架可随同步自动恢复。 */
  publicDelistReason?: 'manual' | 'source'
  publicStateHistory?: Array<{ at: string; state: 'published' | 'delisted'; reason: string }>
  /** 资产平台同步信息；非资产平台来源可缺省。 */
  assetStatus?: 'published' | 'paused' | 'delisted'
  commercializable?: boolean
  assetVersion?: string
  lastSyncedAt?: string
  lastCheckedAt?: string
  changeRisk?: AssetChangeRisk
  changeSummary?: string
  /** 未上架资源的定价与打码草稿；上架时写入商品。 */
  pricingDraft?: ResourcePricingDraft
}

export interface PublicDatasetMetadata {
  provider: string
  coverage: string
  updateFrequency: string
  scenarios?: string[]
  valueProposition?: string
  qualityPromise?: string
  complianceNote?: string
}

export interface PublicDatasetDisplay {
  productName: string
  resourceName: string
  description: string
  coverage: string
  updateFrequency: string
  granularity: string
  timeRange: string
  rowCount: number | undefined
  fieldCount: number | null
}

export interface ResourcePricingDraftItemOffer {
  enabled: boolean
  originalPrice: number
  discountZhe: number
  price: number
  allowDownload: boolean
}

export interface ResourcePricingDraft {
  isFree?: boolean
  salePeriodMonths?: number
  personalOffer?: ResourcePricingDraftItemOffer
  enterpriseOffer?: ResourcePricingDraftItemOffer
  standardMemberMode?: 'none' | 'free' | 'discount'
  standardMemberZhe?: number
  standardMemberOriginalPrice?: number
  premiumMemberMode?: 'none' | 'free' | 'discount'
  premiumMemberZhe?: number
  premiumMemberOriginalPrice?: number
  paywall?: DashboardPaywallSelection
  paywallCatalog?: DashboardPaywallModule[]
}

/** 上架表单数据（从资源创建商品时填写） */
export interface ListResourceForm {
  name: string
  subtitle: string
  price: { model: PriceModel; itemPrice?: number; memberDiscount?: number; unit?: string }
  acquisitions: AcquisitionOption[]
  scenarios: string[]
  tags: string[]
}
