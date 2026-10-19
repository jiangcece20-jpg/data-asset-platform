import { describe, expect, it } from 'vitest'
import { UPDATE_FREQUENCIES, MERCHANT_UPDATE_FREQUENCIES, coerceUpdateFrequency, isMerchantUpdateFrequency } from './updateFrequency'

describe('updateFrequency enum', () => {
  it('keeps one-time globally but excludes it from merchant frequencies', () => {
    expect(UPDATE_FREQUENCIES).toContain('一次性')
    expect(MERCHANT_UPDATE_FREQUENCIES).toEqual(['实时更新', '每日更新', '每周更新', '每月更新', '每季度更新', '不定期'])
    for (const frequency of MERCHANT_UPDATE_FREQUENCIES) expect(isMerchantUpdateFrequency(frequency)).toBe(true)
    for (const frequency of ['一次性', '一次性交付', '不更新', '', '待定']) expect(isMerchantUpdateFrequency(frequency)).toBe(false)
  })

  it('includes one-time delivery alongside scheduled update frequencies', () => {
    expect(UPDATE_FREQUENCIES).toEqual([
      '一次性',
      '实时更新',
      '每日更新',
      '每周更新',
      '每月更新',
      '每季度更新',
      '不定期'
    ])
  })

  it('maps legacy free-text onto the enum', () => {
    expect(coerceUpdateFrequency('一次性交付')).toBe('一次性')
    expect(coerceUpdateFrequency('不更新')).toBe('一次性')
    expect(coerceUpdateFrequency('实时核验')).toBe('实时更新')
    expect(coerceUpdateFrequency('每日')).toBe('每日更新')
    expect(coerceUpdateFrequency('每周一更新')).toBe('每周更新')
    expect(coerceUpdateFrequency('每月 5 日发布')).toBe('每月更新')
    expect(coerceUpdateFrequency('证照变更后 T+1 同步')).toBe('不定期')
    expect(coerceUpdateFrequency('待定')).toBe('')
    expect(coerceUpdateFrequency('每周更新')).toBe('每周更新')
  })
})
