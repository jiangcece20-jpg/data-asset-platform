import { defineStore } from 'pinia'
import { seedEntitlements } from '@/data/seed'
import type { Entitlement, Product } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useUserStore } from './user'

function plusMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function isActive(entitlement: Entitlement, today: string): boolean {
  return entitlement.status === 'active' && (!entitlement.validTo || entitlement.validTo >= today)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useEntitlementStore = defineStore('entitlements', {
  state: () => ({
    list: seedEntitlements.map((e) => ({ ...e })) as Entitlement[]
  }),
  getters: {
    hasPersonalMember(state): boolean {
      const user = useUserStore()
      const today = todayStr()
      return user.context.personalMember || state.list.some((e) => e.source === 'personal' && e.type === 'member' && isActive(e, today))
    },
    hasPersonalItem(state) {
      return (product: Product, today = todayStr()): boolean =>
        state.list.some((e) => {
          if (e.source !== 'personal' || e.type !== 'item' || e.productId !== product.id) return false
          if (!isActive(e, today)) return false
          if (product.type === 'report') return e.productVersion === product.typeDetail.report?.version
          return true
        })
    },
    hasEnterpriseSeatAccess(state) {
      return (productId: string) => {
        const user = useUserStore()
        if (user.context.enterpriseAuthStatus !== 'authenticated') return false
        const seat = user.enterprise.members.find((m) => m.id === user.context.currentMemberId && m.seatAssigned)
        if (!seat) return false
        return user.enterprise.entitledProductIds.includes(productId)
      }
    },
    // 权益判断顺序：会员（仅当商品包含 member）> 当前版本/期限单品权益 > 企业席位 > 无权限
    accessLevel(state) {
      return (product: Product, today = todayStr()): 'member' | 'item' | 'enterprise' | 'none' => {
        if (product.acquisitions.includes('member') && this.hasPersonalMember) return 'member'
        if (this.hasPersonalItem(product, today)) return 'item'
        if (this.hasEnterpriseSeatAccess(product.id)) return 'enterprise'
        return 'none'
      }
    }
  },
  actions: {
    grantMember(months = 12) {
      const user = useUserStore()
      user.grantPersonalMember(months)
      this.list.push({
        id: genId('ent'),
        source: 'personal',
        type: 'member',
        ownerId: user.context.currentMemberId,
        validFrom: now(),
        validTo: plusMonths(months),
        status: 'active'
      })
    },
    grantItem(product: Product, ownerMemberId: string) {
      const isReport = product.type === 'report'
      const isDashboard = product.type === 'dashboard'
      const months = isDashboard && product.entitlementPolicy?.kind === 'term'
        ? product.entitlementPolicy.months
        : 12
      this.list.push({
        id: genId('ent'),
        source: 'personal',
        type: 'item',
        ownerId: ownerMemberId,
        productId: product.id,
        productVersion: isReport ? product.typeDetail.report?.version : undefined,
        validFrom: now(),
        validTo: isReport ? undefined : plusMonths(months),
        status: 'active'
      })
    },
    grantEnterpriseSeat(productId: string, enterpriseId: string) {
      const user = useUserStore()
      user.grantEnterpriseEntitlement(productId)
      this.list.push({
        id: genId('ent'),
        source: 'enterprise',
        type: 'seat',
        ownerId: enterpriseId,
        productId,
        enterpriseId,
        validFrom: now(),
        validTo: user.enterprise.expiresAt,
        status: 'active'
      })
    },
    freezeByProduct(productId: string, workOrderId: string) {
      this.list
        .filter((e) => e.productId === productId && e.status === 'active')
        .forEach((e) => {
          e.status = 'frozen'
          e.reverseWorkOrderId = workOrderId
        })
    },
    markMigratingByProduct(productId: string, workOrderId: string) {
      this.list
        .filter((e) => e.productId === productId && e.status === 'active')
        .forEach((e) => {
          e.status = 'migrating'
          e.reverseWorkOrderId = workOrderId
        })
    },
    restoreByWorkOrder(workOrderId: string) {
      this.list
        .filter((e) => e.reverseWorkOrderId === workOrderId && e.status === 'frozen')
        .forEach((e) => {
          e.status = 'active'
          e.reverseWorkOrderId = undefined
        })
    },

    // ── 退款排序（§9.3）：先冻结，退款成功后才撤销；失败恢复。────
    freezeForRefund(entitlementId: string, refundId: string) {
      const ent = this.list.find((e) => e.id === entitlementId)
      if (ent && ent.status === 'active') {
        ent.status = 'frozen'
        ent.refundId = refundId
      }
    },
    revokeByRefund(refundId: string) {
      this.list
        .filter((e) => e.refundId === refundId)
        .forEach((e) => {
          e.status = 'revoked'
        })
    },
    // 退款失败/驳回恢复；若存在独立合规冻结（reverseWorkOrderId），保持冻结。
    restoreForRefund(refundId: string) {
      this.list
        .filter((e) => e.refundId === refundId && e.status === 'frozen')
        .forEach((e) => {
          if (e.reverseWorkOrderId) return
          e.status = 'active'
          e.refundId = undefined
        })
    },
    // 企业合同终止批量收回席位（§9.4）
    reclaimSeatsByContract(productId: string, enterpriseId: string) {
      this.list
        .filter((e) => e.type === 'seat' && e.productId === productId && e.enterpriseId === enterpriseId && (e.status === 'active' || e.status === 'frozen'))
        .forEach((e) => {
          e.status = 'revoked'
        })
    },
    reclaimSingleSeat(entitlementId: string) {
      const ent = this.list.find((e) => e.id === entitlementId && e.type === 'seat')
      if (ent) ent.status = 'revoked'
    },
    // 迁移优先：先授予替代权益并验证可用，再撤销原权益（§10.3）
    migrateThenRevoke(oldEntitlementId: string, replacement: Entitlement) {
      this.list.push({ ...replacement, status: 'active' })
      const old = this.list.find((e) => e.id === oldEntitlementId)
      if (old) old.status = 'revoked'
    }
  }
})
