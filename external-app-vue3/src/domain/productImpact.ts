import type { Entitlement, Order } from '../types/domain'
import type { ImpactSnapshot } from '../types/reverseFlow'

const IN_FLIGHT_ORDER_STATUSES = new Set<string>([
  'pending_payment',
  'paid',
  'pending_redirect',
  'space_processing',
  'purchase_success',
  'callback_delayed',
  'delivering',
])
const IMPACTED_ENTITLEMENT_STATUSES = new Set<string>(['active', 'frozen', 'migrating'])

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
