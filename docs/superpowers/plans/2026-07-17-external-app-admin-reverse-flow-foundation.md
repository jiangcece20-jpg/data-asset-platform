# External App Admin Reverse-Flow Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish a unified reverse-work-order foundation and complete the representative product pause, delist, and compliance-recall chains across the PC admin and customer-facing prototype.

**Architecture:** Keep reverse-flow decisions in pure domain policies, persist immutable impact snapshots in a normalized Pinia work-order store, and coordinate product, entitlement, and recommendation mutations through a product-reverse orchestrator. Product Center remains the action origin; Approval & Integration receives the work-order list and detail subpages; mobile pages render the resulting sales, service, and entitlement states.

**Tech Stack:** Vue 3.4, TypeScript 5.5, Vite 5, Pinia 2, Vue Router 4, Tailwind CSS 3, Vitest 3, Vue Test Utils 2, jsdom 26.

## Global Constraints

- Complete `docs/superpowers/plans/2026-07-16-external-app-product-types-detail.md` first, then verify it with `npm test && npm run build` from `external-app-vue3`.
- Change only `external-app-vue3` and its README unless this plan names a documentation file. Do not edit the React prototype or `external-app-vue3_old_1783768156`.
- Do not add a new first-level PC admin navigation item. Reverse work orders live under “审批与集成”.
- Pausing sales blocks only new purchases. It must not silently remove historical access.
- Reason-driven treatment is mandatory: commercial adjustment keeps service, quality issues degrade and compensate, compliance risk suspends and freezes, permanent upstream stop delists and enters migration-or-refund handling.
- Real payment refunds, contract termination, customer messaging, and trusted-space APIs remain typed boundaries only; do not fake successful external integrations.
- Business records and timelines are append-only. Never physically delete orders, entitlements, notices, approvals, or work-order history.
- Do not commit preview output, `dist`, `node_modules`, or the old backup directory.
- For every task: write the failing test first, confirm the expected failure, implement the minimum behavior, rerun focused tests, then run the full test/build commands named in the task.

## Scope Decomposition

This design crosses four independently deployable subsystems, so implementation is intentionally split into separate plans:

1. **This plan — foundation and product reversal:** unified work order, impact snapshot, product pause/delist/recall, entitlement freeze, customer visibility, and closure gates.
2. **Follow-up — demand-to-supply backflow:** demand merge/split/reopen, shared supply tasks, publication callbacks, and withdrawal semantics.
3. **Follow-up — commerce and after-sales:** payment ambiguity, refund sequencing, contract termination, delivery reconciliation, compensation, and enterprise seats.
4. **Follow-up — configuration and integration governance:** configuration versions/rollback, connector retries/dead letters, trusted-space reconciliation, and manual repair audit.

The first plan deliberately establishes the shared objects used by the later three without pretending to implement their external side effects.

## File Structure

Create:

- `external-app-vue3/src/types/reverseFlow.ts` — reverse-flow states and normalized business objects.
- `external-app-vue3/src/domain/productReversePolicy.ts` — reason/action decision matrix.
- `external-app-vue3/src/domain/productReversePolicy.test.ts` — policy contract tests.
- `external-app-vue3/src/domain/productImpact.ts` — immutable impact-snapshot builder.
- `external-app-vue3/src/domain/productImpact.test.ts` — aggregation and deduplication tests.
- `external-app-vue3/src/stores/reverseWorkOrders.ts` — normalized work-order records, transitions, tasks, notices, and close gates.
- `external-app-vue3/src/stores/reverseWorkOrders.test.ts` — work-order lifecycle tests.
- `external-app-vue3/src/stores/productReverse.ts` — cross-store product reverse orchestrator.
- `external-app-vue3/src/stores/productReverse.test.ts` — pause/recall/resume integration tests.
- `external-app-vue3/src/components/admin/reverse-flow/ProductReverseActionModal.vue` — impact preview and action confirmation.
- `external-app-vue3/src/components/admin/reverse-flow/ProductReverseActionModal.test.ts` — modal safety tests.
- `external-app-vue3/src/components/admin/reverse-flow/ImpactSnapshotPanel.vue` — impact counts and affected-object summary.
- `external-app-vue3/src/components/admin/reverse-flow/ExecutionTaskList.vue` — work-order task checklist.
- `external-app-vue3/src/components/admin/reverse-flow/WorkOrderTimeline.vue` — append-only event timeline.
- `external-app-vue3/src/views/admin/ReverseWorkOrderList.vue` — Approval & Integration subpage list.
- `external-app-vue3/src/views/admin/ReverseWorkOrderDetail.vue` — impact, plan, task, notice, reconciliation, and closure page.
- `external-app-vue3/src/views/admin/ReverseWorkOrders.test.ts` — route and operator-flow tests.
- `external-app-vue3/src/components/mobile/ServiceStatusNotice.vue` — customer-facing service treatment notice.
- `external-app-vue3/src/components/mobile/ServiceStatusNotice.test.ts` — owned/unowned message tests.

Modify:

- `external-app-vue3/src/types/domain.ts` — add service, ownership, and entitlement state fields.
- `external-app-vue3/src/data/products.ts` — initialize service state on the four-type catalog.
- `external-app-vue3/src/stores/catalog.ts` — own product sales/service mutations and clear promotional references during stop-sale.
- `external-app-vue3/src/stores/orders.ts` — retain customer ownership.
- `external-app-vue3/src/stores/entitlements.ts` — freeze/restore by work order.
- `external-app-vue3/src/data/seed.ts` — consistent service state and historical purchased entitlement.
- `external-app-vue3/src/domain/productAccess.ts` — include service state in access decisions.
- `external-app-vue3/src/domain/productAccess.test.ts` — paused/degraded/suspended access rules.
- `external-app-vue3/src/views/admin/ProductEdit.vue` — replace direct status toggles with reverse-flow initiation.
- `external-app-vue3/src/views/admin/ApprovalIntegration.vue` — expose reverse-work-order entry and counts.
- `external-app-vue3/src/views/admin/Dashboard.vue` — surface pending reverse-work-order count.
- `external-app-vue3/src/views/mobile/ProductDetail.vue` — render service treatment and safe action state.
- `external-app-vue3/src/views/mobile/Mine.vue` — show customer-specific service notices.
- `external-app-vue3/src/router/index.ts` — add only nested reverse-work-order routes.
- `external-app-vue3/src/utils/statusMeta.ts` — service/work-order/severity labels.
- `external-app-vue3/src/components/StatusBadge.vue` — extend its typed metadata lookup for the new status groups.
- `external-app-vue3/README.md` — document three deterministic reverse-flow demos.

---

### Task 1: Define reverse-flow contracts and the reason-driven policy

**Files:**

- Create: `external-app-vue3/src/types/reverseFlow.ts`
- Create: `external-app-vue3/src/domain/productReversePolicy.ts`
- Test: `external-app-vue3/src/domain/productReversePolicy.test.ts`
- Modify: `external-app-vue3/src/types/domain.ts`
- Modify: `external-app-vue3/src/data/products.ts`
- Modify: `external-app-vue3/src/data/seed.ts`
- Modify: `external-app-vue3/src/stores/orders.ts`
- Modify: `external-app-vue3/src/stores/entitlements.ts`
- Modify: `external-app-vue3/src/stores/trials.ts`

**Step 1: Write the failing policy tests**

Create `src/domain/productReversePolicy.test.ts` with the decision table as executable examples:

```ts
import { describe, expect, it } from 'vitest'
import { resolveProductReversePolicy } from './productReversePolicy'

describe('resolveProductReversePolicy', () => {
  it.each([
    ['pause', 'commercial_adjustment', true, 'paused', 'normal', 'keep', 'S3', true],
    ['pause', 'quality_issue', true, 'paused', 'degraded', 'keep_and_compensate', 'S2', true],
    ['recall', 'quality_issue', true, 'paused', 'suspended', 'freeze', 'S2', true],
    ['recall', 'compliance_risk', true, 'paused', 'suspended', 'freeze', 'S1', true],
    ['delist', 'upstream_stop', true, 'delisted', 'terminated', 'migrate_or_refund', 'S2', true],
    ['delist', 'commercial_adjustment', true, 'delisted', 'normal', 'keep', 'S3', true],
    ['pause', 'commercial_adjustment', false, 'paused', 'normal', 'keep', 'S3', false],
  ] as const)(
    '%s / %s applies the expected treatment',
    (action, reason, hasCustomerImpact, availability, service, entitlement, severity, createsWorkOrder) => {
      expect(resolveProductReversePolicy({ action, reason, hasCustomerImpact })).toMatchObject({
        availability,
        service,
        entitlement,
        severity,
        createsWorkOrder,
        requiresCustomerNotice: hasCustomerImpact,
        requiresReview: true,
      })
    },
  )

  it('rejects a commercial recall', () => {
    expect(() => resolveProductReversePolicy({
      action: 'recall',
      reason: 'commercial_adjustment',
      hasCustomerImpact: true,
    })).toThrow('召回仅允许质量或合规原因')
  })
})
```

**Step 2: Run the test and confirm the expected failure**

Run:

```bash
cd external-app-vue3
npm test -- src/domain/productReversePolicy.test.ts
```

Expected: FAIL because `productReversePolicy.ts` and reverse-flow types do not exist.

**Step 3: Add the normalized contracts**

Create `src/types/reverseFlow.ts` with these exact unions and objects:

```ts
import type { AvailabilityStatus } from './domain'

export type ServiceStatus = 'normal' | 'degraded' | 'suspended' | 'terminated'
export type EntitlementStatus = 'pending' | 'active' | 'frozen' | 'migrating' | 'expired' | 'revoked'
export type DeliveryStatus = 'pending' | 'delivering' | 'succeeded' | 'failed' | 'withdrawn'
export type RefundStatus = 'not_requested' | 'reviewing' | 'processing' | 'succeeded' | 'failed' | 'rejected'
export type ReverseSeverity = 'S1' | 'S2' | 'S3'
export type ProductReverseAction = 'pause' | 'delist' | 'recall'
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
  type: 'stop_new_sales' | 'remove_references' | 'decide_customer_treatment' | 'notify_customers' | 'reconcile_state'
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
  subjectType: 'product'
  subjectId: string
  action: ProductReverseAction
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
```

Modify existing domain contracts:

```ts
// Product
serviceStatus: ServiceStatus
salesReviewOwner?: string
salesReviewAt?: string

// Order
ownerId: string

// Entitlement
ownerId: string
status: EntitlementStatus
reverseWorkOrderId?: string

// TrialApplication
ownerId: string
```

Import `ServiceStatus` and `EntitlementStatus` with `import type`. Update every product seed to `serviceStatus: 'normal'`, every order creator to preserve the current member/enterprise owner, every entitlement creator to start as `status: 'active'`, and every trial creator to preserve the current member or enterprise owner. Do not use non-null assertions to bypass missing ownership.

**Step 4: Implement the pure policy**

Create `src/domain/productReversePolicy.ts`:

```ts
import type {
  ProductReversePolicy,
  ProductReverseAction,
  ReverseReasonCode,
} from '../types/reverseFlow'

interface PolicyInput {
  action: ProductReverseAction
  reason: ReverseReasonCode
  hasCustomerImpact: boolean
}

export function resolveProductReversePolicy(input: PolicyInput): ProductReversePolicy {
  const { action, reason, hasCustomerImpact } = input

  if (action === 'recall' && !['quality_issue', 'compliance_risk'].includes(reason)) {
    throw new Error('召回仅允许质量或合规原因')
  }
  if (action === 'pause' && !['commercial_adjustment', 'quality_issue'].includes(reason)) {
    throw new Error('暂停销售仅允许商业调整或质量问题')
  }
  if (action === 'delist' && !['commercial_adjustment', 'upstream_stop'].includes(reason)) {
    throw new Error('下架仅允许商业调整或上游停供')
  }

  if (reason === 'compliance_risk') {
    return {
      availability: 'paused',
      service: 'suspended',
      entitlement: 'freeze',
      severity: 'S1',
      createsWorkOrder: true,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (reason === 'quality_issue' && action === 'recall') {
    return {
      availability: 'paused',
      service: 'suspended',
      entitlement: 'freeze',
      severity: 'S2',
      createsWorkOrder: true,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (reason === 'quality_issue') {
    return {
      availability: 'paused',
      service: 'degraded',
      entitlement: 'keep_and_compensate',
      severity: 'S2',
      createsWorkOrder: hasCustomerImpact,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (reason === 'upstream_stop') {
    return {
      availability: 'delisted',
      service: 'terminated',
      entitlement: 'migrate_or_refund',
      severity: 'S2',
      createsWorkOrder: hasCustomerImpact,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (action === 'delist') {
    return {
      availability: 'delisted',
      service: 'normal',
      entitlement: 'keep',
      severity: 'S3',
      createsWorkOrder: hasCustomerImpact,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  return {
    availability: 'paused',
    service: 'normal',
    entitlement: 'keep',
    severity: 'S3',
    createsWorkOrder: hasCustomerImpact,
    requiresCustomerNotice: hasCustomerImpact,
    requiresReview: true,
  }
}
```

**Step 5: Verify and commit**

Run:

```bash
npm test -- src/domain/productReversePolicy.test.ts
npm test
npm run build
```

Expected: all commands pass.

Commit:

```bash
git add external-app-vue3/src/types/reverseFlow.ts external-app-vue3/src/types/domain.ts external-app-vue3/src/domain/productReversePolicy.ts external-app-vue3/src/domain/productReversePolicy.test.ts external-app-vue3/src/data/products.ts external-app-vue3/src/data/seed.ts external-app-vue3/src/stores/orders.ts external-app-vue3/src/stores/entitlements.ts external-app-vue3/src/stores/trials.ts
git commit -m "feat: add reverse-flow domain policy"
```

---

### Task 2: Build immutable product impact snapshots

**Files:**

- Create: `external-app-vue3/src/domain/productImpact.ts`
- Test: `external-app-vue3/src/domain/productImpact.test.ts`
- Modify: `external-app-vue3/src/data/seed.ts`

**Step 1: Write the failing aggregation tests**

Create fixtures containing two in-flight orders for one customer, one completed order, one active entitlement, two enterprise members, one active trial, one listing request, two catalog references, and one contract. Assert that `buildProductImpactSnapshot`:

- includes only the in-flight order IDs;
- includes active/frozen/migrating entitlements but not expired/revoked ones;
- deduplicates personal and enterprise customer IDs;
- retains both enterprise member IDs;
- includes the trial, listing request, reference, and contract IDs;
- returns new arrays that do not change when the fixture arrays are later mutated.

Use this public input contract in the test:

```ts
const snapshot = buildProductImpactSnapshot({
  id: 'impact-001',
  productId: 'prod-logistics-monthly',
  createdAt: '2026-07-17T10:00:00.000Z',
  orders,
  entitlements,
  trials,
  listingRequests,
  enterpriseMembers,
  catalogReferences,
  contracts,
})
```

**Step 2: Run the focused test**

Run:

```bash
cd external-app-vue3
npm test -- src/domain/productImpact.test.ts
```

Expected: FAIL because `buildProductImpactSnapshot` does not exist.

**Step 3: Implement the snapshot builder**

Create `src/domain/productImpact.ts`. Export input boundary types locally rather than widening the shared production models for prototype-only external records:

```ts
import type { Entitlement, Order } from '../types/domain'
import type { ImpactSnapshot } from '../types/reverseFlow'

const IN_FLIGHT_ORDER_STATUSES = new Set([
  'pending_payment',
  'paid',
  'pending_redirect',
  'space_processing',
  'purchase_success',
  'callback_delayed',
  'delivering',
])
const IMPACTED_ENTITLEMENT_STATUSES = new Set(['active', 'frozen', 'migrating'])

export interface ProductImpactTrial {
  id: string
  productId: string
  ownerId: string
  status: string
}

export interface ProductImpactListingRequest {
  id: string
  productId?: string
  userId: string
  status: string
}

export interface ProductImpactEnterpriseMember {
  id: string
  enterpriseId: string
  productId: string
  status: string
}

export interface ProductImpactReference {
  id: string
  productId: string
  type: 'recommendation' | 'search_index' | 'ai_reference' | 'content'
}

export interface ProductImpactContract {
  id: string
  productId: string
  customerId: string
  status: string
}

interface BuildProductImpactInput {
  id: string
  productId: string
  createdAt: string
  orders: Order[]
  entitlements: Entitlement[]
  trials: ProductImpactTrial[]
  listingRequests: ProductImpactListingRequest[]
  enterpriseMembers: ProductImpactEnterpriseMember[]
  catalogReferences: ProductImpactReference[]
  contracts: ProductImpactContract[]
}

export function buildProductImpactSnapshot(input: BuildProductImpactInput): ImpactSnapshot {
  const inFlightOrders = input.orders.filter(
    (item) => item.productId === input.productId && IN_FLIGHT_ORDER_STATUSES.has(item.status),
  )
  const activeEntitlements = input.entitlements.filter(
    (item) => item.productId === input.productId && IMPACTED_ENTITLEMENT_STATUSES.has(item.status),
  )
  const members = input.enterpriseMembers.filter(
    (item) => item.productId === input.productId && item.status === 'active',
  )
  const trials = input.trials.filter(
    (item) => item.productId === input.productId && ['pending', 'approved'].includes(item.status),
  )
  const requests = input.listingRequests.filter(
    (item) => item.productId === input.productId && item.status !== 'unsupported',
  )
  const references = input.catalogReferences.filter((item) => item.productId === input.productId)
  const contracts = input.contracts.filter(
    (item) => item.productId === input.productId && item.status === 'active',
  )
  const customerIds = new Set<string>()
  inFlightOrders.forEach((item) => customerIds.add(item.ownerId))
  activeEntitlements.forEach((item) => customerIds.add(item.ownerId))
  members.forEach((item) => customerIds.add(item.enterpriseId))
  trials.forEach((item) => customerIds.add(item.ownerId))
  requests.forEach((item) => customerIds.add(item.userId))
  contracts.forEach((item) => customerIds.add(item.customerId))

  return {
    id: input.id,
    productId: input.productId,
    createdAt: input.createdAt,
    customerIds: [...customerIds],
    inFlightOrderIds: inFlightOrders.map((item) => item.id),
    activeEntitlementIds: activeEntitlements.map((item) => item.id),
    enterpriseMemberIds: members.map((item) => item.id),
    trialIds: trials.map((item) => item.id),
    listingRequestIds: requests.map((item) => item.id),
    catalogReferenceIds: references.map((item) => item.id),
    contractIds: contracts.map((item) => item.id),
    isComplete: true,
  }
}
```

The order literals above match the prerequisite plan’s `AppOrderStatus | SpaceOrderStatus` union. Keep them typed; do not cast with `as any`.

**Step 4: Add one consistent historical purchase seed**

Add a monthly-report order and permanent version-bound entitlement whose customer, product version, and ownership all agree:

```ts
{
  id: 'order-history-001',
  channel: 'app',
  ownerType: 'personal',
  ownerId: 'mem-1',
  productId: 'prod-logistics-monthly',
  productName: '物流行业月报',
  amount: 99,
  status: 'entitlement_active',
  createdAt: '2026-07-17T09:00:00.000Z',
  paidAt: '2026-07-17T09:01:00.000Z',
}
```

```ts
{
  id: 'ent-history-001',
  ownerId: 'mem-1',
  productId: 'prod-logistics-monthly',
  productVersion: 'V2026-07',
  source: 'personal',
  type: 'item',
  status: 'active',
  validFrom: '2026-07-17',
}
```

Reuse the seed’s actual entitlement field names. Keep `validTo` absent because the prerequisite report policy permanently binds this single-item purchase to `V2026-07`; do not turn it into a 12-month dashboard entitlement.

**Step 5: Verify and commit**

Run:

```bash
npm test -- src/domain/productImpact.test.ts src/stores/entitlements.test.ts
npm test
npm run build
```

Expected: all commands pass.

Commit:

```bash
git add external-app-vue3/src/domain/productImpact.ts external-app-vue3/src/domain/productImpact.test.ts external-app-vue3/src/data/seed.ts
git commit -m "feat: snapshot product reverse-flow impact"
```

---

### Task 3: Implement the normalized reverse-work-order lifecycle

**Files:**

- Create: `external-app-vue3/src/stores/reverseWorkOrders.ts`
- Test: `external-app-vue3/src/stores/reverseWorkOrders.test.ts`

**Step 1: Write failing store tests**

Cover these behaviors with a fresh Pinia per test:

1. `createProductWorkOrder` stores one work order, its immutable impact snapshot, one treatment plan, five execution tasks, one pending notice per affected customer, required proposed compensation records, and a `created` timeline entry.
2. The five task types are exactly `stop_new_sales`, `remove_references`, `decide_customer_treatment`, `notify_customers`, and `reconcile_state`.
3. Getters `byId`, `impactFor`, `plansFor`, `tasksFor`, `noticesFor`, `compensationsFor`, and `openForProduct` return stable normalized views.
4. Legal status transitions follow the ordered workflow; skipping a stage throws `工单状态流转不合法`.
5. Closing is rejected in this exact gate order: incomplete impact, unfinished task, unresolved notice, incomplete compensation/disposition, unconfirmed plan, unreconciled state, incomplete closure review.
6. Cancellation works only for an untouched `pending_assessment` work order; otherwise it throws `已开始处理的工单不能取消，请创建后续工单`.
7. `createFollowUp` sets `parentWorkOrderId` and appends linked timeline entries without editing the closed parent.
8. S1/S2 cannot be initiated, plan-confirmed, and closed by the same person alone.
9. Notice delivery can fail once plus three retries; it then requires a recorded manual-contact result before closure.
10. SLA dates are deterministic: S1 acknowledges in 15 minutes and plans in 1 hour; S2 acknowledges in 2 hours and plans in 1 business day; S3 acknowledges in 1 business day and closes or records a plan in 3 business days.
11. Transitioning into cross-system verification is blocked until notices and compensation/disposition records are resolved.
12. Rejecting a draft plan returns the work order to impact analysis; revising creates version 2 without overwriting rejected version 1.
13. A compensation/disposition record cannot become completed without a non-empty evidence reference.

**Step 2: Run the focused test**

Run:

```bash
cd external-app-vue3
npm test -- src/stores/reverseWorkOrders.test.ts
```

Expected: FAIL because the store does not exist.

**Step 3: Create the store state and factory**

Use normalized arrays rather than nesting mutable copies:

```ts
interface ReverseWorkOrderState {
  workOrders: ReverseWorkOrder[]
  impacts: ImpactSnapshot[]
  plans: TreatmentPlan[]
  tasks: ExecutionTask[]
  notices: CustomerNotice[]
  compensations: CompensationRecord[]
  timeline: ReverseTimelineEntry[]
}
```

Expose this creation contract:

```ts
interface CreateProductWorkOrderInput {
  subjectId: string
  action: ProductReverseAction
  reason: ReverseReasonCode
  reasonDetail: string
  severity: ReverseSeverity
  impact: ImpactSnapshot
  entitlementTreatment: EntitlementTreatment
  treatmentSummary: string
  createdBy: string
  owner: string
  reviewAt: string
  customerNoticeContent: string
  parentWorkOrderId?: string
}
```

Generate prototype IDs with the existing `genId` helper and timestamps with `new Date().toISOString()`. Tests use `vi.useFakeTimers()` plus `vi.setSystemTime(...)` and assert ID prefixes rather than the module-level counter value. The returned work-order ID must be immediately routable. Clone every array from `impact` before storing it and set `impact.workOrderId` on the stored copy only. For `keep_and_compensate`, create one proposed extension record per affected customer. For `migrate_or_refund`, create one proposed replacement record per customer; the operator must choose `replacement` or `refund` and supply an evidence reference before completing it. This records an external result without pretending the prototype executed a real refund or migration.

Implement `addBusinessDays` by advancing UTC calendar dates and skipping Saturday/Sunday. Derive `acknowledgeDueAt` and `planDueAt` from severity; do not rely on locale parsing or the browser clock in tests.

```ts
function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString()
}

function addBusinessDays(iso: string, days: number): string {
  const date = new Date(iso)
  let remaining = days
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining -= 1
  }
  return date.toISOString()
}

function deadlines(severity: ReverseSeverity, createdAt: string) {
  if (severity === 'S1') return {
    acknowledgeDueAt: addMinutes(createdAt, 15),
    planDueAt: addMinutes(createdAt, 60),
  }
  if (severity === 'S2') return {
    acknowledgeDueAt: addMinutes(createdAt, 120),
    planDueAt: addBusinessDays(createdAt, 1),
  }
  return {
    acknowledgeDueAt: addBusinessDays(createdAt, 1),
    planDueAt: addBusinessDays(createdAt, 3),
  }
}
```

**Step 4: Implement transitions, completion actions, and close gates**

Use this exact legal flow:

```ts
const FLOW: Record<ReverseWorkOrderStatus, ReverseWorkOrderStatus[]> = {
  pending_assessment: ['impact_analysis', 'cancelled'],
  impact_analysis: ['plan_confirmation'],
  plan_confirmation: ['executing'],
  executing: ['customer_handling'],
  customer_handling: ['cross_system_verification'],
  cross_system_verification: ['closed'],
  closed: [],
  cancelled: [],
}
```

Provide named actions instead of allowing view components to mutate state directly:

```ts
transition(id, nextStatus, actor)
acknowledge(id, actor)
completeTask(workOrderId, taskId, actor)
confirmPlan(workOrderId, actor)
rejectPlan(workOrderId, actor, reason)
revisePlan(workOrderId, patch, actor)
markNoticeDelivered(workOrderId, noticeId, actor)
markNoticeFailed(workOrderId, noticeId, actor)
markNoticeManualConfirmed(workOrderId, noticeId, actor, result)
updateCompensation(workOrderId, compensationId, patch, actor)
recordClosureReview(workOrderId, { rootCause, improvementAction, preventionAction, responsibilityOwner }, actor)
markCrossSystemReconciled(workOrderId, actor)
close(workOrderId, actor)
cancel(workOrderId, actor, reason)
createFollowUp(parentWorkOrderId, input)
```

`confirmPlan` completes `decide_customer_treatment`; delivery/manual confirmation of the last notice completes `notify_customers`; reconciliation completes `reconcile_state`. If a work order has no affected customer, create no notice/compensation record and pre-complete its notification task with a system timeline entry. `markNoticeFailed` allows an initial failed attempt plus three retries (maximum `attempts === 4`); after that, only manual confirmation or a successful delivery resolves the notice.

`rejectPlan` is allowed only in `plan_confirmation`, marks the current plan rejected, and returns the work order to `impact_analysis`. `revisePlan` creates a new draft with `version + 1` and updates `treatmentPlanId`; it never edits the rejected record.

`updateCompensation` rejects `status: 'completed'` unless `evidenceReference.trim()` is non-empty, with `处置完成凭证尚未填写`. It records the completion time but does not call payment, finance, contract, or trusted-space APIs.

`cancel` additionally verifies that no task was completed, no notice attempt occurred, no plan was confirmed/rejected, and no compensation changed from proposed. Status alone is not sufficient to prove the work order is untouched.

Before `transition(..., 'cross_system_verification', ...)`, apply the same notice and compensation gates used by `close`. Expose `plansFor(workOrderId)` and `compensationsFor(workOrderId)` beside the other normalized getters.

`close` checks gates in this exact order and throws these exact messages:

```ts
if (!impact.isComplete) throw new Error('影响快照尚未补齐')
if (tasks.some((item) => !item.completedAt)) throw new Error('仍有未完成执行任务')
if (notices.some((item) => !['delivered', 'manual_confirmed'].includes(item.status))) throw new Error('客户通知尚未完成')
if (compensations.some((item) => item.status !== 'completed')) throw new Error('客户补偿或迁移退款处置尚未完成')
if (!plan.confirmedAt) throw new Error('处置方案尚未确认')
if (!workOrder.crossSystemReconciledAt) throw new Error('跨系统状态尚未核验')
if (![workOrder.rootCause, workOrder.improvementAction, workOrder.preventionAction, workOrder.responsibilityOwner].every((item) => item?.trim())) {
  throw new Error('根因和改进措施尚未填写')
}
if (['S1', 'S2'].includes(workOrder.severity)
  && workOrder.createdBy === plan.confirmedBy
  && workOrder.createdBy === actor) {
  throw new Error('S1/S2 工单不能由发起人独自审批并关闭')
}
```

Every action appends a timeline entry. Never splice historical entries.

**Step 5: Verify and commit**

Run:

```bash
npm test -- src/stores/reverseWorkOrders.test.ts
npm test
npm run build
```

Expected: all commands pass.

Commit:

```bash
git add external-app-vue3/src/stores/reverseWorkOrders.ts external-app-vue3/src/stores/reverseWorkOrders.test.ts
git commit -m "feat: add reverse work-order lifecycle"
```

---

### Task 4: Orchestrate product, entitlement, and catalog reversal

**Files:**

- Create: `external-app-vue3/src/stores/productReverse.ts`
- Test: `external-app-vue3/src/stores/productReverse.test.ts`
- Modify: `external-app-vue3/src/stores/catalog.ts`
- Modify: `external-app-vue3/src/stores/entitlements.ts`

**Step 1: Write failing cross-store tests**

Use the seeded monthly report and free dashboard to prove:

```ts
it('commercial pause blocks new sales but keeps historical access active')
it('compliance recall suspends service and freezes affected entitlements')
it('upstream delist terminates service and marks affected entitlements migrating')
it('pausing an unowned free product does not create an unnecessary work order')
it('resume sales refuses while an open S1 or S2 work order exists')
it('restoring service requires cross-system verification and unfreezes only this work order')
it('resuming sales does not silently restore recommendation placement')
it('records owner, review time, and append-only audit even when no work order is needed')
it('raises an otherwise S3 action to S2 when more than one customer is affected')
it('removes a stopped product from discovery while preserving direct historical lookup')
```

Assert exact state changes, work-order severity, treatment plan, entitlement state, and recommendation removal in each case.

**Step 2: Run the focused test**

Run:

```bash
cd external-app-vue3
npm test -- src/stores/productReverse.test.ts
```

Expected: FAIL because the orchestrator and explicit mutations do not exist.

**Step 3: Add narrow store mutations**

Add these actions to the owning stores:

```ts
// catalog.ts
updateAvailability(productId: string, availability: AvailabilityStatus): void
updateServiceStatus(productId: string, serviceStatus: ServiceStatus): void
clearRecommendation(productId: string): void
setSalesReview(productId: string, owner: string, reviewAt: string): void
clearSalesReview(productId: string): void

// entitlements.ts
freezeByProduct(productId: string, workOrderId: string): void
markMigratingByProduct(productId: string, workOrderId: string): void
restoreByWorkOrder(workOrderId: string): void
```

`freezeByProduct` and `markMigratingByProduct` update only active entitlements and record `reverseWorkOrderId`. `restoreByWorkOrder` updates only `frozen` entitlements linked to that same work order; it must not restore `migrating` entitlements. Product or view code must not write store arrays directly.

Change `catalog.discoverable` and search to include only `candidate`, `preparing`, and `published`. `paused` and `delisted` products remain available through `byId` for historical orders/rights but disappear from new-customer discovery. `clearRecommendation` sets `recommendSlot` false and removes only the merchandising tag `热门`; it must not erase descriptive or compliance tags.

**Step 4: Implement preview and execution**

Export the preview contract:

```ts
export interface ProductReversePreview {
  productId: string
  action: ProductReverseAction
  reason: ReverseReasonCode
  policy: ProductReversePolicy
  impact: ImpactSnapshot
}
```

The `productReverse` store owns `auditEntries: ProductReverseAuditEntry[]`. Every execute, resume, and restore action appends an entry, including an impact-free action with no work order. This is the required audit trail for local atomic changes.

Build impact inputs from the real prototype stores:

- orders from `useOrderStore().list`;
- entitlements from `useEntitlementStore().list`;
- trials from `useTrialStore().list` using the new `ownerId`;
- listing requests from `useListingRequestStore().list` using `userId`;
- active enterprise members by mapping the current enterprise’s entitled products;
- recommendation references from catalog enhancements/`热门` tags and a search-index reference when the product is currently discoverable;
- active contract references from enterprise orders whose contract status is signed or payment-confirmed.

Use empty arrays only for a category whose prototype has no source model. Do not invent successful external-system facts.

The store exposes:

```ts
previewProductReverse(input): ProductReversePreview
executeProductReverse(input & { preview: ProductReversePreview; actor: string; owner: string; reviewAt: string }): { workOrderId?: string }
resumeSales(productId: string, actor: string): void
restoreService(productId: string, workOrderId: string, actor: string): void
```

Execution order is deliberate:

1. Reject a preview whose product/action/reason no longer matches the request.
2. Raise severity from S3 to S2 when the immutable snapshot contains more than one affected customer; never downgrade the policy severity.
3. Create the reverse work order when policy requires one, using `actor` as `createdBy`.
4. Update availability and service state.
5. Clear recommendation/catalog promotion references.
6. Freeze entitlements for `freeze`; mark them migrating for `migrate_or_refund`; leave them active for both keep treatments.
7. Store the owner and review time on the product, and append an audit entry.
8. Mark `stop_new_sales` and `remove_references` tasks complete because those local mutations are now proven.
9. Move a created work order from `pending_assessment` to `impact_analysis` and leave it there for explicit plan confirmation.
10. Return the work-order ID; do not auto-complete customer treatment, notice, compensation, or reconciliation tasks.

`resumeSales` is allowed only when service is `normal` and no open S1/S2 product work order exists. It changes availability to `published`, clears the active review fields, appends an audit entry, and does not recreate recommendation placement. `restoreService` requires the work order to be in `cross_system_verification`, restores only its frozen entitlements, sets service to `normal`, records reconciliation through the work-order store, and appends an audit entry.

**Step 5: Verify and commit**

Run:

```bash
npm test -- src/stores/productReverse.test.ts src/stores/reverseWorkOrders.test.ts
npm test
npm run build
```

Expected: all commands pass.

Commit:

```bash
git add external-app-vue3/src/stores/catalog.ts external-app-vue3/src/stores/entitlements.ts external-app-vue3/src/stores/productReverse.ts external-app-vue3/src/stores/productReverse.test.ts
git commit -m "feat: coordinate product reverse actions"
```

---

### Task 5: Replace direct product status toggles with an impact-preview modal

**Files:**

- Create: `external-app-vue3/src/components/admin/reverse-flow/ProductReverseActionModal.vue`
- Test: `external-app-vue3/src/components/admin/reverse-flow/ProductReverseActionModal.test.ts`
- Create: `external-app-vue3/src/components/admin/reverse-flow/ImpactSnapshotPanel.vue`
- Modify: `external-app-vue3/src/views/admin/ProductEdit.vue`

**Step 1: Write failing component tests**

Mount the modal and assert:

1. It exposes pause, delist, and recall actions.
2. The reason choices are exact: pause = commercial/quality, delist = commercial/upstream stop, recall = quality/compliance.
3. Confirm is disabled until the current action/reason/detail has a returned preview.
4. Changing action or reason invalidates the previous preview.
5. Impact output shows customer, in-flight order, entitlement, member, trial, listing-request, catalog-reference, and contract counts.
6. It renders the exact policy outcome: availability, service, entitlement treatment, severity, notification requirement, and review time.
7. Confirm emits the preview object that was displayed rather than recomputing it in the component.
8. A blank owner or a review time that is not later than the current prototype time blocks preview and shows a validation message.

Use this component contract:

```ts
defineProps<{
  open: boolean
  productName: string
  preview?: ProductReversePreview
}>()

const emit = defineEmits<{
  close: []
  requestPreview: [payload: { action: ProductReverseAction; reason: ReverseReasonCode; reasonDetail: string }]
  confirm: [payload: { preview: ProductReversePreview; reasonDetail: string; owner: string; reviewAt: string }]
}>()
```

**Step 2: Run the focused test**

Run:

```bash
cd external-app-vue3
npm test -- src/components/admin/reverse-flow/ProductReverseActionModal.test.ts
```

Expected: FAIL because the component does not exist.

**Step 3: Implement the modal and impact panel**

Use explicit labels for the treatment matrix:

```ts
const entitlementTreatmentLabels = {
  keep: '保留现有权益',
  keep_and_compensate: '保留权益，恢复后补偿',
  freeze: '立即冻结受影响权益',
  migrate_or_refund: '进入迁移或退款处置',
}
```

Use this exact action/reason map so the modal cannot request a policy-invalid preview:

```ts
const reasonsByAction = {
  pause: ['commercial_adjustment', 'quality_issue'],
  delist: ['commercial_adjustment', 'upstream_stop'],
  recall: ['quality_issue', 'compliance_risk'],
} satisfies Record<ProductReverseAction, ReverseReasonCode[]>
```

The modal must require a non-empty reason detail and owner plus a review time later than `Date.now()` before requesting preview. Tests freeze the clock with `vi.setSystemTime`. The impact panel renders every category even when its count is zero, so an operator can distinguish “已检查且为零” from a missing analysis.

**Step 4: Integrate it into Product Edit**

Remove direct pause/delist status mutations from `ProductEdit.vue`. Wire buttons to:

1. open the modal;
2. call `previewProductReverse` on preview request;
3. call `executeProductReverse` on confirmation;
4. route to `/admin/approval/reverse-work-orders/:id` when a work order is returned;
5. show an inline success result when an impact-free S3 action does not create a work order.

For a product that is `paused` with `serviceStatus === 'normal'`, show “恢复销售”. For `suspended` or `terminated` service, do not expose a direct restore button; link to its open work order.

**Step 5: Verify and commit**

Run:

```bash
npm test -- src/components/admin/reverse-flow/ProductReverseActionModal.test.ts src/stores/productReverse.test.ts
npm test
npm run build
```

Expected: all commands pass.

Commit:

```bash
git add external-app-vue3/src/components/admin/reverse-flow/ProductReverseActionModal.vue external-app-vue3/src/components/admin/reverse-flow/ProductReverseActionModal.test.ts external-app-vue3/src/components/admin/reverse-flow/ImpactSnapshotPanel.vue external-app-vue3/src/views/admin/ProductEdit.vue
git commit -m "feat: require impact preview for product reversal"
```

---

### Task 6: Add reverse-work-order subpages and operator closure controls

**Files:**

- Create: `external-app-vue3/src/components/admin/reverse-flow/ExecutionTaskList.vue`
- Create: `external-app-vue3/src/components/admin/reverse-flow/WorkOrderTimeline.vue`
- Create: `external-app-vue3/src/views/admin/ReverseWorkOrderList.vue`
- Create: `external-app-vue3/src/views/admin/ReverseWorkOrderDetail.vue`
- Test: `external-app-vue3/src/views/admin/ReverseWorkOrders.test.ts`
- Modify: `external-app-vue3/src/views/admin/ApprovalIntegration.vue`
- Modify: `external-app-vue3/src/views/admin/Dashboard.vue`
- Modify: `external-app-vue3/src/router/index.ts`
- Modify: `external-app-vue3/src/utils/statusMeta.ts`
- Modify: `external-app-vue3/src/components/StatusBadge.vue`

**Step 1: Write failing route and operator-flow tests**

Test these routes with a memory history router:

```ts
{ path: '/admin/approval/reverse-work-orders', name: 'admin-reverse-work-orders' }
{ path: '/admin/approval/reverse-work-orders/:id', name: 'admin-reverse-work-order-detail' }
```

Then cover:

- the list sorts open S1 before S2 before S3, closed items after open items, and newest first within a group;
- filters work by status, severity, action, reason, and product ID;
- the detail displays every impact category, treatment plan, all tasks, customer notices, and timeline entries;
- acknowledgment displays its SLA deadline, and overdue S1/S2 items are identifiable;
- marking a notice delivered updates the notice and timeline;
- three failed retries expose manual-contact confirmation and still block closure until a result is recorded;
- required compensation/disposition records require an evidence reference, can be completed, and block cross-system verification while open;
- rejecting a treatment plan returns to impact analysis and a revision preserves the rejected version;
- a close attempt before gates displays the store’s exact error in the page;
- after acknowledgment, ordered stage transitions, plan confirmation, notice delivery, compensation completion, closure review, and reconciliation, close succeeds;
- an S1/S2 initiator cannot also confirm and close alone;
- a closed work order offers “创建后续工单” instead of editable historical fields;
- Approval & Integration links to the list and Dashboard shows the count of open S1/S2 items.

**Step 2: Run the focused tests**

Run:

```bash
cd external-app-vue3
npm test -- src/views/admin/ReverseWorkOrders.test.ts
```

Expected: FAIL because routes and pages do not exist.

**Step 3: Add metadata and routes**

Extend status metadata with:

```ts
serviceStatus: {
  normal: '正常',
  degraded: '降级',
  suspended: '暂停服务',
  terminated: '终止服务',
},
reverseSeverity: { S1: 'S1 紧急', S2: 'S2 高', S3: 'S3 常规' },
reverseWorkOrder: {
  pending_assessment: '待评估',
  impact_analysis: '影响分析',
  plan_confirmation: '方案确认',
  executing: '执行中',
  customer_handling: '客户处置',
  cross_system_verification: '跨系统核验',
  closed: '已关闭',
  cancelled: '已取消',
},
```

Add the two routes under the existing admin shell. Do not add either route to `AdminShell.vue`’s first-level navigation.

**Step 4: Implement list, detail, and shared panels**

The list’s default comparator is:

```ts
const severityRank = { S1: 0, S2: 1, S3: 2 }
const terminal = new Set(['closed', 'cancelled'])

[...items].sort((a, b) =>
  Number(terminal.has(a.status)) - Number(terminal.has(b.status))
  || severityRank[a.severity] - severityRank[b.severity]
  || b.createdAt.localeCompare(a.createdAt),
)
```

The detail page calls store actions only. It must never mutate tasks, notices, compensation, plans, or work-order fields directly. Surface thrown gate errors in a persistent inline alert until the next successful action. Show initiator, owner, acknowledgment/plan SLA, review time, reason detail, parent/follow-up links, and all timestamps. Provide one legal “推进至下一阶段” action at a time; do not offer arbitrary status selection.

`ApprovalIntegration.vue` adds a “逆向工单” card with open total, S1 total, and overdue S1/S2 total. `Dashboard.vue` adds pending and overdue metrics and links to the same nested route.

**Step 5: Verify and commit**

Run:

```bash
npm test -- src/views/admin/ReverseWorkOrders.test.ts src/stores/reverseWorkOrders.test.ts
npm test
npm run build
```

Expected: all commands pass.

Commit:

```bash
git add external-app-vue3/src/components/admin/reverse-flow/ExecutionTaskList.vue external-app-vue3/src/components/admin/reverse-flow/WorkOrderTimeline.vue external-app-vue3/src/views/admin/ReverseWorkOrderList.vue external-app-vue3/src/views/admin/ReverseWorkOrderDetail.vue external-app-vue3/src/views/admin/ReverseWorkOrders.test.ts external-app-vue3/src/views/admin/ApprovalIntegration.vue external-app-vue3/src/views/admin/Dashboard.vue external-app-vue3/src/router/index.ts external-app-vue3/src/utils/statusMeta.ts external-app-vue3/src/components/StatusBadge.vue
git commit -m "feat: add reverse work-order admin pages"
```

---

### Task 7: Make service treatment visible to affected customers

**Files:**

- Create: `external-app-vue3/src/components/mobile/ServiceStatusNotice.vue`
- Test: `external-app-vue3/src/components/mobile/ServiceStatusNotice.test.ts`
- Modify: `external-app-vue3/src/domain/productAccess.ts`
- Test: `external-app-vue3/src/domain/productAccess.test.ts`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/Mine.vue`
- Modify: `external-app-vue3/README.md`

**Step 1: Write failing customer-access tests**

Extend `ProductActionContext` with `serviceStatus`. Add exact expectations:

```ts
it('allows historical access when sales are paused but service remains normal', () => {
  expect(resolveProductActions({
    ...ownedProduct,
    availability: 'paused',
    serviceStatus: 'normal',
    hasAccess: true,
  }).primary.key).toBe('view')
})

it('blocks historical access when compliance handling suspends service', () => {
  expect(resolveProductActions({
    ...ownedProduct,
    availability: 'paused',
    serviceStatus: 'suspended',
    hasAccess: true,
  }).primary).toMatchObject({ key: 'unavailable', label: '服务风险处置中' })
})

it('keeps access during a degraded quality incident', () => {
  expect(resolveProductActions({
    ...ownedProduct,
    availability: 'paused',
    serviceStatus: 'degraded',
    hasAccess: true,
  }).primary.key).toBe('view')
})
```

Create `ServiceStatusNotice.test.ts` in the same red phase. Assert that an owned paused product mentions retained rights, an unowned paused product only says new purchases are paused, and suspended/terminated messages never promise continued access.

**Step 2: Run the focused test**

Run:

```bash
cd external-app-vue3
npm test -- src/domain/productAccess.test.ts src/components/mobile/ServiceStatusNotice.test.ts
```

Expected: FAIL because service status is not part of the resolver and the notice component does not exist.

**Step 3: Update the access resolver**

Check service before `hasAccess`:

```ts
if (context.serviceStatus === 'suspended') {
  return { primary: { key: 'unavailable', label: '服务风险处置中', disabled: true } }
}
if (context.serviceStatus === 'terminated') {
  return { primary: { key: 'unavailable', label: '等待迁移或退款方案', disabled: true } }
}
if (context.hasAccess) return { primary: { key: 'view', label: '立即查看' } }
```

Keep the prerequisite plan’s logic for candidate/preparing/unowned paused/delisted products after the owned-access branch.

**Step 4: Render fixed customer-facing notices**

`ServiceStatusNotice.vue` receives `availability`, `serviceStatus`, and `hasAccess`, then renders only these approved prototype messages:

```ts
const messages = {
  degraded: '当前服务降级，您的权益继续保留；恢复后将按影响情况补偿。',
  suspended: '当前商品正在进行风险处置，受影响能力已暂停；请在“我的－服务通知”查看进展。',
  terminated: '该商品已停止服务，我们将通过服务通知提供迁移或退款方案。',
  pausedOwned: '该商品已暂停新购，您已有的有效权益不受影响。',
  pausedUnowned: '该商品已暂停新购。',
}
```

Message priority is `terminated → suspended → degraded → paused`; a suspended recalled product must never fall through to the reassuring paused-sales copy.

Show the component on Product Detail when service is not normal or sales are paused. In Mine, add a “服务通知” tab that filters `CustomerNotice` by the current member ID and current enterprise ID and shows only `status === 'delivered'` in-app notices. Never expose another customer’s notice. Failed and manually confirmed phone notices remain operator evidence and are not shown as delivered in-app messages.

**Step 5: Document deterministic demo flows**

Add three README scenarios with the exact seed products and expected result:

1. Commercially pause `prod-logistics-monthly`: new purchase disappears, historical `mem-1` access remains, and an S3 work order is created.
2. Recall `prod-logistics-monthly` for compliance: service suspends, `ent-history-001` freezes, mobile access is blocked, and an S1 work order is created.
3. Pause `prod-port-dashboard-free`: no customer-impact work order is created, but the product stops accepting new acquisition.

**Step 6: Run full verification and browser smoke tests**

Run:

```bash
npm test
npm run build
npm run dev
```

Expected: tests pass, production build succeeds, and Vite starts without compile errors.

In the browser, verify:

1. Product Edit has no direct pause/delist/recall mutation that bypasses impact preview.
2. Commercial pause prevents a new purchase while historical customer access continues.
3. Compliance recall freezes the historical entitlement and blocks mobile viewing.
4. Reverse work orders appear under Approval & Integration without a new first-level menu.
5. A work order cannot close while any notice is pending.
6. Completing all tasks and required compensation, confirming the plan, resolving notices, recording the complete closure review, and reconciling permits closure.
7. Resuming sales does not restore the previous recommendation placement.
8. A product with an open S1/S2 work order cannot resume sales directly.
9. Admin and mobile consoles show no uncaught error during all three demos.

Stop the dev server after smoke testing.

**Step 7: Verify repository scope and commit**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: only files named by this plan are changed; no `dist`, `node_modules`, preview output, React prototype, or old backup files are staged.

Commit:

```bash
git add external-app-vue3/src/components/mobile/ServiceStatusNotice.vue external-app-vue3/src/components/mobile/ServiceStatusNotice.test.ts external-app-vue3/src/domain/productAccess.ts external-app-vue3/src/domain/productAccess.test.ts external-app-vue3/src/views/mobile/ProductDetail.vue external-app-vue3/src/views/mobile/Mine.vue external-app-vue3/README.md
git commit -m "feat: expose reverse-flow treatment to customers"
```

## Acceptance Checklist

- [ ] The four-type product-detail prerequisite plan is complete and green before this plan begins.
- [ ] Product reverse decisions are covered by a pure, reason-driven policy test matrix.
- [ ] Sales, service, entitlement, work-order, and severity states are separate typed axes.
- [ ] Every customer-impacting product reversal stores an immutable impact snapshot.
- [ ] Commercial pause retains historical access; temporary quality pause degrades; severe-quality/compliance recall freezes; upstream stop delists and enters migration/refund handling.
- [ ] Product Edit cannot bypass impact preview.
- [ ] Every pause has a future review time and owner; even no-work-order actions retain append-only audit evidence.
- [ ] Recommendation removal is automatic and is not silently reversed by resuming sales.
- [ ] Reverse work orders live under Approval & Integration, not a new first-level navigation item.
- [ ] Work-order history is append-only and follow-up work is linked rather than rewriting closed records.
- [ ] SLA deadlines, acknowledgment, overdue S1/S2 counts, and two-person S1/S2 closure controls are visible and tested.
- [ ] Notice retries stop after the initial failure plus three retries, then require recorded manual handling.
- [ ] Closure is impossible before complete impact, execution, notice, compensation/disposition, plan, reconciliation, and closure-review gates all pass.
- [ ] Affected customers see service state and only their own delivered notices.
- [ ] Focused tests, full tests, production build, and all three browser demo flows pass without console errors.

## Follow-Up Plan Boundaries

After this plan is accepted, write the remaining plans in this order:

1. `2026-07-17-external-app-demand-backflow.md` — search misses, inquiries, listing requests, merge/split/reopen, shared supply tasks, and customer callbacks.
2. `2026-07-17-external-app-commerce-after-sales.md` — payment, refunds, contracts, delivery, rights recovery, enterprise seats, and compensation.
3. `2026-07-17-external-app-config-integration-reversal.md` — configuration versions, approval/rollback, connector retries, dead letters, trusted-space reconciliation, and manual repair.

Each follow-up must reuse `ReverseWorkOrder`, `ImpactSnapshot`, `TreatmentPlan`, `ExecutionTask`, `CustomerNotice`, and `CompensationRecord`; extend subject and task unions deliberately instead of creating a second work-order model.
