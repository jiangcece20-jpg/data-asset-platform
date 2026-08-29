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

  it('maps legacy tab=我的数据 to data/purchased', () => {
    expect(parseMineQuery({ tab: '我的数据' })).toMatchObject({
      menu: 'data',
      dataTab: 'purchased'
    })
  })

  it('maps legacy tab=求上架 to seller menu', () => {
    expect(parseMineQuery({ tab: '求上架' })).toMatchObject({
      menu: 'seller',
      sellerTab: 'listings'
    })
  })

  it('maps legacy tab=data and tab=orders', () => {
    expect(parseMineQuery({ tab: 'data' }).menu).toBe('data')
    expect(parseMineQuery({ tab: 'orders' }).menu).toBe('orders')
  })

  it('maps legacy orderTab=intent to buy (intents merged into buy list)', () => {
    expect(parseMineQuery({ menu: 'orders', orderTab: 'intent' }).orderTab).toBe('buy')
  })

  it('prefers explicit menu/orderTab/dataTab over legacy tab', () => {
    expect(parseMineQuery({
      tab: 'data',
      menu: 'orders',
      orderTab: 'view'
    })).toMatchObject({ menu: 'orders', orderTab: 'buy' })
  })

  it('builds patch that writes menu/orderTab and clears conflicting tab when needed', () => {
    const patch = mineQueryPatch(
      { menu: 'data', dataTab: 'purchased' },
      { tab: 'orders', subject: 'enterprise' }
    )
    expect(patch.menu).toBe('data')
    expect(patch.dataTab).toBe('purchased')
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
