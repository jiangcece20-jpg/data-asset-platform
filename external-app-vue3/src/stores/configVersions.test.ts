import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useConfigVersionStore } from './configVersions'

describe('configVersions store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('refuses a two-person config without a distinct reviewer', () => {
    const store = useConfigVersionStore()
    expect(() =>
      store.publish({ domain: 'member_price', before: { price: 99 }, after: { price: 79 }, editor: 'op-1', effectiveScope: '全部', affectedProductIds: ['p1'] })
    ).toThrow('该配置需第二名审核人')
    expect(() =>
      store.publish({ domain: 'member_price', before: { price: 99 }, after: { price: 79 }, editor: 'op-1', reviewer: 'op-1', effectiveScope: '全部', affectedProductIds: ['p1'] })
    ).toThrow('该配置需第二名审核人')
  })

  it('publishes an immutable version and supersedes the prior one', () => {
    const store = useConfigVersionStore()
    const v1 = store.publish({ domain: 'hot_word', before: [], after: ['港口'], editor: 'op-1', effectiveScope: '首页', affectedProductIds: [] })
    const v2 = store.publish({ domain: 'hot_word', before: ['港口'], after: ['港口', '运价'], editor: 'op-1', effectiveScope: '首页', affectedProductIds: [] })
    expect(v2.version).toBe(2)
    expect(store.byId(v1.id)?.status).toBe('superseded')
    expect(store.currentPublished('hot_word')?.id).toBe(v2.id)
  })

  it('rolls back to a target version keeping the erroneous version queryable', () => {
    const store = useConfigVersionStore()
    const v1 = store.publish({ domain: 'member_price', before: { price: 99 }, after: { price: 89 }, editor: 'op-1', reviewer: 'op-2', effectiveScope: '全部', affectedProductIds: ['p1'] })
    const v2 = store.publish({ domain: 'member_price', before: { price: 89 }, after: { price: 1 }, editor: 'op-1', reviewer: 'op-2', effectiveScope: '全部', affectedProductIds: ['p1'] })
    const rolled = store.rollback('member_price', v1.version, 'op-1', '价格误配')
    expect(rolled.after).toEqual({ price: 89 })
    expect(rolled.rolledBackFromVersion).toBe(v1.version)
    expect(store.byId(v2.id)?.status).toBe('rolled_back') // erroneous version preserved
  })

  it('publishes a safe fallback when an AI guide reference is invalid', () => {
    const store = useConfigVersionStore()
    const v = store.publish({ domain: 'ai_guide', before: {}, after: { question: '看某失效商品', invalidReference: true }, editor: 'op-1', reviewer: 'op-2', effectiveScope: 'AI', affectedProductIds: [] })
    expect((v.after as any).fallback).toBe(true)
  })
})
