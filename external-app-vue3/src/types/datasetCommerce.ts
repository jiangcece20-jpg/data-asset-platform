import type { DatasetOfferSubject } from './domain'

export type DatasetPurchaseApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface DatasetPurchaseApprovalRequest {
  id: string
  orderId: string
  enterpriseId: string
  applicantMemberId: string
  productId: string
  productName: string
  amount: number
  status: DatasetPurchaseApprovalStatus
  submittedAt: string
  decidedAt?: string
  decidedBy?: string
  reason?: string
}

export type BiDeliveryStatus = 'pending' | 'provisioning' | 'delivered' | 'failed' | 'suspended' | 'expired'

/** 找数买数仅保留 BI 数据集实例的最小投影，不接管 BI 内部报表和权限模型。 */
export interface BiDatasetDelivery {
  id: string
  orderId: string
  entitlementId: string
  productId: string
  ownerType: DatasetOfferSubject
  ownerId: string
  operatorMemberId: string
  datasetInstanceId?: string
  status: BiDeliveryStatus
  biEntryUrl?: string
  attemptCount: number
  failureReason?: string
  firstUsedAt?: string
  lastUsedAt?: string
  lastSuccessfulRefreshAt?: string
  createdAt: string
  deliveredAt?: string
  updatedAt: string
}

export interface BiProvisionInput {
  productId: string
  resourceId: string
  assetVersion: string
  ownerType: DatasetOfferSubject
  ownerId: string
  operatorMemberId: string
  licenseKind: string
  accessScope: string
  termMonths?: number
  seats?: number
  allowDownload: boolean
}

export interface BiProvisionResult {
  datasetInstanceId: string
  biEntryUrl: string
  deliveredAt: string
  lastSuccessfulRefreshAt: string
}
