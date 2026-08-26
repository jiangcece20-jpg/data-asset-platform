import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import type { Resource } from '@/types/resource'
import {
  listingBlockReason,
  salesStateOf,
  SALES_STATE_LABELS,
  validateDraftSave,
  validatePublish,
  type PublishForm
} from './salesListing'

function product(availability: Product['availability']): Product {
  return { availability } as Product
}

function resource(patch: Partial<Resource> & Pick<Resource, 'type' | 'origin'>): Resource {
  return {
    id: 'res-1',
    resourceName: '测试资源',
    typeDetail: {},
    createdAt: '2026-08-20',
    updatedAt: '2026-08-20',
    ...patch
  }
}

const paidForm: PublishForm = {
  name: '货车轨迹',
  dealChannel: 'app_payment',
  isFree: false,
  salePeriodMonths: 12,
  personalEnabled: true,
  personalPrice: 199,
  enterpriseEnabled: false,
  enterprisePrice: 0,
  standardMemberMode: 'none',
  standardMemberZhe: 6,
  premiumMemberMode: 'none',
  premiumMemberZhe: 6,
  hasSpacePrice: false,
  dashboardMetrics: []
}

describe('salesStateOf', () => {
  it('maps missing product to unlisted', () => {
    expect(salesStateOf(undefined)).toBe('unlisted')
    expect(SALES_STATE_LABELS.unlisted).toBe('未上架')
  })

  it('maps availability to sales labels', () => {
    expect(salesStateOf(product('published'))).toBe('published')
    expect(salesStateOf(product('paused'))).toBe('paused')
    expect(salesStateOf(product('delisted'))).toBe('delisted')
    expect(salesStateOf(product('preparing'))).toBe('draft')
    expect(salesStateOf(product('candidate'))).toBe('draft')
    expect(SALES_STATE_LABELS.paused).toBe('暂停新购')
  })
})

describe('listingBlockReason', () => {
  it('blocks user views', () => {
    expect(listingBlockReason(resource({ type: 'user_view', origin: 'user_created' }))).toBe('用数视图不可上架')
  })

  it('blocks non-commercializable asset-platform resources', () => {
    expect(
      listingBlockReason(resource({
        type: 'dataset',
        origin: 'asset_platform',
        assetStatus: 'published',
        commercializable: false
      }))
    ).toBe('仅已发布且允许商业化的资产可上架')
  })

  it('allows commercializable published asset-platform resources', () => {
    expect(
      listingBlockReason(resource({
        type: 'dataset',
        origin: 'asset_platform',
        assetStatus: 'published',
        commercializable: true
      }))
    ).toBeUndefined()
  })
})

describe('validateDraftSave / validatePublish', () => {
  it('blocks empty name on draft save', () => {
    expect(validateDraftSave({ ...paidForm, name: '  ' }).some((e) => e.field === 'name')).toBe(true)
  })

  it('blocks a subtitle longer than 60 characters', () => {
    const errors = validateDraftSave({ ...paidForm, subtitle: `${'看板副标题'.repeat(13)}` })
    expect(errors.some((e) => e.field === 'subtitle' && e.message.includes('60'))).toBe(true)
  })

  it('allows incomplete pricing on draft save', () => {
    expect(validateDraftSave({
      ...paidForm,
      personalEnabled: false,
      enterpriseEnabled: false,
      standardMemberMode: 'none',
      premiumMemberMode: 'none'
    })).toEqual([])
  })

  it('requires a sellable plan on publish', () => {
    const errors = validatePublish({
      ...paidForm,
      personalEnabled: false,
      enterpriseEnabled: false
    })
    expect(errors.some((e) => e.field === 'pricing')).toBe(true)
  })

  it('allows free publish without paid plans', () => {
    expect(validatePublish({ ...paidForm, isFree: true, personalEnabled: false })).toEqual([])
  })

  it('requires dashboard metric name and definition on publish', () => {
    const errors = validatePublish({
      ...paidForm,
      dashboardMetrics: [{ name: '时效', definition: '' }]
    })
    expect(errors.some((e) => e.field === 'dashboardMetrics')).toBe(true)
  })

  it('skips app pricing rules for space products with synced price', () => {
    expect(validatePublish({
      ...paidForm,
      dealChannel: 'space_purchase',
      personalEnabled: false,
      hasSpacePrice: true
    })).toEqual([])
  })

  it('requires dashboard metrics on free app publish', () => {
    const errors = validatePublish({
      ...paidForm,
      isFree: true,
      personalEnabled: false,
      dashboardMetrics: [{ name: '时效', definition: '' }]
    })
    expect(errors.some((e) => e.field === 'dashboardMetrics')).toBe(true)
  })

  it('requires dashboard metrics on space publish with synced price', () => {
    const errors = validatePublish({
      ...paidForm,
      dealChannel: 'space_purchase',
      personalEnabled: false,
      hasSpacePrice: true,
      dashboardMetrics: [{ name: '时效', definition: '' }]
    })
    expect(errors.some((e) => e.field === 'dashboardMetrics')).toBe(true)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['1.5', 1.5]
  ])('rejects non-integer sale period %s on draft save', (_label, salePeriodMonths) => {
    const errors = validateDraftSave({ ...paidForm, salePeriodMonths })
    expect(errors.some((e) => e.field === 'salePeriod')).toBe(true)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['1.5', 1.5]
  ])('rejects non-integer sale period %s on publish', (_label, salePeriodMonths) => {
    const errors = validatePublish({ ...paidForm, salePeriodMonths })
    expect(errors.some((e) => e.field === 'salePeriod')).toBe(true)
  })
})
