import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useContractStore } from './contracts'
import { useEntitlementStore } from './entitlements'
import type { Entitlement } from '@/types/domain'
import type { EnterpriseContract } from '@/types/afterSales'

function seat(id: string): Entitlement {
  return { id, source: 'enterprise', type: 'seat', productId: 'prod-1', enterpriseId: 'ent-1', ownerId: 'mem-x', validFrom: '2026-07-01', status: 'active' }
}
function contract(): EnterpriseContract {
  return { id: 'c1', enterpriseId: 'ent-1', productId: 'prod-1', status: 'active', effectiveFrom: '2026-01-01', seatIds: ['s1', 's2'] }
}

describe('contracts store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup() {
    const entitlements = useEntitlementStore()
    entitlements.list = [seat('s1'), seat('s2')]
    const contracts = useContractStore()
    contracts.list = [contract()]
    return { entitlements, contracts }
  }

  it('terminates then reclaims all seats in bulk with a two-layer notice', () => {
    const { entitlements, contracts } = setup()
    contracts.terminateContract('c1', '2026-12-31')
    expect(contracts.byId('c1')?.status).toBe('terminating')
    const result = contracts.finalizeContract('c1')
    expect(result.requiresTwoLayerNotice).toBe(true)
    expect(entitlements.list.every((e) => e.status === 'revoked')).toBe(true)
    expect(contracts.byId('c1')?.status).toBe('terminated')
  })

  it('removing one member reclaims only that seat and keeps the contract', () => {
    const { entitlements, contracts } = setup()
    contracts.removeMember('c1', 's1')
    expect(entitlements.list.find((e) => e.id === 's1')?.status).toBe('revoked')
    expect(entitlements.list.find((e) => e.id === 's2')?.status).toBe('active')
    expect(contracts.byId('c1')?.status).toBe('active')
    expect(contracts.byId('c1')?.seatIds).toEqual(['s2'])
  })

  it('migration grants the replacement before revoking the original (no gap)', () => {
    const { entitlements, contracts } = setup()
    contracts.migrateSeat('s1', { id: 's1-new', source: 'enterprise', type: 'seat', productId: 'prod-2', enterpriseId: 'ent-1', ownerId: 'mem-x', validFrom: '2026-07-20', status: 'active' })
    expect(entitlements.list.find((e) => e.id === 's1-new')?.status).toBe('active')
    expect(entitlements.list.find((e) => e.id === 's1')?.status).toBe('revoked')
  })
})
