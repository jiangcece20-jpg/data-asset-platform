import { describe, expect, it } from 'vitest'
import { decideEvent, decideAfterFailure } from './integrationPipeline'

describe('decideEvent', () => {
  const base = { signatureValid: true, eventVersion: 5, currentProcessingVersion: 3, idempotencyKeySeen: false }
  it('processes a fresh, valid, newer event', () => {
    expect(decideEvent(base)).toBe('process')
  })
  it('rejects an invalid signature', () => {
    expect(decideEvent({ ...base, signatureValid: false })).toBe('signature_rejected')
  })
  it('no-ops a duplicate idempotency key', () => {
    expect(decideEvent({ ...base, idempotencyKeySeen: true })).toBe('duplicate_noop')
  })
  it('drops a stale (older-version) event', () => {
    expect(decideEvent({ ...base, eventVersion: 2 })).toBe('stale_dropped')
  })
})

describe('decideAfterFailure', () => {
  it('retries up to 3 then dead-letters', () => {
    expect(decideAfterFailure(1)).toBe('retry')
    expect(decideAfterFailure(3)).toBe('retry')
    expect(decideAfterFailure(4)).toBe('dead_letter')
  })
})
