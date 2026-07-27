import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
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
})
