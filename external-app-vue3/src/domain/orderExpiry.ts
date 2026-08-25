import type { Entitlement, Order, Product } from '@/types/domain'
import { resolveMemberBenefits } from '@/domain/memberBenefits'
import { salePeriodMonthsOf } from '@/domain/commerceOffers'

const OPEN_STATUSES = new Set([
  'pending_approval',
  'pending_payment',
  'payment_pending_confirmation',
  'approval_rejected',
  'payment_cancelled',
  'payment_failed'
])

export function addMonthsDate(dateValue: string, months: number): string | undefined {
  const match = dateValue.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const firstOfTargetMonth = new Date(Date.UTC(year, month + months, 1))
  const lastDay = new Date(Date.UTC(
    firstOfTargetMonth.getUTCFullYear(),
    firstOfTargetMonth.getUTCMonth() + 1,
    0
  )).getUTCDate()
  firstOfTargetMonth.setUTCDate(Math.min(day, lastDay))
  return firstOfTargetMonth.toISOString().slice(0, 10)
}

export function isMemberFreeProduct(product?: Pick<Product, 'memberBenefits' | 'memberIncluded' | 'price' | 'acquisitions'>): boolean {
  if (!product) return false
  return resolveMemberBenefits(product).some((item) => item.mode === 'free')
}

function memberExpiryDate(input: {
  ownerId: string
  entitlements: Entitlement[]
  memberExpiresAt?: string
}): string | undefined {
  const memberEnt = input.entitlements.find((item) =>
    item.type === 'member' && item.ownerId === input.ownerId && item.status === 'active'
  )
  return (memberEnt?.validTo || input.memberExpiresAt)?.slice(0, 10)
}

export function orderExpiryText(input: {
  order: Pick<Order, 'id' | 'productId' | 'ownerId' | 'ownerType' | 'status' | 'paidAt' | 'createdAt' | 'activationDate' | 'selectedTermMonths' | 'entitlementId'>
  product?: Product
  entitlements: Entitlement[]
  memberExpiresAt?: string
  enterpriseExpiresAt?: string
}): string {
  const { order, product, entitlements } = input
  if (order.productId === 'membership') {
    return memberExpiryDate({
      ownerId: order.ownerId,
      entitlements,
      memberExpiresAt: input.memberExpiresAt
    }) || '—'
  }

  const entitlement = entitlements.find((item) => item.id === order.entitlementId)
    || entitlements.find((item) => item.orderId === order.id)
  const entitlementEnd = (entitlement?.updateValidTo || entitlement?.validTo)?.slice(0, 10)
  if (entitlementEnd) return entitlementEnd

  if (isMemberFreeProduct(product)) {
    if (order.ownerType === 'enterprise') {
      return input.enterpriseExpiresAt?.slice(0, 10) || '—'
    }
    const memberEnd = memberExpiryDate({
      ownerId: order.ownerId,
      entitlements,
      memberExpiresAt: input.memberExpiresAt
    })
    return memberEnd ? `会员到期 ${memberEnd}` : '—'
  }

  if (OPEN_STATUSES.has(order.status)) return '—'

  const start = order.activationDate || order.paidAt || order.createdAt
  const months = order.selectedTermMonths || (product ? salePeriodMonthsOf(product) : undefined)
  if (start && months) return addMonthsDate(start, months) || '—'
  return '—'
}
