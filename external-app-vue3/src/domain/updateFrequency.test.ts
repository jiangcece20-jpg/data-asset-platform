import { describe, expect, it } from 'vitest'
import { UPDATE_FREQUENCIES, coerceUpdateFrequency } from './updateFrequency'

describe('updateFrequency enum', () => {
  it('keeps the six storefront labels', () => {
    expect(UPDATE_FREQUENCIES).toEqual([
      '实时更新',
      '每日更新',
      '每周更新',
      '每月更新',
      '每季度更新',
      '不定期'
    ])
  })

  it('maps legacy free-text onto the enum', () => {
    expect(coerceUpdateFrequency('实时核验')).toBe('实时更新')
    expect(coerceUpdateFrequency('每日')).toBe('每日更新')
    expect(coerceUpdateFrequency('每周一更新')).toBe('每周更新')
    expect(coerceUpdateFrequency('每月 5 日发布')).toBe('每月更新')
    expect(coerceUpdateFrequency('证照变更后 T+1 同步')).toBe('不定期')
    expect(coerceUpdateFrequency('待定')).toBe('')
    expect(coerceUpdateFrequency('每周更新')).toBe('每周更新')
  })
})
