import type {
  SpaceOrderDisplayStatus,
  SpaceOrderEvent,
  SpaceOrderEventAssociation,
  SpaceOrderMirror,
  TrustedPurchaseCheck,
  TrustedPurchaseCheckInput
} from '@/types/trustedSpace'

const knownOrderStatus: Record<string, SpaceOrderDisplayStatus> = {
  ACCEPTED: 'accepted',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

export function evaluateTrustedPurchase(input: TrustedPurchaseCheckInput): TrustedPurchaseCheck {
  if (input.enterpriseAuthStatus !== 'authenticated') {
    return { allowed: false, reason: 'enterprise_required' }
  }
  if (input.bindingStatus !== 'active') {
    return { allowed: false, reason: 'binding_required' }
  }
  if (!input.snapshot) {
    return { allowed: false, reason: 'product_unavailable' }
  }
  const age = new Date(input.now).getTime() - new Date(input.snapshot.syncedAt).getTime()
  if (
    input.snapshot.syncState !== 'current' ||
    !Number.isFinite(age) ||
    !Number.isFinite(input.maxAgeMs) ||
    input.maxAgeMs < 0 ||
    age < 0 ||
    age > input.maxAgeMs
  ) {
    return { allowed: false, reason: 'product_stale' }
  }
  if (input.snapshot.saleStatus !== 'published') {
    return { allowed: false, reason: 'product_not_for_sale' }
  }
  return { allowed: true }
}

export function mapSpaceOrderStatus(rawStatus: string): SpaceOrderDisplayStatus {
  return knownOrderStatus[rawStatus] ?? 'unknown_processing'
}

export function canApplySpaceOrderEvent(
  current: SpaceOrderMirror | undefined,
  incoming: SpaceOrderEvent,
  expectedAssociation?: SpaceOrderEventAssociation
): boolean {
  if (!incoming.signatureValid || !expectedAssociation || !matchesAssociation(incoming, expectedAssociation)) {
    return false
  }
  if (!current) return true
  if (!matchesAssociation(incoming, current)) return false
  if (incoming.eventVersion <= current.eventVersion) return false
  const next = mapSpaceOrderStatus(incoming.rawStatus)
  if (['delivered', 'failed', 'cancelled'].includes(current.displayStatus)) {
    return next === current.displayStatus
  }
  if (next === 'unknown_processing' || next === 'failed' || next === 'cancelled') return true
  const rank: Record<Exclude<SpaceOrderDisplayStatus, 'unknown_processing' | 'failed' | 'cancelled'>, number> = {
    accepted: 0,
    pending_payment: 1,
    paid: 2,
    delivering: 3,
    delivered: 4
  }
  const currentRank = rank[current.displayStatus as keyof typeof rank]
  return currentRank === undefined || rank[next] >= currentRank
}

function matchesAssociation(
  incoming: SpaceOrderEvent,
  association: SpaceOrderEventAssociation
): boolean {
  return incoming.spaceOrderId === association.spaceOrderId &&
    incoming.purchaseIntentId === association.purchaseIntentId &&
    incoming.spaceEnterpriseId === association.spaceEnterpriseId &&
    incoming.spaceProductNo === association.spaceProductNo
}
