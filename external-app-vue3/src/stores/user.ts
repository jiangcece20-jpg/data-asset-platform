import { defineStore } from 'pinia'
import { seedEnterprise } from '@/data/seed'
import type { Enterprise, UserContext } from '@/types/domain'
import { now } from '@/utils/id'
import { useApiUsageBillsStore } from './apiUsageBills'

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
    enterpriseAuthPending: false
  }),
  getters: {
    isEnterpriseAuthenticated(state): boolean {
      return state.context.enterpriseAuthStatus === 'authenticated'
    },
    currentEnterpriseMember(state) {
      return state.enterprise.members.find((member) => member.id === state.context.currentMemberId)
    }
  },
  actions: {
    grantPersonalMember(months = 12) {
      this.context.personalMember = true
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
      if (this.context.currentEnterpriseId !== enterpriseId) useApiUsageBillsStore().clearBills()
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
      this.enterprise.seatsUsed = Math.max(0, this.enterprise.seatsUsed - 1)
      if (this.enterprise.status === 'seats_full') this.enterprise.status = 'active'
    },
    grantEnterpriseEntitlement(productId: string) {
      if (!this.enterprise.entitledProductIds.includes(productId)) {
        this.enterprise.entitledProductIds.push(productId)
      }
      this.enterprise.status = 'active'
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
