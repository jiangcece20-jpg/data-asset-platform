import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDemandStore } from './demand'
import { useCollectionDispatchStore } from './collectionDispatch'

function pendingLead() {
  return useDemandStore().byId('demand-seed-1')!
}

describe('collection dispatch prototype', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('accepts an unprocessed lead and retries its failed creation with the same commission ID', () => {
    const lead = pendingLead()
    const store = useCollectionDispatchStore()
    const record = store.create(lead, 'failure')
    const id = record.payload.id
    expect(lead.status).toBe('new')
    expect(lead.processedAt).toBeUndefined()
    expect(record.status).toBe('failed')
    expect(store.commissions).toHaveLength(0)
    store.create(lead)
    store.create(lead)
    store.send(lead.id)
    expect(store.records).toHaveLength(1)
    expect(store.commissions).toEqual([{ leadId: lead.id, id, status: '未承接' }])
    expect(record).toMatchObject({ status: 'sent', attempts: 2 })
    expect(lead.status).toBe('new')
  })

  it('reconciles an uncertain response without creating another commission', () => {
    const lead = pendingLead()
    const store = useCollectionDispatchStore()
    const record = store.create(lead, 'unknown')
    const id = record.payload.id
    expect(record.status).toBe('unknown')
    expect(lead.status).toBe('new')
    expect(store.commissions).toHaveLength(1)
    store.create(lead, 'failure')
    expect(record.status).toBe('sent')
    expect(store.commissions).toEqual([{ leadId: lead.id, id, status: '未承接' }])
  })

  it.each([undefined, '', ' \t '])('reports 未处理 for unavailable receiver status (%s) without changing creation or lead state', (status) => {
    const lead = pendingLead()
    const store = useCollectionDispatchStore()
    const record = store.create(lead)
    store.commissions[0]!.status = status

    expect(store.commissionStatusByLead(lead.id)).toBe('未处理')
    expect(record.status).toBe('sent')
    expect(record.error).toBeUndefined()
    expect(store.commissions[0]!.status).toBe(status)
    expect(lead.status).toBe('new')
  })

  it('reports 未处理 when the receiver commission is unavailable and preserves a nonempty source status', () => {
    const lead = pendingLead()
    const store = useCollectionDispatchStore()
    store.create(lead)
    store.commissions[0]!.status = ' 采数据返回的状态 '
    expect(store.commissionStatusByLead(lead.id)).toBe(' 采数据返回的状态 ')
    store.commissions = []
    expect(store.commissionStatusByLead(lead.id)).toBe('未处理')
    expect(store.byLead(lead.id)!.status).toBe('sent')
  })

  it('maps maximum budget and truncates outbound fields without changing the lead', () => {
    const lead = pendingLead()
    Object.assign(lead, { question: '题'.repeat(60), scenario: '需'.repeat(210), enterpriseName: '司'.repeat(80), contactName: '张三', priceRange: '100-300' })
    const record = useCollectionDispatchStore().create(lead)
    expect(record.payload.budget).toBe(300)
    expect(record.payload.id).toHaveLength(32)
    expect(Array.from(record.payload.title)).toHaveLength(50)
    expect(Array.from(record.payload.description)).toHaveLength(200)
    expect(Array.from(record.payload.client)).toHaveLength(50)
    expect(record.payload.client.startsWith('张三')).toBe(true)
    expect(record.shortened).toBe(true)
    expect(lead.question).toHaveLength(60)
  })

  it.each(['', '   ', undefined])('does not turn an absent budget (%s) into zero', (priceRange) => {
    const lead = pendingLead()
    lead.priceRange = priceRange
    expect(useCollectionDispatchStore().create(lead).payload.budget).toBeUndefined()
  })

  it('preserves explicit zero and reports invalid source fields', () => {
    const lead = pendingLead()
    lead.priceRange = '0'
    expect(useCollectionDispatchStore().create(lead).payload.budget).toBe(0)
    const badLead = { ...lead, id: 'invalid-lead', priceRange: '100-未知' }
    expect(useCollectionDispatchStore().create(badLead)).toMatchObject({ status: 'failed', mappingError: '预算格式无法识别，请核对后重试' })
  })

  it('uses corrected source fields when processing a failed mapping again', () => {
    const lead = pendingLead()
    lead.priceRange = '100-未知'
    const store = useCollectionDispatchStore()
    const record = store.create(lead)
    expect(record.status).toBe('failed')
    lead.priceRange = '100-300'
    expect(store.create(lead)).toMatchObject({ status: 'sent', mappingError: undefined, payload: { budget: 300 } })
    expect(store.commissions).toHaveLength(1)
  })
})
