import type { AvailabilityStatus } from './domain'

export type ServiceStatus = 'normal' | 'degraded' | 'suspended' | 'terminated'
export type EntitlementStatus = 'pending' | 'active' | 'frozen' | 'migrating' | 'expired' | 'revoked'
export type DeliveryStatus = 'pending' | 'delivering' | 'succeeded' | 'failed' | 'withdrawn'
export type RefundStatus = 'not_requested' | 'reviewing' | 'processing' | 'succeeded' | 'failed' | 'rejected'
export type ReverseSeverity = 'S1' | 'S2' | 'S3'
export type ProductReverseAction = 'pause' | 'delist' | 'recall'
// 售后 / 集成子系统的工单动作（§9、§10、§13）
export type AfterSalesAction = 'refund' | 'batch_refund' | 'contract_termination' | 'reconcile' | 'manual_repair'
export type ReverseReasonCode =
  | 'commercial_adjustment'
  | 'quality_issue'
  | 'compliance_risk'
  | 'upstream_stop'
  | 'config_error'
  | 'customer_request'
  | 'payment_failure'
  | 'delivery_failure'
  | 'identity_mismatch'
export type EntitlementTreatment = 'keep' | 'keep_and_compensate' | 'freeze' | 'migrate_or_refund'
export type ReverseWorkOrderStatus =
  | 'pending_assessment'
  | 'impact_analysis'
  | 'plan_confirmation'
  | 'executing'
  | 'customer_handling'
  | 'cross_system_verification'
  | 'closed'
  | 'cancelled'

export interface ImpactSnapshot {
  id: string
  workOrderId?: string
  productId: string
  createdAt: string
  customerIds: string[]
  inFlightOrderIds: string[]
  activeEntitlementIds: string[]
  enterpriseMemberIds: string[]
  trialIds: string[]
  listingRequestIds: string[]
  catalogReferenceIds: string[]
  contractIds: string[]
  isComplete: boolean
}

export interface TreatmentPlan {
  id: string
  workOrderId: string
  version: number
  status: 'draft' | 'confirmed' | 'rejected'
  entitlementTreatment: EntitlementTreatment
  summary: string
  confirmedBy?: string
  confirmedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
}

export interface ExecutionTask {
  id: string
  workOrderId: string
  type: 'stop_new_sales' | 'remove_references' | 'decide_customer_treatment' | 'notify_customers' | 'reconcile_state' | 'process_refund' | 'revoke_entitlement' | 'reclaim_seats' | 'reconcile_payment' | 'manual_repair'
  title: string
  system: 'app' | 'asset_platform' | 'trusted_space' | 'finance' | 'manual'
  assigneeRole: 'product_ops' | 'compliance' | 'customer_ops' | 'system_executor'
  completedAt?: string
  completedBy?: string
}

export interface CustomerNotice {
  id: string
  workOrderId: string
  customerId: string
  status: 'pending' | 'delivered' | 'failed' | 'manual_confirmed'
  channel: 'in_app' | 'sms' | 'phone'
  contentVersion: string
  content: string
  attempts: number
  deliveredAt?: string
  manualResult?: string
}

export interface CompensationRecord {
  id: string
  workOrderId: string
  customerId: string
  type: 'extension' | 'quota' | 'refund' | 'replacement'
  status: 'proposed' | 'approved' | 'completed' | 'rejected'
  description: string
  evidenceReference?: string
  completedAt?: string
}

export interface ReverseTimelineEntry {
  id: string
  workOrderId: string
  type: 'created' | 'acknowledged' | 'status_changed' | 'task_completed' | 'notice_delivered' | 'notice_failed' | 'notice_manual_confirmed' | 'plan_confirmed' | 'plan_rejected' | 'plan_revised' | 'compensation_updated' | 'reconciled' | 'closure_review_recorded' | 'cancelled' | 'follow_up_created'
  actor: string
  detail: string
  createdAt: string
}

export interface ProductReverseAuditEntry {
  id: string
  productId: string
  workOrderId?: string
  action: ProductReverseAction | 'resume_sales' | 'restore_service'
  actor: string
  detail: string
  createdAt: string
}

export interface ReverseWorkOrder {
  id: string
  subjectType: 'product' | 'supply_task' | 'order' | 'contract' | 'config' | 'integration'
  subjectId: string
  action: ProductReverseAction | AfterSalesAction
  reason: ReverseReasonCode
  reasonDetail: string
  severity: ReverseSeverity
  status: ReverseWorkOrderStatus
  impactSnapshotId: string
  treatmentPlanId: string
  createdBy: string
  owner: string
  reviewAt: string
  acknowledgeDueAt: string
  planDueAt: string
  acknowledgedAt?: string
  rootCause?: string
  improvementAction?: string
  preventionAction?: string
  responsibilityOwner?: string
  crossSystemReconciledAt?: string
  parentWorkOrderId?: string
  closedBy?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ProductReversePolicy {
  availability: AvailabilityStatus
  service: ServiceStatus
  entitlement: EntitlementTreatment
  severity: ReverseSeverity
  createsWorkOrder: boolean
  requiresCustomerNotice: boolean
  requiresReview: boolean
}
