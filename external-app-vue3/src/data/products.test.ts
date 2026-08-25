import { describe, expect, it } from 'vitest'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import { seedProducts } from './products'

describe('four-type product catalog', () => {
  it('contains only the four approved public types', () => {
    expect(new Set(seedProducts.map((product) => product.type))).toEqual(
      new Set(['dataset', 'api', 'report', 'dashboard'])
    )
  })

  it('routes trusted-space products to space and asset-platform datasets to APP payment', () => {
    for (const product of seedProducts.filter((item) => item.origin === 'trusted_space')) {
      expect(product.dealChannel).toBe('space_purchase')
      expect(product.acquisitions).toEqual(['space_purchase'])
    }
    for (const product of seedProducts.filter((item) => item.type === 'dataset' && item.origin === 'asset_platform' && item.availability !== 'candidate')) {
      expect(product.dealChannel).toBe('app_payment')
      expect(product.acquisitions).toContain('item_purchase')
      expect(product.datasetOffers?.some((offer) => offer.subject === 'personal')).toBe(true)
      expect(product.datasetOffers?.some((offer) => offer.subject === 'enterprise')).toBe(true)
    }
  })

  it('keeps candidate assets free of samples and real responses', () => {
    for (const product of seedProducts.filter((item) => item.availability === 'candidate')) {
      expect(product.typeDetail.dataset?.sampleRows ?? []).toHaveLength(0)
      expect(product.typeDetail.api?.sandbox.fixedResponse ?? {}).toEqual({})
    }
  })

  it('limits published dataset samples to ten rows', () => {
    for (const product of seedProducts.filter((item) => item.type === 'dataset' && item.availability === 'published')) {
      expect(product.typeDetail.dataset?.sampleRows.length).toBeLessThanOrEqual(10)
    }
  })

  it('gives published datasets fieldProfiling for every profilingEnabled field', () => {
    for (const product of seedProducts.filter((item) => item.type === 'dataset' && item.availability === 'published')) {
      const dataset = product.typeDetail.dataset
      expect(dataset).toBeTruthy()
      const enabled = (dataset?.fields ?? []).filter((f) => f.profilingEnabled).map((f) => f.name)
      const stats = new Set((dataset?.fieldProfiling ?? []).map((s) => s.fieldName))
      expect(enabled.length).toBeGreaterThan(0)
      for (const name of enabled) {
        expect(stats.has(name)).toBe(true)
      }
    }
  })
})

describe('space product tags', () => {
  const space = () => seedProducts.filter((p) => p.origin === 'trusted_space')

  it('uses 万联易达可信空间 for owned space copy', () => {
    expect(space().some((p) => JSON.stringify(p).includes('万联可信空间'))).toBe(false)
    expect(space().filter((p) => p.spaceKind === 'owned').every((p) => p.spaceName === OWNED_SPACE_NAME)).toBe(true)
  })

  it('splits sample tag to datasets and trial-api tag to APIs', () => {
    for (const p of space()) {
      if (p.type === 'dataset') expect(p.hasTrialApi).toBeUndefined()
      if (p.type === 'api') expect(p.hasSampleData).toBeUndefined()
    }
    expect(seedProducts.find((p) => p.id === 'prod-enterprise-activity')?.hasSampleData).toBe(true)
    expect(seedProducts.find((p) => p.id === 'prod-space-port-throughput')?.hasSampleData).toBe(false)
    expect(seedProducts.find((p) => p.id === 'prod-qualification-api')?.hasTrialApi).toBe(true)
    expect(seedProducts.find((p) => p.id === 'prod-privacy-verify')?.hasTrialApi).toBe(false)
  })

  it('gives published space datasets the same sync material wall as space APIs', () => {
    const published = seedProducts.filter(
      (p) => p.origin === 'trusted_space' && p.availability === 'published' && (p.type === 'dataset' || p.type === 'api')
    )
    expect(published.map((p) => p.id)).toEqual(
      expect.arrayContaining([
        'prod-space-port-throughput',
        'prod-enterprise-activity',
        'prod-qualification-api',
        'prod-privacy-verify'
      ])
    )
    for (const p of published) {
      const m = p.spaceMeta
      expect(m?.productIntroduction).toBeTruthy()
      expect(m?.providerName).toBeTruthy()
      expect(m?.providerEntityInfo).toBeTruthy()
      expect(m?.complianceDeclarationUrl).toBeTruthy()
      expect(m?.dataSourceDeclarationUrl).toBeTruthy()
      expect(m?.securityClassificationUrl).toBeTruthy()
      expect(m?.qualityAssessmentUrl).toBeTruthy()
      expect(m?.authorizationLetterUrl).toBeTruthy()
      expect(m?.billingRules?.length).toBeGreaterThan(0)
      expect(m?.usageRestrictions?.length).toBeGreaterThan(0)
      expect(m?.classificationStandard).toBeTruthy()
      expect(m?.classificationPath).toBeTruthy()
      expect(typeof m?.classificationLevel).toBe('number')
    }
  })
})
