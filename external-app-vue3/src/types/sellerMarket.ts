/** 入驻商家上架（用数成果转售）原型领域类型 — MVP 看板竖切 */

import type { SellingShot } from '@/domain/sellingShotTemplate'

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
  type: 'dashboard'
  version: string
  sourceModule: string
  dataProvenance: 'owned' | 'derived'
  licenseSummary: string
  updatedAt: string
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
  price: number
  dataProvenance: 'owned' | 'derived'
  complianceSummary: string
  /** 报表卖点截图（总览/指标必填，趋势/发现建议） */
  shots: SellingShot[]
  status: SellerListingStatus
  reviewNote?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}
