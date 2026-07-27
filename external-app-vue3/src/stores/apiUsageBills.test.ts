import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedApiUsageBills } from '@/data/trustedSpace'
import type {
  BillSupportLinkInput,
  BillSupportLinkResult,
  TrustedSpaceAdapter
} from '@/services/trusted-space/TrustedSpaceAdapter'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import type { ApiUsageBillMirror } from '@/types/trustedSpace'
import { useApiUsageBillsStore } from './apiUsageBills'
import { useUserStore } from './user'

const appEnterpriseId = 'ent-wanlian-logistics'
const spaceEnterpriseId = 'space-ent-wanlian'
const julyBillId = 'space-bill-wanlian-2026-07'
const returnUrl = '/app/mine/enterprise/bills/space-bill-wanlian-2026-07'

function adapterWithBills(
  bills: ApiUsageBillMirror[],
  now: () => string = () => '2026-07-27T10:00:00.000Z'
): TrustedSpaceAdapter {
  const base = new MockTrustedSpaceAdapter(now)
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

function authenticateAs(memberId: string) {
  const user = useUserStore()
  user.completeEnterpriseAuth()
  user.context.currentMemberId = memberId
  return user
}

function memberOneOnlyBill(): ApiUsageBillMirror {
  return {
    ...seedApiUsageBills[0],
    spaceBillId: 'space-bill-wanlian-2026-06',
    billingMonth: '2026-06',
    totalCalls: 1120,
    successCalls: 1108,
    totalAmount: 1120,
    lines: [seedApiUsageBills[0].lines[0]]
  }
}

describe('API usage bill authorization and short links', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rejects an unauthenticated direct sync and exposes no bill through forged selector arguments', async () => {
    const store = useApiUsageBillsStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')

    await expect(store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)).rejects.toThrow('当前企业账单不可访问')
    expect((store.visibleBills as unknown as (...args: string[]) => unknown[])('mem-1', 'admin')).toEqual([])
    expect((store.billDetail as unknown as (...args: string[]) => unknown)(julyBillId, 'mem-1', 'admin')).toBeUndefined()
  })

  it('derives an admin view from the active current member and allows the current enterprise download', async () => {
    authenticateAs('mem-1')
    const store = useApiUsageBillsStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const bill = store.billDetail(julyBillId)!
    expect(bill.totalAmount).toBe(1840)
    expect(bill.visibleCalls).toBe(1840)
    expect(bill.lines).toHaveLength(2)
    await expect(store.download(julyBillId, adapter)).resolves.toContain('/download')
  })

  it('ignores forged admin arguments and limits mem-2 to the real member role and owned credential line', async () => {
    const user = authenticateAs('mem-2')
    user.context.role = 'admin'
    const store = useApiUsageBillsStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const forgedVisible = (store.visibleBills as unknown as (...args: string[]) => ReturnType<typeof store.visibleBills>)('mem-2', 'admin')
    const forgedDetail = (store.billDetail as unknown as (...args: string[]) => ReturnType<typeof store.billDetail>)(julyBillId, 'mem-2', 'admin')!
    expect(forgedVisible).toHaveLength(1)
    expect(forgedDetail.totalAmount).toBeUndefined()
    expect(forgedDetail.lines).toEqual([expect.objectContaining({ ownerMemberId: 'mem-2', calls: 720 })])
    await expect((store.download as unknown as (...args: unknown[]) => Promise<string | undefined>)(julyBillId, 'mem-2', 'admin', adapter)).resolves.toBeUndefined()
  })

  it('rejects a cross-enterprise sync and a mismatched active space binding', async () => {
    authenticateAs('mem-1')
    const store = useApiUsageBillsStore()
    const adapter = adapterWithBills(seedApiUsageBills)

    await expect(store.syncBills('ent-another', 'space-ent-another', adapter)).rejects.toThrow('当前企业账单不可访问')

    adapter.ensureEnterpriseBinding = async () => ({
      appEnterpriseId,
      spaceEnterpriseId: 'space-ent-another',
      status: 'active'
    })
    await expect(store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)).rejects.toThrow('可信空间企业绑定不匹配')
    expect(store.rawBills).toEqual([])
  })

  it('retains only the same enterprise successful snapshot when its refresh fails', async () => {
    authenticateAs('mem-1')
    const store = useApiUsageBillsStore()
    const adapter = adapterWithBills(seedApiUsageBills)
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)
    adapter.listUsageBills = async () => { throw new Error('space unavailable') }

    await expect(store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)).rejects.toThrow('space unavailable')
    expect(store.rawBills[0].totalAmount).toBe(1840)
    expect(store.stale).toBe(true)
  })

  it('records a controlled successful completion time for an empty response', async () => {
    authenticateAs('mem-1')
    const store = useApiUsageBillsStore()
    await store.syncBills(
      appEnterpriseId,
      spaceEnterpriseId,
      adapterWithBills([]),
      () => '2026-07-27T10:05:00.000Z'
    )

    expect(store.rawBills).toEqual([])
    expect(store.lastSuccessAt).toBe('2026-07-27T10:05:00.000Z')
  })

  it('does not expose a billing month or support link when the member owns no line', async () => {
    authenticateAs('mem-2')
    const store = useApiUsageBillsStore()
    const hiddenBill = memberOneOnlyBill()
    await store.syncBills(
      appEnterpriseId,
      spaceEnterpriseId,
      adapterWithBills([...seedApiUsageBills, hiddenBill])
    )

    expect(store.visibleBills().map((bill) => bill.spaceBillId)).toEqual([julyBillId])
    expect(store.billDetail(hiddenBill.spaceBillId)).toBeUndefined()
    await expect(store.support(hiddenBill.spaceBillId, returnUrl)).resolves.toBeUndefined()
  })

  it('binds an admin support link to the current enterprise statement scope', async () => {
    authenticateAs('mem-1')
    const store = useApiUsageBillsStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    await expect(store.support(
      julyBillId,
      returnUrl,
      adapter,
      () => new Date('2026-07-27T10:00:00.000Z')
    )).resolves.toContain('token=bill-support-0001')
    expect(adapter.billSupportLinkRecords[0].input).toEqual({
      spaceEnterpriseId,
      operatorMemberId: 'mem-1',
      spaceBillId: julyBillId,
      returnUrl,
      visibilityScope: { kind: 'enterprise_statement' }
    })
  })

  it('binds a member support link only to owned credential and API locators', async () => {
    authenticateAs('mem-2')
    const store = useApiUsageBillsStore()
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    await store.support(
      julyBillId,
      returnUrl,
      adapter,
      () => new Date('2026-07-27T10:00:00.000Z')
    )
    expect(adapter.billSupportLinkRecords[0].input.visibilityScope).toEqual({
      kind: 'member_credentials',
      credentialLocators: ['credential-mem-2'],
      apiLocators: ['企业资质隐私核验 API']
    })
  })

  it('reuses an active support link and rebuilds it after the five-minute expiry', async () => {
    authenticateAs('mem-2')
    let clock = '2026-07-27T10:00:00.000Z'
    const now = () => new Date(clock)
    const adapter = new MockTrustedSpaceAdapter(() => clock)
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const first = await store.support(julyBillId, returnUrl, adapter, now)
    clock = '2026-07-27T10:04:59.000Z'
    expect(await store.support(julyBillId, returnUrl, adapter, now)).toBe(first)
    expect(adapter.billSupportLinkRecords).toHaveLength(1)

    clock = '2026-07-27T10:05:00.000Z'
    const renewed = await store.support(julyBillId, returnUrl, adapter, now)
    expect(renewed).toContain('token=bill-support-0002')
    expect(renewed).not.toBe(first)
    expect(adapter.billSupportLinkRecords).toHaveLength(2)
  })

  it('clears and denies links when the current member is revoked', async () => {
    const user = authenticateAs('mem-2')
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)
    await store.support(julyBillId, returnUrl, adapter, () => new Date('2026-07-27T10:00:00.000Z'))

    user.revokeSeat('mem-2')
    expect(store.supportLinks).toEqual([])
    expect(store.visibleBills()).toEqual([])
    expect(store.billDetail(julyBillId)).toBeUndefined()
    await expect(store.download(julyBillId, adapter)).resolves.toBeUndefined()
    await expect(store.support(julyBillId, returnUrl, adapter)).resolves.toBeUndefined()
  })

  it('discards a late download response after enterprise exit', async () => {
    const user = authenticateAs('mem-1')
    const adapter = adapterWithBills(seedApiUsageBills)
    let releaseDownload: ((url: string) => void) | undefined
    adapter.createBillDownloadLink = () => new Promise((resolve) => { releaseDownload = resolve })
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const pending = store.download(julyBillId, adapter)
    user.clearEnterpriseContext()
    releaseDownload!('https://trusted-space.mock/late-download')

    await expect(pending).resolves.toBeUndefined()
  })

  it('discards a late support response after member revocation', async () => {
    const user = authenticateAs('mem-2')
    const adapter = adapterWithBills(seedApiUsageBills)
    let releaseSupport: ((link: BillSupportLinkResult) => void) | undefined
    let receivedInput: BillSupportLinkInput | undefined
    adapter.createBillSupportLink = (input) => {
      receivedInput = input
      return new Promise((resolve) => { releaseSupport = resolve })
    }
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)

    const pending = store.support(
      julyBillId,
      returnUrl,
      adapter,
      () => new Date('2026-07-27T10:00:00.000Z')
    )
    expect(receivedInput?.operatorMemberId).toBe('mem-2')
    user.revokeSeat('mem-2')
    releaseSupport!({
      url: 'https://trusted-space.mock/bills/support?token=late',
      expiresAt: '2026-07-27T10:05:00.000Z'
    })

    await expect(pending).resolves.toBeUndefined()
    expect(store.supportLinks).toEqual([])
  })

  it('invalidates an old support link when the enterprise context changes', async () => {
    const user = authenticateAs('mem-1')
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const store = useApiUsageBillsStore()
    await store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)
    await store.support(julyBillId, returnUrl, adapter, () => new Date('2026-07-27T10:00:00.000Z'))

    user.setEnterpriseContext('ent-another')
    expect(store.supportLinks).toEqual([])
    expect(store.supportLinkForBill(julyBillId, new Date('2026-07-27T10:01:00.000Z'))).toBeUndefined()
  })

  it('does not repopulate bills when an old sync completes after enterprise exit', async () => {
    const user = authenticateAs('mem-1')
    const adapter = adapterWithBills([])
    let releaseBills: ((bills: ApiUsageBillMirror[]) => void) | undefined
    adapter.listUsageBills = () => new Promise((resolve) => { releaseBills = resolve })
    const store = useApiUsageBillsStore()

    const syncing = store.syncBills(appEnterpriseId, spaceEnterpriseId, adapter)
    await Promise.resolve()
    user.clearEnterpriseContext()
    releaseBills!([...seedApiUsageBills])
    await syncing

    expect(store.rawBills).toEqual([])
    expect(store.visibleBills()).toEqual([])
  })
})
