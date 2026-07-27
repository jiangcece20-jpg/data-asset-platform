import { describe, expect, it } from 'vitest'
import { evaluateTrustedPurchase, mapSpaceOrderStatus, canApplySpaceOrderEvent } from './trustedSpacePolicy'
import type { SpaceOrderEvent, SpaceOrderMirror, TrustedProductSnapshot } from '@/types/trustedSpace'
import { statusMeta } from '@/utils/statusMeta'

const snapshot = (over: Partial<TrustedProductSnapshot> = {}): TrustedProductSnapshot => ({
  appProductId: 'prod-api',
  spaceProductId: 'sp-prod-api',
  spaceProductNo: 'SPACE-API-1',
  name: '资格核验 API',
  type: 'api',
  provider: '可信空间',
  saleStatus: 'published',
  price: { model: 'quote', unit: '次' },
  currency: 'CNY',
  version: 3,
  spaceUpdatedAt: '2026-07-27T09:00:00.000Z',
  syncedAt: '2026-07-27T09:05:00.000Z',
  syncState: 'current',
  ...over
})

describe('trustedSpacePolicy', () => {
  it('requires authenticated enterprise and an active space binding', () => {
    expect(evaluateTrustedPurchase({
      enterpriseAuthStatus: 'none',
      bindingStatus: 'unbound',
      snapshot: snapshot(),
      now: '2026-07-27T09:10:00.000Z',
      maxAgeMs: 30 * 60 * 1000
    })).toEqual({ allowed: false, reason: 'enterprise_required' })
  })

  it('blocks a stale product snapshot', () => {
    expect(evaluateTrustedPurchase({
      enterpriseAuthStatus: 'authenticated',
      bindingStatus: 'active',
      snapshot: snapshot({ syncedAt: '2026-07-27T08:00:00.000Z' }),
      now: '2026-07-27T09:10:00.000Z',
      maxAgeMs: 30 * 60 * 1000
    })).toEqual({ allowed: false, reason: 'product_stale' })
  })

  it('blocks a product snapshot with a future sync time', () => {
    expect(evaluateTrustedPurchase({
      enterpriseAuthStatus: 'authenticated',
      bindingStatus: 'active',
      snapshot: snapshot({ syncedAt: '2026-07-27T10:00:00.000Z' }),
      now: '2026-07-27T09:10:00.000Z',
      maxAgeMs: 30 * 60 * 1000
    })).toEqual({ allowed: false, reason: 'product_stale' })
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('blocks an invalid max age of %s', (maxAgeMs) => {
    expect(evaluateTrustedPurchase({
      enterpriseAuthStatus: 'authenticated',
      bindingStatus: 'active',
      snapshot: snapshot(),
      now: '2026-07-27T09:10:00.000Z',
      maxAgeMs
    })).toEqual({ allowed: false, reason: 'product_stale' })
  })

  const expectedAssociation = {
    spaceOrderId: 'sp-order-1',
    purchaseIntentId: 'intent-1',
    spaceEnterpriseId: 'space-enterprise-1',
    spaceProductNo: 'SPACE-API-1'
  }

  const orderEvent = (over: Partial<SpaceOrderEvent> = {}): SpaceOrderEvent => ({
    eventId: 'event-1',
    idempotencyKey: 'event-key-1',
    eventVersion: 6,
    signatureValid: true,
    rawStatus: 'DELIVERING',
    amount: 100,
    currency: 'CNY',
    occurredAt: '2026-07-27T09:10:00.000Z',
    ...expectedAssociation,
    ...over
  })

  const orderMirror = (over: Partial<SpaceOrderMirror> = {}): SpaceOrderMirror => ({
    ...expectedAssociation,
    appEnterpriseId: 'app-enterprise-1',
    operatorMemberId: 'operator-1',
    appProductId: 'prod-api',
    productName: '资格核验 API',
    rawStatus: 'PAID',
    displayStatus: 'paid',
    amount: 100,
    currency: 'CNY',
    eventVersion: 5,
    spaceUpdatedAt: '2026-07-27T09:05:00.000Z',
    syncedAt: '2026-07-27T09:06:00.000Z',
    ...over
  })

  it('rejects an event with an invalid signature before any order update', () => {
    expect(canApplySpaceOrderEvent(undefined, orderEvent({ signatureValid: false }), expectedAssociation)).toBe(false)
  })

  it('rejects a first event without an expected verified association', () => {
    expect(canApplySpaceOrderEvent(undefined, orderEvent())).toBe(false)
  })

  it('allows a first event that matches its expected verified association', () => {
    expect(canApplySpaceOrderEvent(undefined, orderEvent(), expectedAssociation)).toBe(true)
  })

  it.each(['spaceOrderId', 'purchaseIntentId', 'spaceEnterpriseId', 'spaceProductNo'] as const)(
    'rejects an event whose %s does not match the expected association',
    (field) => {
      expect(canApplySpaceOrderEvent(
        undefined,
        orderEvent({ [field]: `other-${field}` }),
        expectedAssociation
      )).toBe(false)
    }
  )

  it.each(['spaceOrderId', 'purchaseIntentId', 'spaceEnterpriseId', 'spaceProductNo'] as const)(
    'rejects an event whose %s does not match the current mirror',
    (field) => {
      expect(canApplySpaceOrderEvent(
        orderMirror({ [field]: `other-${field}` }),
        orderEvent(),
        expectedAssociation
      )).toBe(false)
    }
  )

  it('does not apply a duplicate or older order event', () => {
    expect(canApplySpaceOrderEvent(
      orderMirror({ displayStatus: 'delivered' }),
      orderEvent({ eventVersion: 5 }),
      expectedAssociation
    )).toBe(false)
  })

  it('does not regress a terminal order even when the incoming version is higher', () => {
    expect(canApplySpaceOrderEvent(
      orderMirror({ displayStatus: 'delivered' }),
      orderEvent({ rawStatus: 'PAID' }),
      expectedAssociation
    )).toBe(false)
  })

  it('does not regress a non-terminal order to an earlier known status', () => {
    expect(canApplySpaceOrderEvent(
      orderMirror({ displayStatus: 'delivering' }),
      orderEvent({ rawStatus: 'PAID' }),
      expectedAssociation
    )).toBe(false)
  })

  it('maps an unknown space status to unknown_processing', () => {
    expect(mapSpaceOrderStatus('SPACE_NEW_STATUS')).toBe('unknown_processing')
  })

  it.each([
    ['pending_redirect', '待跳转'],
    ['space_processing', '空间处理中'],
    ['purchase_success', '购买成功'],
    ['callback_delayed', '状态同步中'],
    ['accepted', '已受理'],
    ['unknown_processing', '处理中']
  ])('displays the %s space order status with a business label', (status, label) => {
    expect(statusMeta('spaceOrder', status).label).toBe(label)
  })
})
