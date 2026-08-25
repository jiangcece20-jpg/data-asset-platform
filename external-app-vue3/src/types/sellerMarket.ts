/** 入驻商家上架（用数成果转售）原型领域类型 — MVP 数据集竖切 */

import type { DatasetDetail } from '@/types/domain'
import type { SellingShot, CustomSellingShot } from '@/domain/sellingShotTemplate'
import type { SellerListingCatalogSpec } from '@/domain/sellerListingSpec'

export type SellerSubjectType = 'personal' | 'enterprise'
export type SellerAccessStatus =
  | 'none'
  | 'pending_review'
  | 'need_supplement'
  | 'approved'
  | 'rejected'
  | 'suspended'

export type SellerListingStatus =
  | 'draft'
  | 'pending_review'
  | 'need_supplement'
  | 'rejected'
  | 'published'
  | 'paused'
  | 'delisted'

export interface SellerCompliancePack {
  /** L1：实名/企业主体 */
  identityVerified: boolean
  realName: string
  idMasked: string
  /** L1：收款账户 */
  payoutAccountMasked: string
  payoutBank: string
  /** L2：合规声明 */
  noPersonalDataResale: boolean
  licenseAcknowledged: boolean
  dataProvenanceDeclared: boolean
  /** L3 规划字段，MVP 可选 */
  l3MaterialsUploaded?: boolean
}

export interface SellerProfile {
  id: string
  subjectType: SellerSubjectType
  memberId: string
  enterpriseId?: string
  displayName: string
  status: SellerAccessStatus
  compliance: SellerCompliancePack
  appliedAt?: string
  reviewedAt?: string
  reviewNote?: string
  updatedAt: string
}

export interface ListableArtifact {
  id: string
  name: string
  type: 'dataset'
  version: string
  sourceModule: string
  dataProvenance: 'owned' | 'derived'
  licenseSummary: string
  updatedAt: string
  /** 运营可再改的数据集说明书；审核通过后写入商品详情 */
  datasetDetail?: DatasetDetail
}

export interface SellerListingApplication {
  id: string
  sellerId: string
  sellerName: string
  artifactId: string
  artifactVersion: string
  productId?: string
  title: string
  subtitle: string
  /** 个人购买价格 */
  price: number
  /** 企业购买价格 */
  enterprisePrice: number
  dataProvenance: 'owned' | 'derived'
  complianceSummary: string
  /** 卖家填写的详情页说明书；审核通过后写入商品 */
  catalogSpec?: SellerListingCatalogSpec
  /** @deprecated 入驻商家不再要求数据预览截图 */
  shots?: SellingShot[]
  /** @deprecated 入驻商家不再要求自定义截图 */
  customShots?: CustomSellingShot[]
  status: SellerListingStatus
  reviewNote?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}
