export interface DemandLoginIdentity {
  name: string
  phone: string
  currentMemberId: string
}

export interface DemandSubmitterSnapshot {
  defaultContactName: string
  submitterAccount: string
  submitterUserId: string
}

/** Keep digits and at most one range hyphen; drop a leading hyphen. */
export function sanitizeDemandPriceRangeInput(raw: string): string {
  const digitsAndHyphens = raw.replace(/[^\d-]/g, '')
  let hyphenUsed = false
  let result = ''
  for (const char of digitsAndHyphens) {
    if (char === '-') {
      if (result.length === 0 || hyphenUsed) continue
      hyphenUsed = true
      result += char
      continue
    }
    result += char
  }
  return result
}

/** Empty is allowed. Otherwise a number or min-max range like 0-5000. */
export function isValidDemandPriceRange(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^\d+(-\d+)?$/.test(trimmed)
}

/** Ops views show the complete number; expand prototype masks like 138****2201. */
export function revealDemandPhoneForOps(value: string): string {
  return value.trim().replace(/(\d{3})\*{2,}(\d{4})/g, (_match, prefix: string, suffix: string) => `${prefix}0000${suffix}`)
}

export function resolveDemandSubmitterSnapshot(login: DemandLoginIdentity): DemandSubmitterSnapshot {
  const phone = login.phone.trim()
  return {
    defaultContactName: login.name,
    submitterAccount: phone ? revealDemandPhoneForOps(phone) : login.currentMemberId,
    submitterUserId: login.currentMemberId
  }
}
