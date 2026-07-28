// 资源领域模型 —— 底层数据资产，与 Product（售卖实例）分离
// 关系：1 Resource : 0..1 Product

import type {
  StandardProductType,
  ProductOrigin,
  DatasetDetail,
  ApiDetail,
  ReportDetail,
  DashboardDetail
} from './domain'

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
  type: ResourceType
  origin: ResourceOrigin
  typeDetail: ResourceTypeDetail
  createdBy?: string
  enterpriseId?: string
  createdAt: string
  updatedAt: string
}

/** 上架表单数据（从资源创建商品时填写） */
export interface ListResourceForm {
  name: string
  subtitle: string
  price: { model: string; itemPrice?: number; memberDiscount?: number; unit?: string }
  acquisitions: string[]
  scenarios: string[]
  tags: string[]
}
