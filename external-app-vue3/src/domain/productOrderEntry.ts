import type { MyOrderCard } from './myCenter'

export function productOrderEntry(orders: MyOrderCard[], productId: string, surface: 'app' | 'portal') {
  const matching = orders.filter(order => order.productId === productId)
  if (matching.length === 1) {
    const order = matching[0]!
    return { path: `/${surface}/mine/orders/${order.source}/${order.id}` }
  }
  return { path: `/${surface}/mine`, query: { menu: 'orders', orderTab: 'buy', productId } }
}
