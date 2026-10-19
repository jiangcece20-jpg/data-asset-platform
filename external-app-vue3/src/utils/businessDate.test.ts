import { describe, expect, it } from 'vitest'
import { shanghaiDate } from './businessDate'

describe('shanghaiDate', () => {
  it('uses the Beijing business date across the UTC midnight boundary', () => {
    expect(shanghaiDate(new Date('2026-10-09T15:59:59.000Z'))).toBe('2026-10-09')
    expect(shanghaiDate(new Date('2026-10-09T16:00:00.000Z'))).toBe('2026-10-10')
  })
})
