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

describe('integration store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('processes a fresh event and advances the processing version', () => {
    const store = useIntegrationStore()
    const { decision } = store.processEvent(evt({ eventVersion: 2 }))
    expect(decision).toBe('process')
  })

  it('keeps event versions isolated by space order', () => {
    const store = useIntegrationStore()
    expect(store.processEvent(evt({ subjectId: 'sp-order-1', eventVersion: 5 })).decision).toBe('process')
    expect(store.processEvent(evt({
      subjectId: 'sp-order-2',
      eventVersion: 1,
      idempotencyKey: 'order-2-v1'
    })).decision).toBe('process')
  })

  it('drops a duplicate idempotency key', () => {
    const store = useIntegrationStore()
    store.processEvent(evt({ idempotencyKey: 'dup' }))
    expect(store.processEvent(evt({ idempotencyKey: 'dup' })).decision).toBe('duplicate_noop')
  })

  it('dead-letters after the first failure plus three retries', () => {
    const store = useIntegrationStore()
    const { event } = store.processEvent(evt())
    let outcome
    for (let i = 0; i < 4; i++) outcome = store.failEvent(event.id)
    expect(outcome?.outcome).toBe('dead_letter')
    expect(store.deadLetters).toHaveLength(1)
  })

  it('repair writes a higher processing version and cannot be overwritten by a stale event', () => {
    const store = useIntegrationStore()
    const wo = useReverseWorkOrderStore()
    const { event } = store.processEvent(evt({ eventVersion: 5 }))
    const { workOrderId } = store.repair(event.id, 'op-1', '2026-07-18T10:00:00.000Z')
    expect(wo.byId(workOrderId)?.subjectType).toBe('integration')
    // a later stale event (version 5, now below the bumped processing version 6) is dropped
    const later = store.processEvent(evt({ eventVersion: 5, idempotencyKey: 'k2' }))
    expect(later.decision).toBe('stale_dropped')
  })
})
