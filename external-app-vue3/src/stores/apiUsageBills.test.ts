import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedApiUsageBills } from '@/data/trustedSpace'
import type { TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import type { ApiUsageBillMirror } from '@/types/trustedSpace'
import { useApiUsageBillsStore } from './apiUsageBills'
import { useUserStore } from './user'

const appEnterpriseId = 'ent-wanlian-logistics'
const spaceEnterpriseId = 'space-ent-wanlian'
const julyBillId = 'space-bill-wanlian-2026-07'

function adapterWithBills(bills: ApiUsageBillMirror[]): TrustedSpaceAdapter {
  const base = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
  return {
    syncProducts: base.syncProducts.bind(base),
    getProduct: base.getProduct.bind(base),
    ensureEnterpriseBinding: base.ensureEnterpriseBinding.bind(base),
    createPurchaseLink: base.createPurchaseLink.bind(base),
    findOrderByIntent: base.findOrderByIntent.bind(base),
    listUsageBills: async () => structuredClone(bills),
    createBillDownloadLink: base.createBillDownloadLink.bind(base),
    createBillSupportLink: base.createBillSupportLink.bind(base)
  }
}

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

    await expect(store.support(julyBillId, 'mem-1', 'admin', '/app/mine/enterprise/bills/space-bill-wanlian-2026-07')).resolves.toContain(
      'space-bill-wanlian-2026-07/support'
    )
  })

  it('does not expose a billing month with no owned credential lines to a member', async () => {
    const store = useApiUsageBillsStore()
    const memberOneOnlyBill: ApiUsageBillMirror = {
      ...seedApiUsageBills[0],
      spaceBillId: 'space-bill-wanlian-2026-06',
      billingMonth: '2026-06',
      totalCalls: 1120,
      successCalls: 1108,
      totalAmount: 1120,
      lines: [seedApiUsageBills[0].lines[0]]
    }
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapterWithBills([...seedApiUsageBills, memberOneOnlyBill]))

    expect(store.visibleBills('mem-2', 'member').map((bill) => bill.spaceBillId)).toEqual([julyBillId])
    expect(store.billDetail(memberOneOnlyBill.spaceBillId, 'mem-2', 'member')).toBeUndefined()
    await expect(store.support(memberOneOnlyBill.spaceBillId, 'mem-2', 'member', '/app/mine/enterprise/bills/space-bill-wanlian-2026-06')).resolves.toBeUndefined()
  })

  it('clears a prior enterprise snapshot before a failed refresh for another enterprise', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)
    const failingAdapter = adapterWithBills([])
    failingAdapter.listUsageBills = async () => { throw new Error('space unavailable') }

    await expect(store.syncBills('ent-another', 'space-ent-another', failingAdapter)).rejects.toThrow('space unavailable')
    expect(store.rawBills).toEqual([])
    expect(store.visibleBills('mem-1', 'admin')).toEqual([])
    expect(await store.download(julyBillId, 'mem-1', 'admin')).toBeUndefined()
    await expect(store.support(julyBillId, 'mem-1', 'admin', '/app/mine/enterprise/bills/space-bill-wanlian-2026-07')).resolves.toBeUndefined()
  })

  it('records the controlled successful completion time for an empty bill response', async () => {
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapterWithBills([]), () => '2026-07-27T10:05:00.000Z')

    expect(store.rawBills).toEqual([])
    expect(store.lastSuccessAt).toBe('2026-07-27T10:05:00.000Z')
    expect(store.stale).toBe(false)
  })

  it('clears bill snapshots when the user switches enterprise context', async () => {
    const store = useApiUsageBillsStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    user.setEnterpriseContext('ent-another')
    expect(store.rawBills).toEqual([])
    expect(store.billDetail(julyBillId, 'mem-1', 'admin')).toBeUndefined()
  })

  it('does not repopulate cleared bills when an old enterprise sync completes after exit', async () => {
    const store = useApiUsageBillsStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const delayedAdapter = adapterWithBills([])
    let releaseBills: ((bills: ApiUsageBillMirror[]) => void) | undefined
    delayedAdapter.listUsageBills = () => new Promise((resolve) => { releaseBills = resolve })

    const syncing = store.syncBills(appEnterpriseId, spaceEnterpriseId, delayedAdapter)
    user.clearEnterpriseContext()
    releaseBills!([...seedApiUsageBills])
    await syncing

    expect(store.rawBills).toEqual([])
    expect(store.visibleBills('mem-1', 'admin')).toEqual([])
  })
})
