import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useApiUsageBillsStore } from './apiUsageBills'

const appEnterpriseId = 'ent-wanlian-logistics'
const spaceEnterpriseId = 'space-ent-wanlian'
const julyBillId = 'space-bill-wanlian-2026-07'

describe('API usage bill store', () => {
  const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')

  beforeEach(() => setActivePinia(createPinia()))

  it('shows the authoritative enterprise total and all credential lines to an admin', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const bill = store.billDetail(julyBillId, 'mem-1', 'admin')!
    expect(bill.totalAmount).toBe(1840)
    expect(bill.visibleCalls).toBe(1840)
    expect(bill.lines).toHaveLength(2)
  })

  it('limits a member to owned credential lines and never exposes the enterprise total', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const bill = store.billDetail(julyBillId, 'mem-2', 'member')!
    expect(bill.totalAmount).toBeUndefined()
    expect(bill.visibleCalls).toBe(720)
    expect(bill.lines).toEqual([expect.objectContaining({ ownerMemberId: 'mem-2', calls: 720 })])
  })

  it('retains the last successful bill snapshot and marks it stale when a refresh fails', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)
    const failingAdapter: TrustedSpaceAdapter = {
      ...adapter,
      listUsageBills: async () => { throw new Error('space unavailable') }
    }

    await expect(store.syncBills(appEnterpriseId, spaceEnterpriseId, failingAdapter)).rejects.toThrow('space unavailable')
    expect(store.rawBills[0].totalAmount).toBe(1840)
    expect(store.stale).toBe(true)
  })

  it('does not expose a full enterprise statement download to a member', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    expect(await store.download(julyBillId, 'mem-2', 'member')).toBeUndefined()
  })

  it('creates a trusted-space support deep link for a bill without storing a local dispute', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    await expect(store.support(julyBillId, '/app/mine/enterprise/bills/space-bill-wanlian-2026-07')).resolves.toContain(
      'space-bill-wanlian-2026-07/support'
    )
  })
})
