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
    let applyCalls = 0
    const input = evt({ idempotencyKey: 'dup' })
    store.processEvent(input, () => {
      applyCalls += 1
      return true
    })
    expect(store.processEvent(input, () => {
      applyCalls += 1
      return true
    }).decision).toBe('duplicate_noop')
    expect(applyCalls).toBe(1)
    expect(store.events).toHaveLength(1)
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

  it('retries the original audit event and commits its version after a transient apply failure', () => {
    const store = useIntegrationStore()
    const input = evt({
      eventVersion: 5,
      idempotencyKey: 'transient-apply',
      purchaseIntentId: 'intent-1',
      spaceEnterpriseId: 'space-enterprise-1',
      spaceProductNo: 'SPACE-1'
    })
    let applyCalls = 0
    const applyAfterOneFailure = () => {
      applyCalls += 1
      return applyCalls === 2
    }

    const first = store.processEvent(input, applyAfterOneFailure)
    const second = store.processEvent(input, applyAfterOneFailure)

    expect(first.decision).toBe('retry')
    expect(second.decision).toBe('process')
    expect(second.event.id).toBe(first.event.id)
    expect(applyCalls).toBe(2)
    expect(store.events).toHaveLength(1)
    expect(store.events[0]).toMatchObject({
      status: 'processed',
      attempts: 1,
      processingVersion: 5
    })
    expect(store.events[0]?.failureReason).toBeUndefined()
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBe(5)
  })

  it('reuses one audit event until continuous apply failures reach dead letter', () => {
    const store = useIntegrationStore()
    const input = evt({ eventVersion: 5, idempotencyKey: 'continuous-failure' })
    let applyCalls = 0
    const alwaysFails = () => {
      applyCalls += 1
      return false
    }

    const decisions = Array.from({ length: 4 }, () => store.processEvent(input, alwaysFails).decision)

    expect(decisions).toEqual(['retry', 'retry', 'retry', 'dead_letter'])
    expect(applyCalls).toBe(4)
    expect(store.events).toHaveLength(1)
    expect(store.events[0]).toMatchObject({
      status: 'dead_letter',
      attempts: 4,
      failureReason: '业务镜像写入失败'
    })
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
  })

  it('rejects a retry whose version or trusted-space association differs from the original payload', () => {
    const store = useIntegrationStore()
    const input = evt({
      eventVersion: 5,
      idempotencyKey: 'mismatched-retry',
      purchaseIntentId: 'intent-1',
      spaceEnterpriseId: 'space-enterprise-1',
      spaceProductNo: 'SPACE-1'
    })
    let applyCalls = 0
    const first = store.processEvent(input, () => {
      applyCalls += 1
      return false
    })

    const versionMismatch = store.processEvent({ ...input, eventVersion: 6 }, () => {
      applyCalls += 1
      return true
    })
    const associationMismatch = store.processEvent({ ...input, spaceProductNo: 'SPACE-2' }, () => {
      applyCalls += 1
      return true
    })

    expect(first.decision).toBe('retry')
    expect(versionMismatch.decision).toBe('retry_payload_rejected')
    expect(associationMismatch.decision).toBe('retry_payload_rejected')
    expect(applyCalls).toBe(1)
    expect(store.events).toHaveLength(1)
    expect(store.events[0]).toMatchObject({ status: 'retrying', attempts: 1 })
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
  })

  it('does not let a normal duplicate recover a dead-letter event', () => {
    const store = useIntegrationStore()
    const input = evt({ eventVersion: 5, idempotencyKey: 'dead-letter-repeat' })
    let applyCalls = 0
    const alwaysFails = () => {
      applyCalls += 1
      return false
    }
    for (let attempt = 0; attempt < 4; attempt += 1) store.processEvent(input, alwaysFails)

    const repeated = store.processEvent(input, () => {
      applyCalls += 1
      return true
    })

    expect(repeated.decision).toBe('dead_letter')
    expect(applyCalls).toBe(4)
    expect(store.events).toHaveLength(1)
    expect(repeated.event).toMatchObject({ status: 'dead_letter', attempts: 4 })
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
  })

  it('allows only the explicit authoritative path to recover a matching dead-letter event', () => {
    const store = useIntegrationStore()
    const input = evt({ eventVersion: 5, idempotencyKey: 'authoritative-retry' })
    for (let attempt = 0; attempt < 4; attempt += 1) store.processEvent(input, () => false)
    const originalEventId = store.events[0]?.id

    const recovered = store.processAuthoritativeEvent(input, () => true)

    expect(recovered.decision).toBe('process')
    expect(recovered.event.id).toBe(originalEventId)
    expect(store.events).toHaveLength(1)
    expect(recovered.event).toMatchObject({
      status: 'processed',
      attempts: 4,
      processingVersion: 5
    })
    expect(recovered.event.failureReason).toBeUndefined()
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBe(5)
  })

  it('rejects audit disposition for an event that has not reached dead letter', () => {
    const store = useIntegrationStore()
    const event = store.recordRejectedEvent(evt({ eventVersion: 5, idempotencyKey: 'still-retrying' }))

    expect(() => store.repair(event.id, 'op-1', '2026-07-18T10:00:00.000Z')).toThrow('仅死信事件可记录人工处置')
    expect(store.repairRevisions).toEqual([])
    expect(store.processingVersions['trusted_space:sp-order-1:order_update']).toBeUndefined()
  })
})
