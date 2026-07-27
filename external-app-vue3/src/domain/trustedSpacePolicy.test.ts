import { describe, expect, it } from 'vitest'
import { evaluateTrustedPurchase, mapSpaceOrderStatus, canApplySpaceOrderEvent } from './trustedSpacePolicy'
import type { SpaceOrderEvent, SpaceOrderMirror, TrustedProductSnapshot } from '@/types/trustedSpace'

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

  it('does not apply a duplicate or older order event', () => {
    const current = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 5,
      displayStatus: 'delivered'
    } as SpaceOrderMirror
    const incoming = { spaceOrderId: 'sp-order-1', eventVersion: 5 } as SpaceOrderEvent
    expect(canApplySpaceOrderEvent(current, incoming)).toBe(false)
  })

  it('does not regress a terminal order even when the incoming version is higher', () => {
    const current = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 5,
      displayStatus: 'delivered'
    } as SpaceOrderMirror
    const incoming = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 6,
      rawStatus: 'PAID'
    } as SpaceOrderEvent
    expect(canApplySpaceOrderEvent(current, incoming)).toBe(false)
  })

  it('does not regress a non-terminal order to an earlier known status', () => {
    const current = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 5,
      displayStatus: 'delivering'
    } as SpaceOrderMirror
    const incoming = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 6,
      rawStatus: 'PAID'
    } as SpaceOrderEvent
    expect(canApplySpaceOrderEvent(current, incoming)).toBe(false)
  })

  it('maps an unknown space status to unknown_processing', () => {
    expect(mapSpaceOrderStatus('SPACE_NEW_STATUS')).toBe('unknown_processing')
  })
})
