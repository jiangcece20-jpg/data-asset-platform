import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from './user'
import { useOrderStore } from './orders'
import { useDatasetCommerceStore } from './datasetCommerce'

describe('V1.0.2 非公开零元数据集', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates an enterprise order and delivers without a payment time', () => {
    useUserStore().switchMockPurchaseIdentity('enterprise_admin')
    const orders = useOrderStore()
    const before = orders.ledger.length
    const { order } = useDatasetCommerceStore().createOrder('prod-private-zero-dataset', 'enterprise')

    expect(order.ownerType).toBe('enterprise')
    expect(order.amount).toBe(0)
    expect(order.status).toBe('entitlement_active')
    expect(order.paidAt).toBeUndefined()
    expect(order.entitlementId).toBeTruthy()
    expect(orders.ledger).toHaveLength(before)
  })
})
