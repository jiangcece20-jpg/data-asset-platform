import { describe, expect, it } from 'vitest'
import {
  nextOpsStatus,
  userStatusOf
} from './spaceIntent'

describe('spaceIntent domain', () => {
  it('keeps the four intent statuses visible to users', () => {
    expect(userStatusOf('unclaimed')).toBe('unclaimed')
    expect(userStatusOf('processing')).toBe('processing')
    expect(userStatusOf('entitled')).toBe('entitled')
    expect(userStatusOf('closed')).toBe('closed')
  })

  it('moves intents only inside their own lifecycle', () => {
    expect(nextOpsStatus('unclaimed', 'claim')).toBe('processing')
    expect(nextOpsStatus('processing', 'effect')).toBe('entitled')
    expect(() => nextOpsStatus('unclaimed', 'effect')).toThrow('仅处理中可确认权益生效')
    expect(() => nextOpsStatus('entitled', 'close')).toThrow('终态意向单不可关闭')
    expect(nextOpsStatus('processing', 'close')).toBe('closed')
  })
})
