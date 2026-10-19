import { describe, expect, it } from 'vitest'
import { parseMineQuery, mineQueryPatch } from './mineQuery'

describe('mineQuery', () => {
  it('defaults to orders/buy for empty query', () => {
    expect(parseMineQuery({})).toEqual({
      menu: 'orders',
      orderTab: 'buy',
      dataTab: 'purchased',
      sellerTab: 'listings'
    })
  })

  it('maps removed my-data links back to orders', () => {
    expect(parseMineQuery({ tab: '我的数据' })).toMatchObject({
      menu: 'orders',
      orderTab: 'buy'
    })
    expect(parseMineQuery({ tab: 'data' }).menu).toBe('orders')
    expect(parseMineQuery({ menu: 'data', dataTab: 'produced' }).menu).toBe('orders')
  })

  it('maps legacy tab=求上架 to seller menu', () => {
    expect(parseMineQuery({ tab: '求上架' })).toMatchObject({
      menu: 'seller',
      sellerTab: 'listings'
    })
  })

  it('maps legacy tab=orders', () => {
    expect(parseMineQuery({ tab: 'orders' }).menu).toBe('orders')
  })

  it.each(['intent', 'vip', 'buy', 'unknown'])('maps orderTab=%s to the only buy orders list', (orderTab) => {
    expect(parseMineQuery({ menu: 'orders', orderTab }).orderTab).toBe('buy')
    expect(mineQueryPatch({ menu: 'orders' }, { orderTab }).orderTab).toBe('buy')
  })

  it('prefers explicit menu/orderTab/dataTab over legacy tab', () => {
    expect(parseMineQuery({
      tab: 'data',
      menu: 'orders',
      orderTab: 'view'
    })).toMatchObject({ menu: 'orders', orderTab: 'buy' })
  })

  it('builds patch that writes menu/orderTab and clears removed data state', () => {
    const patch = mineQueryPatch(
      { menu: 'orders', orderTab: 'buy' },
      { menu: 'data', dataTab: 'produced', subject: 'enterprise' }
    )
    expect(patch.menu).toBe('orders')
    expect(patch.orderTab).toBe('buy')
    expect(patch.dataTab).toBeUndefined()
    expect(patch.tab).toBeUndefined()
    expect(patch.subject).toBe('enterprise')
  })

  it('writes sellerTab only when menu is seller', () => {
    const patch = mineQueryPatch(
      { menu: 'seller', sellerTab: 'listing' },
      { menu: 'orders', orderTab: 'buy' }
    )
    expect(patch.menu).toBe('seller')
    expect(patch.sellerTab).toBe('listing')
    expect(patch.orderTab).toBeUndefined()
  })
})
