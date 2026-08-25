import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import {
  PLATFORM_VENUE_KEY,
  matchesOpsFilter,
  matchesVenueFilter,
  productListChips,
  productOpsFilters,
  productTopicTags,
  productTrialChips,
  productVenueFilters
} from './productListChips'

const product = (id: string) => seedProducts.find((item) => item.id === id)!

describe('productListChips', () => {
  it('keeps list chips to type + venue + one ops badge for a space API', () => {
    const chips = productListChips(product('prod-qualification-api'))

    expect(chips.type).toBe('api')
    expect(chips.typeLabel).toBe('API')
    expect(chips.venue).toEqual({ kind: 'space', name: OWNED_SPACE_NAME })
    expect(chips.ops).toEqual({ kind: 'campaign', label: '合规首选' })
  })

  it('uses space name as venue and 热门 as the campaign for a recommended space dataset', () => {
    const chips = productListChips(product('prod-enterprise-activity'))

    expect(chips.typeLabel).toBe('数据集')
    expect(chips.venue?.name).toBe(OWNED_SPACE_NAME)
    expect(chips.ops).toEqual({ kind: 'campaign', label: '热门' })
  })

  it('leaves venue empty for self-operated APP products', () => {
    const chips = productListChips(product('prod-freight-index'))

    expect(chips.typeLabel).toBe('自有看板')
    expect(chips.venue).toBeNull()
    expect(chips.ops).toEqual({ kind: 'campaign', label: '热门' })
  })

  it('uses seller name as venue for marketplace listings', () => {
    const chips = productListChips(product('prod-seller-route-board'))

    expect(chips.typeLabel).toBe('数据集')
    expect(chips.venue).toEqual({ kind: 'seller', name: '陈静' })
    expect(chips.ops).toEqual({ kind: 'campaign', label: '热门' })
  })

  it('prefers abnormal status over campaign badges', () => {
    const chips = productListChips(product('prod-warehouse-turnover-risk'))

    expect(chips.ops).toEqual({ kind: 'status', label: '暂停销售' })
  })

  it('shows 可申请上架 for candidate assets', () => {
    expect(productListChips(product('prod-driver-credit-candidate')).ops).toEqual({
      kind: 'status',
      label: '可申请上架'
    })
  })
})

describe('productTrialChips', () => {
  it('keeps sample/trial chips off the list model and only on detail helpers', () => {
    expect(productTrialChips(product('prod-qualification-api'))).toEqual(['有试用接口'])
    expect(productTrialChips(product('prod-enterprise-activity'))).toEqual(['有样例'])
    expect(productTrialChips(product('prod-freight-index'))).toEqual([])
    expect(productTrialChips(product('prod-space-port-throughput'))).toEqual([])
  })
})

describe('productTopicTags', () => {
  it('drops fact and campaign copies so only findability topics remain', () => {
    expect(productTopicTags(product('prod-qualification-api'))).toEqual(['合规核验'])
    expect(productTopicTags(product('prod-enterprise-activity'))).toEqual([])
    expect(productTopicTags(product('prod-space-port-throughput'))).toEqual(['港口吞吐量'])
    expect(productTopicTags(product('prod-freight-index'))).toEqual([])
  })
})

describe('search filters follow the same three slots', () => {
  const published = seedProducts.filter((item) => item.availability === 'published' && item.status === 'published')

  it('lists 本平台, space names and seller names as venue options', () => {
    const venues = productVenueFilters(published)
    expect(venues.map((item) => item.label)).toEqual(expect.arrayContaining(['本平台', OWNED_SPACE_NAME, '某省数据空间', '陈静', '入驻商家']))
    expect(venues.map((item) => item.label).join()).not.toContain('自有')
    expect(venues.map((item) => item.label).join()).not.toContain('互联')
    expect(venues.map((item) => item.label)).not.toContain('APP 支付')
    expect(venues.map((item) => item.label)).not.toContain('可信空间购买')
  })

  it('matches 本平台 only when the list venue slot is empty', () => {
    expect(matchesVenueFilter(product('prod-freight-index'), PLATFORM_VENUE_KEY)).toBe(true)
    expect(matchesVenueFilter(product('prod-qualification-api'), PLATFORM_VENUE_KEY)).toBe(false)
    expect(matchesVenueFilter(product('prod-seller-route-board'), `seller:陈静`)).toBe(true)
    expect(matchesVenueFilter(product('prod-qualification-api'), `space:${OWNED_SPACE_NAME}`)).toBe(true)
  })

  it('exposes campaign ops filters and matches the same ops chip', () => {
    expect(productOpsFilters(published)).toEqual(['合规首选', '热门'])
    expect(matchesOpsFilter(product('prod-qualification-api'), '合规首选')).toBe(true)
    expect(matchesOpsFilter(product('prod-qualification-api'), '热门')).toBe(false)
    expect(matchesOpsFilter(product('prod-freight-index'), '热门')).toBe(true)
  })
})
