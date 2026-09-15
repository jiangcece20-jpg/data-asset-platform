import { describe, expect, it } from 'vitest'
import router from './index'

describe('admin order routes', () => {
  it('keeps order operations in the list without an admin order detail route', () => {
    expect(router.hasRoute('admin-orders')).toBe(true)
    expect(router.hasRoute('admin-order-intent-detail')).toBe(false)
    expect(router.getRoutes().some((route) => route.path === '/admin/orders/intents/:id')).toBe(false)
  })
})
