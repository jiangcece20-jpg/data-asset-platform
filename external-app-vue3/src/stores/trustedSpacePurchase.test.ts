import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'

describe('trustedSpacePurchase store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('creates a purchase intent owned by the enterprise with a separate operator', async () => {
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    const intent = await store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)

    expect(intent.appEnterpriseId).toBe('ent-wanlian-logistics')
    expect(intent.operatorMemberId).toBe('mem-1')
    expect(intent.status).toBe('ready')
    expect(intent.spaceEnterpriseId).toBe('space-ent-wanlian')
    expect(intent.expiresAt).toBe('2026-07-27T10:30:00.000Z')
  })

  it('rejects a personal-only context before creating an intent', async () => {
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')

    await expect(store.preparePurchase({
      appEnterpriseId: '',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'none',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)).rejects.toThrow('可信空间购买仅限认证企业')
  })

  it('rejects an active binding that belongs to a different enterprise without caching or creating an intent', async () => {
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.ensureEnterpriseBinding = async () => ({
      appEnterpriseId: 'ent-another-enterprise',
      spaceEnterpriseId: 'space-ent-another',
      status: 'active'
    })
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    await expect(store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)).rejects.toThrow('企业尚未完成可信空间绑定')

    expect(store.intents).toHaveLength(0)
    expect(store.bindingForEnterprise('ent-wanlian-logistics')).toBeUndefined()
  })

  it('keeps a failed intent for retry and persists the replacement short-link expiry', async () => {
    let clock = '2026-07-27T10:00:00.000Z'
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => clock)
    let linkAttempts = 0
    adapter.createPurchaseLink = async () => {
      linkAttempts += 1
      if (linkAttempts === 1) throw new Error('空间 SSO 暂不可用')
      return { url: 'https://trusted-space.mock/purchase/retry', expiresAt: '2026-07-27T10:11:00.000Z' }
    }
    await useTrustedSpaceCatalogStore().syncAll(adapter)
    const intent = await store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)

    await expect(store.createLink(intent.id, adapter, new Date(clock))).rejects.toThrow('空间 SSO 暂不可用')
    expect(intent.status).toBe('failed')
    expect(intent.failureReason).toBe('空间 SSO 暂不可用')
    expect(intent.purchaseUrl).toBeUndefined()

    clock = '2026-07-27T10:06:00.000Z'
    await expect(store.createLink(intent.id, adapter, new Date(clock))).resolves.toBe('https://trusted-space.mock/purchase/retry')
    expect(intent.id).toBe(store.intents[0].id)
    expect(intent.status).toBe('ready')
    expect(intent.purchaseLinkExpiresAt).toBe('2026-07-27T10:11:00.000Z')
  })

  it('expires a five-minute link independently and expires the intent after thirty minutes', async () => {
    let clock = '2026-07-27T10:00:00.000Z'
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => clock)
    await useTrustedSpaceCatalogStore().syncAll(adapter)
    const intent = await store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)
    await store.createLink(intent.id, adapter, new Date(clock))

    expect(store.hasActivePurchaseLink(intent.id, new Date('2026-07-27T10:04:59.000Z'))).toBe(true)
    expect(store.hasActivePurchaseLink(intent.id, new Date('2026-07-27T10:05:00.000Z'))).toBe(false)
    expect(intent.status).toBe('ready')

    clock = '2026-07-27T10:06:00.000Z'
    await store.createLink(intent.id, adapter, new Date(clock))
    expect(intent.purchaseLinkExpiresAt).toBe('2026-07-27T10:11:00.000Z')

    await expect(store.createLink(intent.id, adapter, new Date('2026-07-27T10:30:00.000Z'))).rejects.toThrow('购买意图已过期')
    expect(intent.status).toBe('expired')
  })

  it('only advances redirected intents to returned-pending-sync and writes no local order or entitlement', async () => {
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await useTrustedSpaceCatalogStore().syncAll(adapter)
    const intent = await store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)
    const orderCount = useOrderStore().list.length
    const entitlementCount = useEntitlementStore().list.length

    store.markReturned(intent.id)
    expect(intent.status).toBe('ready')
    store.markRedirected(intent.id)
    store.markReturned(intent.id)
    store.markRedirected(intent.id)
    store.markReturned(intent.id)

    expect(intent.status).toBe('returned_pending_sync')
    expect(useOrderStore().list).toHaveLength(orderCount)
    expect(useEntitlementStore().list).toHaveLength(entitlementCount)
  })
})
