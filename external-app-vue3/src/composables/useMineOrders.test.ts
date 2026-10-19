import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMineOrders } from './useMineOrders'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useUserStore } from '@/stores/user'
import type { Entitlement } from '@/types/domain'

function trustedAuthorization(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: 'ent-source-activity',
    source: 'enterprise',
    type: 'dataset',
    ownerId: 'ent-wanlian-logistics',
    enterpriseId: 'ent-wanlian-logistics',
    productId: 'prod-enterprise-activity',
    orderId: 'space-order-activity-001',
    accessScope: 'named_seats',
    assignedMemberIds: ['mem-2'],
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    updateValidTo: '2026-12-31',
    status: 'active',
    ...overrides
  }
}

function findSourceOrder() {
  return useMineOrders().findOrder('space', 'space-order-activity-001')!
}

describe('useMineOrders trusted dataset delivery access', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T04:00:00Z'))
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    // Switching the enterprise clears mirrors; simulate the subsequent source sync.
    useSpaceOrderStore().$reset()
  })

  afterEach(() => vi.useRealTimers())

  it.each(['published', 'delisted'] as const)('keeps the source order record without a delivery entry after authorization expires on a %s product', (availability) => {
    const product = useCatalogStore().byId('prod-enterprise-activity')!
    product.availability = availability
    product.status = availability
    useEntitlementStore().list.push(trustedAuthorization({
      validTo: '2026-09-30', updateValidTo: '2026-09-30'
    }))

    const card = findSourceOrder()
    expect(card.id).toBe('space-order-activity-001')
    expect(card.status).toBe('delivered')
    expect(card.serviceStatus).toBe('权益已到期')
    expect(card.expiryInfo?.status).toBe('expired')
    expect(card.canUseDataset).toBe(false)
    expect(card.downloadUrl).toBeUndefined()
  })

  it.each(['published', 'delisted'] as const)('preserves a usable source delivery for the current order authorization on a %s product', (availability) => {
    const product = useCatalogStore().byId('prod-enterprise-activity')!
    product.availability = availability
    product.status = availability
    useEntitlementStore().list.push(trustedAuthorization())

    expect(findSourceOrder()).toMatchObject({
      canUseDataset: true,
      downloadUrl: 'https://trusted-space.mock/downloads/space-order-activity-001'
    })
  })

  it.each([
    ['missing', undefined],
    ['another order', { orderId: 'space-order-new-authorization' }],
    ['another product', { productId: 'prod-truck-trajectory' }],
    ['another enterprise owner', { ownerId: 'ent-other' }],
    ['another enterprise', { enterpriseId: 'ent-other' }],
    ['personal', { source: 'personal' }],
    ['membership', { type: 'member' }],
    ['revoked', { status: 'revoked' }],
    ['expired status', { status: 'expired' }],
    ['not started', { validFrom: '2026-10-16' }],
    ['authorization end elapsed', { validTo: '2026-10-14' }],
    ['update authorization end elapsed', { updateValidTo: '2026-10-14' }]
  ] satisfies [string, Partial<Entitlement> | undefined][])('does not expose the source delivery for %s authorization', (_case, overrides) => {
    if (overrides) useEntitlementStore().list.push(trustedAuthorization(overrides))
    expect(findSourceOrder().canUseDataset).toBe(false)
    expect(findSourceOrder().downloadUrl).toBeUndefined()
  })

  it('does not let a newer authorization unlock the expired original order', () => {
    useEntitlementStore().list.push(
      trustedAuthorization({ validTo: '2026-09-30', updateValidTo: '2026-09-30' }),
      trustedAuthorization({ id: 'ent-new-activity', orderId: 'space-order-new-activity' })
    )
    expect(findSourceOrder().canUseDataset).toBe(false)
  })

  it('requires the current member to be covered by the order authorization', () => {
    useUserStore().switchMockEnterpriseMember('mem-2')
    useEntitlementStore().list.push(trustedAuthorization({ assignedMemberIds: ['mem-3'] }))
    expect(findSourceOrder().canUseDataset).toBe(false)

    useEntitlementStore().list.at(-1)!.assignedMemberIds = ['mem-2']
    expect(findSourceOrder().canUseDataset).toBe(true)
  })

  it.each([undefined, '', '   ', 'javascript:alert(1)', 'not-a-url'])('does not expose an unavailable source delivery link: %s', (downloadUrl) => {
    useEntitlementStore().list.push(trustedAuthorization())
    useSpaceOrderStore().byId('space-order-activity-001')!.downloadUrl = downloadUrl
    expect(findSourceOrder().serviceStatus).toBe('权益有效')
    expect(findSourceOrder().deliveryStatus).toBe('交付链接暂不可用')
    expect(findSourceOrder().canUseDataset).toBe(false)
    expect(findSourceOrder().downloadUrl).toBeUndefined()
  })

  it('does not expose source data before delivery even with current authorization', () => {
    useEntitlementStore().list.push(trustedAuthorization())
    useSpaceOrderStore().byId('space-order-activity-001')!.displayStatus = 'delivering'
    expect(findSourceOrder().canUseDataset).toBe(false)
    expect(findSourceOrder().downloadUrl).toBeUndefined()
  })

  it('retains delivered platform snapshots after their update service expires', () => {
    const entitlement = useEntitlementStore().list.find((item) => item.id === 'ent-dataset-enterprise-001')!
    entitlement.status = 'expired'
    entitlement.validTo = '2026-09-30'
    entitlement.updateValidTo = '2026-09-30'

    expect(useMineOrders().findOrder('app', 'order-enterprise-dataset-001')).toMatchObject({
      canUseDataset: true,
      serviceStatus: '服务已到期'
    })
  })
})
