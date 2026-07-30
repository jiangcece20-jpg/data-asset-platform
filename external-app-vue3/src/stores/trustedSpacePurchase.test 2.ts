import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'
import { useUserStore } from './user'

function authenticateAs(memberId = 'mem-1') {
  const user = useUserStore()
  user.context.currentMemberId = memberId
  user.completeEnterpriseAuth()
  return user
}

const purchaseInput = {
  appEnterpriseId: 'ent-wanlian-logistics',
  operatorMemberId: 'mem-1',
  appProductId: 'prod-qualification-api',
  enterpriseAuthStatus: 'authenticated' as const,
  returnUrl: '/app/product/prod-qualification-api'
}

async function prepareReadyPurchase(adapter: MockTrustedSpaceAdapter) {
  authenticateAs()
  const catalog = useTrustedSpaceCatalogStore()
  const purchase = useTrustedSpacePurchaseStore()
  await catalog.syncAll(adapter)
  const intent = await purchase.preparePurchase(purchaseInput, adapter)
  return { catalog, intent, purchase }
}

describe('trustedSpacePurchase store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('creates a purchase intent owned by the enterprise with a separate operator', async () => {
    authenticateAs()
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
    authenticateAs()
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
    authenticateAs()
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
    authenticateAs()
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
    authenticateAs()
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
    await store.createLink(intent.id, adapter, new Date('2026-07-27T10:00:00.000Z'))

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

  it('rejects a forged authenticated input when the current user is not enterprise-authenticated', async () => {
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    await expect(store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)).rejects.toThrow('可信空间购买仅限认证企业')
    expect(store.intents).toEqual([])
  })

  it('rejects a forged operator instead of creating an intent for another member', async () => {
    authenticateAs('mem-1')
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    await expect(store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-2',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)).rejects.toThrow('企业购买上下文不匹配')
    expect(store.intents).toEqual([])
  })

  it('rejects a cross-enterprise input even when its adapter binding is active', async () => {
    authenticateAs('mem-1')
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    adapter.ensureEnterpriseBinding = async () => ({
      appEnterpriseId: 'ent-another-enterprise',
      spaceEnterpriseId: 'space-ent-another',
      status: 'active'
    })
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    await expect(store.preparePurchase({
      appEnterpriseId: 'ent-another-enterprise',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)).rejects.toThrow('企业购买上下文不匹配')
    expect(store.intents).toEqual([])
  })

  it('rejects a purchase when the current enterprise member is inactive', async () => {
    const user = authenticateAs('mem-2')
    user.enterprise.members.find((member) => member.id === 'mem-2')!.status = 'revoked'
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    await expect(store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-2',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)).rejects.toThrow('当前企业经办人无效')
    expect(store.intents).toEqual([])
  })

  it('discards a late enterprise binding after the user exits the enterprise context', async () => {
    const user = authenticateAs()
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    let releaseBinding: ((binding: Awaited<ReturnType<typeof adapter.ensureEnterpriseBinding>>) => void) | undefined
    adapter.ensureEnterpriseBinding = () => new Promise((resolve) => { releaseBinding = resolve })
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    const pending = store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)
    await Promise.resolve()
    user.clearEnterpriseContext()
    releaseBinding!({
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      status: 'active'
    })

    await expect(pending).rejects.toThrow('企业购买上下文已失效')
    expect(store.bindings).toEqual([])
    expect(store.intents).toEqual([])
  })

  it('discards a late enterprise binding after the operator is revoked', async () => {
    const user = authenticateAs('mem-2')
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    let releaseBinding: ((binding: Awaited<ReturnType<typeof adapter.ensureEnterpriseBinding>>) => void) | undefined
    adapter.ensureEnterpriseBinding = () => new Promise((resolve) => { releaseBinding = resolve })
    await useTrustedSpaceCatalogStore().syncAll(adapter)

    const pending = store.preparePurchase({
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-2',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated',
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)
    await Promise.resolve()
    user.revokeSeat('mem-2')
    releaseBinding!({
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      status: 'active'
    })

    await expect(pending).rejects.toThrow('企业购买上下文已失效')
    expect(store.bindings).toEqual([])
    expect(store.intents).toEqual([])
  })

  it('discards a late purchase link after enterprise exit without mutating the old intent', async () => {
    const user = authenticateAs()
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
    let releaseLink: ((link: { url: string; expiresAt: string }) => void) | undefined
    adapter.createPurchaseLink = () => new Promise((resolve) => { releaseLink = resolve })

    const pending = store.createLink(intent.id, adapter, new Date('2026-07-27T10:00:00.000Z'))
    await Promise.resolve()
    user.clearEnterpriseContext()
    releaseLink!({
      url: 'https://trusted-space.mock/purchase?token=late',
      expiresAt: '2026-07-27T10:05:00.000Z'
    })

    await expect(pending).rejects.toThrow('企业购买上下文已失效')
    expect(intent.purchaseUrl).toBeUndefined()
    expect(store.intents).toEqual([])
  })

  it('does not write a link that completes after the intent expires', async () => {
    authenticateAs()
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
    let clock = new Date('2026-07-27T10:00:00.000Z')
    let releaseLink: ((link: { url: string; expiresAt: string }) => void) | undefined
    adapter.createPurchaseLink = () => new Promise((resolve) => { releaseLink = resolve })

    const pending = store.createLink(intent.id, adapter, () => clock)
    await Promise.resolve()
    clock = new Date('2026-07-27T10:30:00.000Z')
    releaseLink!({
      url: 'https://trusted-space.mock/purchase?token=late-expired-intent',
      expiresAt: '2026-07-27T10:35:00.000Z'
    })

    await expect(pending).rejects.toThrow('购买意图已过期')
    expect(intent.status).toBe('expired')
    expect(intent.purchaseUrl).toBeUndefined()
  })

  it('does not let an older link response overwrite a newer reconnect result', async () => {
    authenticateAs()
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
    let releaseOldLink: ((link: { url: string; expiresAt: string }) => void) | undefined
    let requestCount = 0
    adapter.createPurchaseLink = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Promise((resolve) => { releaseOldLink = resolve })
      }
      return {
        url: 'https://trusted-space.mock/purchase?token=newer',
        expiresAt: '2026-07-27T10:06:00.000Z'
      }
    }

    const older = store.createLink(intent.id, adapter)
    await Promise.resolve()
    await expect(store.createLink(intent.id, adapter)).resolves.toContain('token=newer')
    releaseOldLink!({
      url: 'https://trusted-space.mock/purchase?token=older',
      expiresAt: '2026-07-27T10:05:00.000Z'
    })

    await expect(older).rejects.toThrow('购买链接请求已失效')
    expect(intent.purchaseUrl).toContain('token=newer')
    expect(intent.purchaseLinkExpiresAt).toBe('2026-07-27T10:06:00.000Z')
  })

  it('refuses to create a link after the cached binding no longer matches the intent', async () => {
    authenticateAs()
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
    store.bindings[0].spaceEnterpriseId = 'space-ent-another'

    await expect(store.createLink(intent.id, adapter)).rejects.toThrow('企业购买上下文已失效')
    expect(intent.purchaseUrl).toBeUndefined()
  })

  it('invalidates intents and links when the enterprise changes or the current member is revoked', async () => {
    const user = authenticateAs('mem-2')
    const store = useTrustedSpacePurchaseStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await useTrustedSpaceCatalogStore().syncAll(adapter)
    const input = {
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-2',
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: 'authenticated' as const,
      returnUrl: '/app/product/prod-qualification-api'
    }
    const first = await store.preparePurchase(input, adapter)
    await store.createLink(first.id, adapter)

    user.revokeSeat('mem-2')
    expect(store.intents).toEqual([])
    expect(store.bindings).toEqual([])

    user.enterprise.members.find((member) => member.id === 'mem-2')!.status = 'active'
    user.enterprise.members.find((member) => member.id === 'mem-2')!.seatAssigned = true
    user.completeEnterpriseAuth()
    await store.preparePurchase(input, adapter)
    user.setEnterpriseContext('ent-another-enterprise')
    expect(store.intents).toEqual([])
    expect(store.bindings).toEqual([])
  })

  it('invalidates the purchase generation when enterprise context is explicitly reset to the same enterprise', async () => {
    const user = authenticateAs()
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
    await store.createLink(intent.id, adapter)
    const generation = store.authorizationGeneration

    user.setEnterpriseContext('ent-wanlian-logistics')

    expect(store.authorizationGeneration).toBeGreaterThan(generation)
    expect(store.intents).toEqual([])
    expect(store.bindings).toEqual([])
  })

  it('does not redirect with an expired short link', async () => {
    authenticateAs()
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
    await store.createLink(intent.id, adapter)

    store.markRedirected(intent.id, new Date('2026-07-27T10:05:00.000Z'))

    expect(intent.status).toBe('ready')
  })

  it('does not advance an old-enterprise intent after the user switches context', async () => {
    const user = authenticateAs()
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
    await store.createLink(intent.id, adapter)
    store.markRedirected(intent.id)
    user.setEnterpriseContext('ent-another-enterprise')
    store.intents = [intent]

    store.markReturned(intent.id)

    expect(intent.status).toBe('redirected')
  })

  it.each([
    ['paused', { saleStatus: 'paused' as const }, '可信空间商品暂不可购买'],
    ['delisted', { saleStatus: 'delisted' as const }, '可信空间商品暂不可购买'],
    ['unknown', { saleStatus: 'unknown' as const }, '可信空间商品暂不可购买'],
    ['sync failed', { syncState: 'sync_failed' as const }, '可信空间商品信息同步中'],
    ['stale', { syncedAt: '2026-07-27T09:00:00.000Z' }, '可信空间商品信息同步中']
  ])('rejects link creation when the prepared product becomes %s', async (_case, mutation, reason) => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { catalog, intent, purchase } = await prepareReadyPurchase(adapter)
    intent.purchaseUrl = 'https://trusted-space.mock/purchase/old'
    intent.purchaseLinkExpiresAt = '2026-07-27T10:05:00.000Z'
    Object.assign(catalog.byProductId(intent.appProductId)!, mutation)

    await expect(purchase.createLink(intent.id, adapter)).rejects.toThrow(reason)

    expect(intent.status).toBe('failed')
    expect(intent.purchaseUrl).toBeUndefined()
    expect(intent.purchaseLinkExpiresAt).toBeUndefined()
    expect(intent.failureReason).toBe(reason)
  })

  it.each([
    [
      'unbound',
      { appEnterpriseId: 'ent-wanlian-logistics', status: 'unbound' as const },
      '企业尚未完成可信空间绑定'
    ],
    [
      'rebound',
      {
        appEnterpriseId: 'ent-wanlian-logistics',
        spaceEnterpriseId: 'space-ent-rebound',
        status: 'active' as const
      },
      '可信空间企业绑定已变化'
    ]
  ])('revalidates an authoritative %s binding before rebuilding a link', async (_case, binding, reason) => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { intent, purchase } = await prepareReadyPurchase(adapter)
    intent.purchaseUrl = 'https://trusted-space.mock/purchase/old'
    intent.purchaseLinkExpiresAt = '2026-07-27T10:05:00.000Z'
    adapter.ensureEnterpriseBinding = async () => binding

    await expect(purchase.createLink(intent.id, adapter)).rejects.toThrow(reason)

    expect(intent.status).toBe('failed')
    expect(intent.purchaseUrl).toBeUndefined()
    expect(intent.purchaseLinkExpiresAt).toBeUndefined()
    expect(intent.failureReason).toBe(reason)
  })

  it.each([
    ['number', { spaceProductNo: 'SPACE-API-CHANGED' }, '可信空间商品映射已变化'],
    ['version', { version: 13 }, '可信空间商品版本已变化']
  ])('rejects a link when the trusted product %s changes after intent creation', async (_case, mutation, reason) => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { catalog, intent, purchase } = await prepareReadyPurchase(adapter)
    Object.assign(catalog.byProductId(intent.appProductId)!, mutation)

    await expect(purchase.createLink(intent.id, adapter)).rejects.toThrow(reason)

    expect(intent.status).toBe('failed')
    expect(intent.failureReason).toBe(reason)
  })

  it('discards a purchase-link response when the catalog becomes paused while the request is pending', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { catalog, intent, purchase } = await prepareReadyPurchase(adapter)
    let releaseLink!: (value: { url: string; expiresAt: string }) => void
    adapter.createPurchaseLink = () => new Promise((resolve) => {
      releaseLink = resolve
    })

    const pending = purchase.createLink(intent.id, adapter)
    await vi.waitFor(() => expect(releaseLink).toBeTypeOf('function'))
    catalog.byProductId(intent.appProductId)!.saleStatus = 'paused'
    releaseLink({
      url: 'https://trusted-space.mock/purchase/late',
      expiresAt: '2026-07-27T10:05:00.000Z'
    })

    await expect(pending).rejects.toThrow('可信空间商品暂不可购买')
    expect(intent.status).toBe('failed')
    expect(intent.purchaseUrl).toBeUndefined()
    expect(intent.purchaseLinkExpiresAt).toBeUndefined()
  })

  it('discards a purchase-link response when the authoritative binding changes while the request is pending', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { intent, purchase } = await prepareReadyPurchase(adapter)
    let bindingChecks = 0
    adapter.ensureEnterpriseBinding = async () => {
      bindingChecks += 1
      return bindingChecks === 1
        ? {
            appEnterpriseId: 'ent-wanlian-logistics',
            spaceEnterpriseId: 'space-ent-wanlian',
            status: 'active'
          }
        : {
            appEnterpriseId: 'ent-wanlian-logistics',
            spaceEnterpriseId: 'space-ent-rebound',
            status: 'active'
          }
    }

    await expect(purchase.createLink(intent.id, adapter)).rejects.toThrow('可信空间企业绑定已变化')

    expect(bindingChecks).toBe(2)
    expect(intent.status).toBe('failed')
    expect(intent.purchaseUrl).toBeUndefined()
  })

  it('recovers a failed intent after product and binding facts are fresh, published, and active again', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { catalog, intent, purchase } = await prepareReadyPurchase(adapter)
    const snapshot = catalog.byProductId(intent.appProductId)!
    snapshot.saleStatus = 'paused'

    await expect(purchase.createLink(intent.id, adapter)).rejects.toThrow('可信空间商品暂不可购买')

    snapshot.saleStatus = 'published'
    snapshot.syncState = 'current'
    snapshot.syncedAt = '2026-07-27T10:00:00.000Z'
    const url = await purchase.createLink(intent.id, adapter)

    expect(url).toContain('https://trusted-space.mock/purchase?')
    expect(intent.status).toBe('ready')
    expect(intent.failureReason).toBeUndefined()
  })

  it('recovers the same failed intent after its authoritative binding becomes active again', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { intent, purchase } = await prepareReadyPurchase(adapter)
    let bindingStatus: 'unbound' | 'active' = 'unbound'
    let bindingChecks = 0
    adapter.ensureEnterpriseBinding = async () => {
      bindingChecks += 1
      return {
        appEnterpriseId: 'ent-wanlian-logistics',
        spaceEnterpriseId: bindingStatus === 'active' ? 'space-ent-wanlian' : undefined,
        status: bindingStatus
      }
    }

    await expect(purchase.createLink(intent.id, adapter)).rejects.toThrow('企业尚未完成可信空间绑定')

    bindingStatus = 'active'
    await expect(purchase.createLink(intent.id, adapter)).resolves.toContain('https://trusted-space.mock/purchase?')
    expect(bindingChecks).toBe(3)
    expect(intent.status).toBe('ready')
    expect(intent.failureReason).toBeUndefined()
  })

  it('immediately hides an old link and refuses redirect after the latest product facts become invalid', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { catalog, intent, purchase } = await prepareReadyPurchase(adapter)
    await purchase.createLink(intent.id, adapter)
    catalog.byProductId(intent.appProductId)!.saleStatus = 'paused'

    purchase.markRedirected(intent.id, new Date('2026-07-27T10:01:00.000Z'))
    expect(purchase.hasActivePurchaseLink(intent.id, new Date('2026-07-27T10:01:00.000Z'))).toBe(false)

    expect(intent.status).toBe('failed')
    expect(intent.purchaseUrl).toBeUndefined()
    expect(intent.purchaseLinkExpiresAt).toBeUndefined()
    expect(intent.failureReason).toBe('可信空间商品暂不可购买')
  })

  it('does not mark a returned purchase when its cached binding is no longer active', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { intent, purchase } = await prepareReadyPurchase(adapter)
    await purchase.createLink(intent.id, adapter)
    purchase.markRedirected(intent.id, new Date('2026-07-27T10:01:00.000Z'))
    purchase.bindingForEnterprise(intent.appEnterpriseId)!.status = 'unbound'

    purchase.markReturned(intent.id, new Date('2026-07-27T10:01:00.000Z'))

    expect(intent.status).toBe('redirected')
    expect(intent.returnedAt).toBeUndefined()
    expect(intent.failureReason).toBe('企业尚未完成可信空间绑定')
  })

  it('does not mark a returned purchase after its product is no longer for sale', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const { catalog, intent, purchase } = await prepareReadyPurchase(adapter)
    await purchase.createLink(intent.id, adapter)
    purchase.markRedirected(intent.id, new Date('2026-07-27T10:01:00.000Z'))
    catalog.byProductId(intent.appProductId)!.saleStatus = 'delisted'

    purchase.markReturned(intent.id, new Date('2026-07-27T10:01:00.000Z'))

    expect(intent.status).toBe('redirected')
    expect(intent.returnedAt).toBeUndefined()
    expect(intent.failureReason).toBe('可信空间商品暂不可购买')
  })
})
