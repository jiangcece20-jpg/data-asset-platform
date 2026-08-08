import { defineStore } from 'pinia'
import { seedEnterprise } from '@/data/seed'
import type { Enterprise, MemberTier, UserContext } from '@/types/domain'
import { now } from '@/utils/id'
import { useApiUsageBillsStore } from './apiUsageBills'
import { useSpaceOrderStore } from './spaceOrders'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'

export const useUserStore = defineStore('user', {
  state: () => ({
    context: {
      loggedIn: true,
      name: '陈静',
      phone: '138****2201',
      personalMember: false,
      memberExpiresAt: undefined,
      currentEnterpriseId: undefined,
      currentMemberId: 'mem-1',
      enterpriseAuthStatus: 'none',
      role: 'member'
    } as UserContext,
    enterprise: { ...seedEnterprise, members: seedEnterprise.members.map((m) => ({ ...m })) } as Enterprise,
    enterpriseAuthPending: false,
    enterpriseContextGeneration: 0
  }),
  getters: {
    isEnterpriseAuthenticated(state): boolean {
      return state.context.enterpriseAuthStatus === 'authenticated'
    },
    currentEnterpriseMember(state) {
      if (state.enterprise.id !== state.context.currentEnterpriseId) return undefined
      return state.enterprise.members.find((member) =>
        member.id === state.context.currentMemberId && member.status === 'active',
      )
    },
    enterpriseMemberFor(state) {
      return (enterpriseId: string, memberId: string) => {
        if (state.enterprise.id !== enterpriseId) return undefined
        return state.enterprise.members.find((member) => member.id === memberId && member.status === 'active')
      }
    }
  },
  actions: {
    grantPersonalMember(months = 12, tier: MemberTier = 'standard') {
      this.context.personalMember = true
      this.context.personalMemberTier = tier === 'premium' || this.context.personalMemberTier === 'premium'
        ? 'premium'
        : tier
      const d = new Date()
      d.setMonth(d.getMonth() + months)
      this.context.memberExpiresAt = d.toISOString().slice(0, 10)
    },
    startEnterpriseAuth() {
      this.context.enterpriseAuthStatus = 'pending'
      this.enterpriseAuthPending = true
    },
    completeEnterpriseAuth() {
      this.context.enterpriseAuthStatus = 'authenticated'
      this.setEnterpriseContext(this.enterprise.id)
      this.context.role = this.currentEnterpriseMember?.role ?? 'member'
      this.enterpriseAuthPending = false
      this.enterprise.status = 'active'
    },
    setEnterpriseContext(enterpriseId: string | undefined) {
      this.enterpriseContextGeneration += 1
      useApiUsageBillsStore().clearBills()
      useSpaceOrderStore().clearMirrors()
      useTrustedSpacePurchaseStore().invalidateAuthorization()
      this.context.currentEnterpriseId = enterpriseId
    },
    clearEnterpriseContext() {
      this.setEnterpriseContext(undefined)
      this.context.enterpriseAuthStatus = 'none'
      this.context.role = 'member'
    },
    inviteMember(name: string, phone: string) {
      this.enterprise.members.push({
        id: `mem-${Date.now()}`,
        name,
        phone,
        role: 'member',
        seatAssigned: false,
        status: 'invited'
      })
    },
    assignSeat(memberId: string) {
      const m = this.enterprise.members.find((x) => x.id === memberId)
      if (!m) return
      if (this.enterprise.seatsUsed >= this.enterprise.seatsTotal) {
        this.enterprise.status = 'seats_full'
        return
      }
      m.seatAssigned = true
      m.status = 'active'
      this.enterprise.seatsUsed += 1
    },
    revokeSeat(memberId: string) {
      const m = this.enterprise.members.find((x) => x.id === memberId)
      if (!m || !m.seatAssigned) return
      m.seatAssigned = false
      m.status = 'revoked'
      this.enterpriseContextGeneration += 1
      useApiUsageBillsStore().invalidateAuthorization()
      useTrustedSpacePurchaseStore().invalidateAuthorization()
      this.enterprise.seatsUsed = Math.max(0, this.enterprise.seatsUsed - 1)
      if (this.enterprise.status === 'seats_full') this.enterprise.status = 'active'
    },
    grantEnterpriseEntitlement(productId: string) {
      if (!this.enterprise.entitledProductIds.includes(productId)) {
        this.enterprise.entitledProductIds.push(productId)
      }
      this.enterprise.status = 'active'
    },
    updateEnterprisePurchasePolicy(policy: Partial<Enterprise['purchasePolicy']>) {
      if (this.currentEnterpriseMember?.role !== 'admin') throw new Error('仅企业管理员可修改采购策略')
      this.enterprise.purchasePolicy = { ...this.enterprise.purchasePolicy, ...policy }
    },
    switchMockEnterpriseMember(memberId: string) {
      const member = this.enterprise.members.find((item) => item.id === memberId && item.status === 'active')
      if (!member || !this.isEnterpriseAuthenticated) throw new Error('仅可切换至当前企业的有效成员')
      this.context.currentMemberId = member.id
      this.context.name = member.name
      this.context.role = member.role
      this.enterpriseContextGeneration += 1
    },
    renewEnterprise(months = 12) {
      const base = new Date(this.enterprise.expiresAt)
      base.setMonth(base.getMonth() + months)
      this.enterprise.expiresAt = base.toISOString().slice(0, 10)
      this.enterprise.status = 'active'
    },
    log(action: string) {
      // 占位：真实实现可接入埋点，原型中仅用于演示时间戳
      void now()
      void action
    }
  }
})
