import { describe, expect, it } from 'vitest'
import { buyerEnterpriseName, operatorContactText } from './opsPurchaseParty'

const enterprise = {
  id: 'ent-wanlian-logistics',
  name: '万联供应链管理有限公司',
  members: [
    { id: 'mem-1', name: '陈静', phone: '138****2201', role: 'admin' as const, seatAssigned: false, status: 'active' as const }
  ]
}

describe('opsPurchaseParty', () => {
  it('resolves the purchasing enterprise name instead of a type label', () => {
    expect(buyerEnterpriseName({ ownerType: 'enterprise', enterpriseId: 'ent-wanlian-logistics' }, enterprise))
      .toBe('万联供应链管理有限公司')
    expect(buyerEnterpriseName({ ownerType: 'personal' }, enterprise)).toBe('个人')
    expect(buyerEnterpriseName({ requestedEnterpriseName: '希望落到的公司' }, enterprise)).toBe('希望落到的公司')
    expect(buyerEnterpriseName({}, enterprise)).toBe('未确认')
  })

  it('prefers submitted operator contact, then member directory', () => {
    expect(operatorContactText({ contactName: '陈静', contactPhone: '13800000000' }, enterprise))
      .toBe('陈静 · 13800000000')
    expect(operatorContactText({ operatorMemberId: 'mem-1' }, enterprise)).toBe('陈静 · 138****2201')
    expect(operatorContactText({ personalOwnerId: 'mem-1' }, enterprise)).toBe('陈静 · 138****2201')
    expect(operatorContactText({}, enterprise)).toBe('—')
  })
})
