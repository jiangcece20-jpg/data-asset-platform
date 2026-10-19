import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import { isDiscoverProductUsable } from './discoverUsability'

const product = {
  availability: 'published',
  status: 'published'
} as Product

describe('isDiscoverProductUsable', () => {
  it('only includes active enterprise or enterprise-member rights', () => {
    expect(isDiscoverProductUsable(product, { enterpriseAuthenticated: true, accessLevel: 'enterprise' })).toBe(true)
    expect(isDiscoverProductUsable(product, { enterpriseAuthenticated: true, accessLevel: 'member' })).toBe(true)
    expect(isDiscoverProductUsable(product, { enterpriseAuthenticated: true, accessLevel: 'item' })).toBe(false)
    expect(isDiscoverProductUsable(product, { enterpriseAuthenticated: true, accessLevel: 'none' })).toBe(false)
  })

  it('excludes products outside the current enterprise or ordinary listing', () => {
    expect(isDiscoverProductUsable(product, { enterpriseAuthenticated: false, accessLevel: 'member' })).toBe(false)
    expect(isDiscoverProductUsable({ ...product, availability: 'delisted' }, { enterpriseAuthenticated: true, accessLevel: 'enterprise' })).toBe(false)
  })
})

it('excludes snapshot-only goods but preserves the current free scheme', () => {
  const context = { enterpriseAuthenticated: true, accessLevel: 'enterprise' as const, serviceExpired: true }
  expect(isDiscoverProductUsable({ ...product, type: 'dataset', price: { model: 'one_time' }, acquisitions: ['item'] } as Product, context)).toBe(false)
  expect(isDiscoverProductUsable({ ...product, type: 'dataset', publicDataset: true } as Product, context)).toBe(true)
  expect(isDiscoverProductUsable({ ...product, type: 'dashboard', price: { model: 'member_free' }, acquisitions: ['free'] } as Product, context)).toBe(true)
})
