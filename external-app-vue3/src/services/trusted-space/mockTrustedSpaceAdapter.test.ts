import { describe, expect, it } from 'vitest'
import { MockTrustedSpaceAdapter } from './mockTrustedSpaceAdapter'

describe('MockTrustedSpaceAdapter', () => {
  it('syncs versioned trusted products', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const result = await adapter.syncProducts()

    expect(result.items.every((item) => item.syncState === 'current')).toBe(true)
    expect(result.items[0].version).toBeGreaterThan(0)
  })

  it('stamps product receipt time from the injected clock without changing the space update time', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T11:00:00.000Z')
    const [snapshot] = (await adapter.syncProducts()).items

    expect(snapshot.syncedAt).toBe('2026-07-27T11:00:00.000Z')
    expect(snapshot.spaceUpdatedAt).toBe('2026-07-27T09:45:00.000Z')
    expect((await adapter.getProduct(snapshot.spaceProductNo))?.syncedAt).toBe('2026-07-27T11:00:00.000Z')
  })

  it('binds an app enterprise and creates a short-lived product link', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const binding = await adapter.ensureEnterpriseBinding('ent-wanlian-logistics')
    const link = await adapter.createPurchaseLink({
      intentId: 'intent-1',
      spaceEnterpriseId: binding.spaceEnterpriseId!,
      operatorMemberId: 'mem-1',
      spaceProductNo: 'SPACE-API-20415',
      returnUrl: '/app/product/prod-qualification-api'
    })

    expect(link.url).toContain('intent=intent-1')
    expect(link.expiresAt).toBe('2026-07-27T10:05:00.000Z')
  })

  it('returns bills and separate download/support links', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const bills = await adapter.listUsageBills('space-ent-wanlian')

    expect(bills[0].lines.length).toBeGreaterThan(0)
    expect(await adapter.createBillSupportLink(bills[0].spaceBillId, '/app/mine/enterprise/bills')).toContain('support')
  })
})
