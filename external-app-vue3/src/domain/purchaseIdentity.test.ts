import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from '@/stores/user'
import {
  currentIntentPartyName,
  currentPurchaseIdentity,
  currentPurchaseSubject,
  hasEnterprisePurchaseIdentity,
  startDatasetPayment
} from './purchaseIdentity'

describe('purchase identity', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('uses the personal login identity until an enterprise context is active', () => {
    const user = useUserStore()
    expect(hasEnterprisePurchaseIdentity(user)).toBe(false)
    expect(currentPurchaseSubject(user)).toBe('personal')
    expect(currentPurchaseIdentity(user)).toEqual({
      subject: 'personal',
      typeLabel: '个人',
      name: '陈静'
    })
    expect(currentIntentPartyName(user)).toBe('个人')
  })

  it('locks purchase to the current enterprise after login identity switches', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    expect(currentPurchaseSubject(user)).toBe('enterprise')
    expect(currentPurchaseIdentity(user)).toEqual({
      subject: 'enterprise',
      typeLabel: '企业',
      name: '万联供应链管理有限公司'
    })
    expect(currentIntentPartyName(user)).toBe('万联供应链管理有限公司')
    expect(currentPurchaseSubject(user, { forcePersonal: true })).toBe('personal')
  })

  it('switches mock login identity between personal, enterprise admin and member', () => {
    const user = useUserStore()
    user.switchMockPurchaseIdentity('enterprise_admin')
    expect(currentPurchaseSubject(user)).toBe('enterprise')
    expect(user.currentEnterpriseMember?.role).toBe('admin')
    expect(user.context.name).toBe('陈静')

    user.switchMockPurchaseIdentity('enterprise_member')
    expect(currentPurchaseSubject(user)).toBe('enterprise')
    expect(user.currentEnterpriseMember?.role).toBe('member')
    expect(user.context.name).toBe('王涛')

    user.switchMockPurchaseIdentity('personal')
    expect(currentPurchaseSubject(user)).toBe('personal')
    expect(currentIntentPartyName(user)).toBe('个人')
    expect(user.context.name).toBe('陈静')
    expect(user.context.currentEnterpriseId).toBeUndefined()
  })

  it('creates a dataset order for the current identity and returns the payment path', () => {
    const { order, path } = startDatasetPayment('prod-truck-trajectory', false)
    expect(order.ownerType).toBe('personal')
    expect(path).toBe(`/app/payment/dataset/${order.id}`)

    useUserStore().completeEnterpriseAuth()
    const enterprise = startDatasetPayment('prod-truck-trajectory', true)
    expect(enterprise.order.ownerType).toBe('enterprise')
    expect(enterprise.path).toBe(`/portal/payment/dataset/${enterprise.order.id}`)
  })
})
