import { describe, expect, it } from 'vitest'
import {
  isValidDemandPriceRange,
  resolveDemandSubmitterSnapshot,
  revealDemandPhoneForOps,
  sanitizeDemandPriceRangeInput
} from './demandSubmitFields'

describe('sanitizeDemandPriceRangeInput', () => {
  it('keeps digits and a single range hyphen', () => {
    expect(sanitizeDemandPriceRangeInput('0-5000')).toBe('0-5000')
  })

  it('strips letters and extra symbols', () => {
    expect(sanitizeDemandPriceRangeInput('约500元')).toBe('500')
    expect(sanitizeDemandPriceRangeInput('0--5000')).toBe('0-5000')
  })

  it('does not keep a leading hyphen', () => {
    expect(sanitizeDemandPriceRangeInput('-500')).toBe('500')
  })
})

describe('isValidDemandPriceRange', () => {
  it('treats empty as valid because the field is optional', () => {
    expect(isValidDemandPriceRange('')).toBe(true)
    expect(isValidDemandPriceRange('   ')).toBe(true)
  })

  it('accepts a single number or a min-max range', () => {
    expect(isValidDemandPriceRange('500')).toBe(true)
    expect(isValidDemandPriceRange('0-5000')).toBe(true)
  })

  it('rejects unfinished or non-numeric ranges', () => {
    expect(isValidDemandPriceRange('0-')).toBe(false)
    expect(isValidDemandPriceRange('abc')).toBe(false)
  })
})

describe('resolveDemandSubmitterSnapshot', () => {
  const login = { name: '陈静', phone: '138****2201', currentMemberId: 'mem-1' }

  it('defaults contact name from the logged-in user', () => {
    expect(resolveDemandSubmitterSnapshot(login).defaultContactName).toBe('陈静')
  })

  it('records login phone as submitter account, independent of contact name', () => {
    expect(resolveDemandSubmitterSnapshot(login).submitterAccount).toBe('13800002201')
  })

  it('records the logged-in member id as submitter user id', () => {
    expect(resolveDemandSubmitterSnapshot(login).submitterUserId).toBe('mem-1')
  })

  it('falls back to member id when login has no phone', () => {
    expect(
      resolveDemandSubmitterSnapshot({ name: '陈静', phone: '', currentMemberId: 'mem-1' }).submitterAccount
    ).toBe('mem-1')
  })
})

describe('revealDemandPhoneForOps', () => {
  it('expands a masked mobile number for ops without changing a full number', () => {
    expect(revealDemandPhoneForOps('138****2201')).toBe('13800002201')
    expect(revealDemandPhoneForOps('13800002201')).toBe('13800002201')
    expect(revealDemandPhoneForOps('user@example.com')).toBe('user@example.com')
  })
})
