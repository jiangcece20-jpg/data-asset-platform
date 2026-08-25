import type { Enterprise } from '@/types/domain'

export function buyerEnterpriseName(
  input: {
    ownerType?: 'personal' | 'enterprise'
    enterpriseId?: string
    requestedEnterpriseName?: string
  },
  enterprise: Pick<Enterprise, 'id' | 'name'>
): string {
  if (input.enterpriseId) {
    return input.enterpriseId === enterprise.id ? enterprise.name : input.enterpriseId
  }
  if (input.ownerType === 'personal') return '个人'
  if (input.requestedEnterpriseName?.trim()) return input.requestedEnterpriseName.trim()
  return '未确认'
}

export function operatorContactText(
  input: {
    contactName?: string
    contactPhone?: string
    operatorMemberId?: string
    personalOwnerId?: string
  },
  enterprise: Pick<Enterprise, 'members'>
): string {
  const memberId = input.operatorMemberId || input.personalOwnerId
  const member = enterprise.members.find((item) => item.id === memberId)
  const name = input.contactName?.trim() || member?.name
  const phone = input.contactPhone?.trim() || member?.phone
  if (name && phone) return `${name} · ${phone}`
  return name || phone || memberId || '—'
}
