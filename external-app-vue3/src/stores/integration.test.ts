import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useIntegrationStore } from './integration'
import { useReverseWorkOrderStore } from './reverseWorkOrders'

const evt = (over: Partial<Parameters<ReturnType<typeof useIntegrationStore>['processEvent']>[0]> = {}) => ({
  connector: 'trusted_space' as const,
  subjectId: 'sp-order-1',
  eventType: 'order_update',
  eventVersion: 1,
  idempotencyKey: 'k1',
  signatureValid: true,
  ...over
})
const apply = () => true

describe('integration store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('processes a fresh event and advances the processing version', () => {
    const store = useIntegrationStore()
    const { decision } = store.processEvent(evt({ eventVersion: 2 }), apply)
    expect(decision).toBe('process')
  })

  it('accepts version zero for an object with no processed-version record', () => {
    const store = useIntegrationStore()
    expect(store.processEvent(evt({ eventVersion: 0, idempotencyKey: 'first-v0' }), apply).decision).toBe('process')
  })

  it('drops a same-version event with a different idempotency key', () => {
    const store = useIntegrationStore()
    store.processEvent(evt({ eventVersion: 5, idempotencyKey: 'v5-first' }), apply)
    expect(store.processEvent(evt({ eventVersion: 5, idempotencyKey: 'v5-second' }), apply).decision).toBe('stale_dropped')
  })

  it('keeps event versions isolated by space order', () => {
    const store = useIntegrationStore()
    expect(store.processEvent(evt({ subjectId: 'sp-order-1', eventVersion: 5 }), apply).decision).toBe('process')
    expect(store.processEvent(evt({
      subjectId: 'sp-order-2',
      eventVersion: 1,
      idempotencyKey: 'order-2-v1'
    }), apply).decision).toBe('process')
  })

  it('drops a duplicate idempotency key', () => {
    const store = useIntegrationStore()
    store.processEvent(evt({ idempotencyKey: 'dup' }), apply)
    expect(store.processEvent(evt({ idempotencyKey: 'dup' }), apply).decision).toBe('duplicate_noop')
  })

  it('dead-letters after the first failure plus three retries', () => {
    const store = useIntegrationStore()
    const { event } = store.processEvent(evt(), apply)
    let outcome
    for (let i = 0; i < 4; i++) outcome = store.failEvent(event.id)
    expect(outcome?.outcome).toBe('dead_letter')
    expect(store.deadLetters).toHaveLength(1)
  })

  it('records duplicate manual dispositions once without advancing the business version', () => {
    const store = useIntegrationStore()
    const wo = useReverseWorkOrderStore()
    const event = store.recordRejectedEvent(evt({ eventVersion: 5, idempotencyKey: 'wrong-association' }))
    for (let i = 0; i < 4; i++) store.failEvent(event.id)

    const first = store.repair(event.id, 'op-1', '2026-07-18T10:00:00.000Z')
    const second = store.repair(event.id, 'op-1', '2026-07-18T10:00:00.000Z')

    expect(first).toEqual(second)
    expect(store.repairRevisions).toHaveLength(1)
    expect(store.repairRevisions[0]).toMatchObject({
      eventId: event.id,
      revision: 1,
      status: 'audit_recorded',
      workOrderId: first.workOrderId
    })
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
    expect(store.byId(event.id)?.status).toBe('dead_letter')
    expect(wo.byId(first.workOrderId)).toMatchObject({
      subjectType: 'integration',
      action: 'reconcile',
      status: 'pending_assessment'
    })
    expect(wo.plansFor(first.workOrderId)[0]?.summary).toContain('空间事实须通过可信空间主动对账写入')
  })

  it('does not commit a processing version when the business apply fails', () => {
    const store = useIntegrationStore()
    const { decision, event } = store.processEvent(evt({ eventVersion: 5 }), () => false)

    expect(decision).toBe('retry')
    expect(event.status).toBe('retrying')
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
  })

  it('rejects audit disposition for an event that has not reached dead letter', () => {
    const store = useIntegrationStore()
    const event = store.recordRejectedEvent(evt({ eventVersion: 5, idempotencyKey: 'still-retrying' }))

    expect(() => store.repair(event.id, 'op-1', '2026-07-18T10:00:00.000Z')).toThrow('仅死信事件可记录人工处置')
    expect(store.repairRevisions).toEqual([])
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
  })
})
