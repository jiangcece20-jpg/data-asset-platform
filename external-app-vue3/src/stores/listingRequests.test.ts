import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useListingRequestStore } from './listingRequests'

const payload = {
  productId: 'prod-driver-credit-candidate',
  productName: '司机信用评分数据集（可申请上架）',
  userId: 'mem-1',
  scenario: '司机准入',
  requestedScope: '安全驾驶评分与违规次数',
  timeRange: '近 12 个月',
  updateFrequency: '每月',
  expectedAvailableAt: '2026-09-01',
  note: '用于供应商风险评估'
}

describe('listingRequests store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates a submitted request', () => {
    const store = useListingRequestStore()
    expect(store.submit(payload).status).toBe('submitted')
  })

  it('deduplicates unfinished requests for the same user and product', () => {
    const store = useListingRequestStore()
    const first = store.submit(payload)
    expect(store.submit(payload).id).toBe(first.id)
    expect(store.list).toHaveLength(1)
  })

  it('advances to published with user feedback', () => {
    const store = useListingRequestStore()
    const request = store.submit(payload)
    store.advance(request.id, 'published', '已上架可信空间，可前往购买')
    expect(store.byProduct(payload.productId)?.status).toBe('published')
  })
})
