import { defineStore } from 'pinia'
import { seedEntitlements } from '@/data/seed'
import type { Entitlement, MemberTier, Product } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { memberTierCoversFree } from '@/domain/memberBenefits'
import { salePeriodMonthsOf } from '@/domain/commerceOffers'
import { useUserStore } from './user'
import { useCatalogStore } from './catalog'

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
      return state.list.some((e) =>
        e.source === 'personal'
        && e.type === 'member'
        && e.ownerId === user.context.currentMemberId
        && isActive(e, today),
      )
    },
    personalMemberTier(state): MemberTier | null {
      const user = useUserStore()
      const today = todayStr()
      const tiers = state.list
        .filter((e) =>
          e.source === 'personal'
          && e.type === 'member'
          && e.ownerId === user.context.currentMemberId
          && isActive(e, today),
        )
        .map((e) => e.memberTier || 'standard')
      if (tiers.includes('premium')) return 'premium'
      if (tiers.includes('standard')) return 'standard'
      return null
    },
    hasPersonalItem(state) {
      return (product: Product, today = todayStr()): boolean => {
        const user = useUserStore()
        return state.list.some((e) => {
          if (e.source !== 'personal' || e.type !== 'item' || e.ownerId !== user.context.currentMemberId || e.productId !== product.id) return false
          if (!isActive(e, today)) return false
          if (product.type === 'report') return e.productVersion === product.typeDetail.report?.version
          return true
        })
      }
    },
    currentPersonalEntitlements(state): Entitlement[] {
      const user = useUserStore()
      const today = todayStr()
      return state.list.filter((entitlement) =>
        entitlement.source === 'personal'
        && entitlement.ownerId === user.context.currentMemberId
        && isActive(entitlement, today),
      )
    },
    currentEnterpriseSeatEntitlements(state): Entitlement[] {
      const user = useUserStore()
      const enterpriseId = user.context.currentEnterpriseId
      if (user.context.enterpriseAuthStatus !== 'authenticated' || !enterpriseId) return []
      const member = user.enterpriseMemberFor(enterpriseId, user.context.currentMemberId)
      if (!member?.seatAssigned) return []
      const today = todayStr()
      return state.list.filter((entitlement) =>
        entitlement.source === 'enterprise'
        && entitlement.type === 'seat'
        && entitlement.ownerId === enterpriseId
        && entitlement.enterpriseId === enterpriseId
        && isActive(entitlement, today),
      )
    },
    hasEnterpriseSeatAccess(state) {
      return (productId: string) => {
        const user = useUserStore()
        const enterpriseId = user.context.currentEnterpriseId
        if (user.context.enterpriseAuthStatus !== 'authenticated' || !enterpriseId) return false
        const member = user.enterpriseMemberFor(enterpriseId, user.context.currentMemberId)
        if (!member?.seatAssigned || !user.enterprise.entitledProductIds.includes(productId)) return false
        return state.list.some((entitlement) =>
          entitlement.source === 'enterprise'
          && entitlement.type === 'seat'
          && entitlement.productId === productId
          && entitlement.ownerId === enterpriseId
          && entitlement.enterpriseId === enterpriseId
          && isActive(entitlement, todayStr()),
        )
      }
    },
    hasDatasetAccess(state) {
      return (productId: string, today = todayStr()): 'personal' | 'enterprise' | 'none' => {
        const user = useUserStore()
        const personal = state.list.some((entitlement) =>
          entitlement.type === 'dataset'
          && entitlement.source === 'personal'
          && entitlement.ownerId === user.context.currentMemberId
          && entitlement.productId === productId
          && isActive(entitlement, today),
        )
        if (personal) return 'personal'
        const enterpriseId = user.context.currentEnterpriseId
        if (!enterpriseId || user.context.enterpriseAuthStatus !== 'authenticated') return 'none'
        const memberId = user.context.currentMemberId
        const enterprise = state.list.some((entitlement) =>
          entitlement.type === 'dataset'
          && entitlement.source === 'enterprise'
          && entitlement.enterpriseId === enterpriseId
          && entitlement.productId === productId
          && isActive(entitlement, today)
          && (entitlement.accessScope === 'enterprise_wide'
            || user.currentEnterpriseMember?.role === 'admin'
            || entitlement.assignedMemberIds?.includes(memberId)),
        )
        return enterprise ? 'enterprise' : 'none'
      }
    },
    visibleDatasetEntitlements(state): Entitlement[] {
      const user = useUserStore()
      const enterpriseId = user.context.currentEnterpriseId
      return state.list.filter((entitlement) => {
        if (entitlement.type !== 'dataset') return false
        if (entitlement.source === 'personal') return entitlement.ownerId === user.context.currentMemberId
        if (!enterpriseId || entitlement.enterpriseId !== enterpriseId) return false
        return user.currentEnterpriseMember?.role === 'admin'
          || entitlement.accessScope === 'enterprise_wide'
          || entitlement.assignedMemberIds?.includes(user.context.currentMemberId)
      })
    },
    // 权益判断顺序：会员（仅当商品包含 member）> 当前版本/期限单品权益 > 企业席位 > 无权限
    accessLevel(state) {
      return (product: Product, today = todayStr()): 'member' | 'item' | 'enterprise' | 'none' => {
        if (product.type === 'dataset') {
          const datasetAccess = this.hasDatasetAccess(product.id, today)
          if (datasetAccess === 'personal') return 'item'
          if (datasetAccess === 'enterprise') return 'enterprise'
        }
        if (product.acquisitions.includes('member') && this.hasPersonalMember && memberTierCoversFree(product, this.personalMemberTier)) return 'member'
        if (this.hasPersonalItem(product, today)) return 'item'
        if (this.hasEnterpriseSeatAccess(product.id)) return 'enterprise'
        return 'none'
      }
    }
  },
  actions: {
    grantMember(months = 12, tier: MemberTier = 'standard') {
      const user = useUserStore()
      user.grantPersonalMember(months, tier)
      this.list.push({
        id: genId('ent'),
        source: 'personal',
        type: 'member',
        memberTier: tier,
        ownerId: user.context.currentMemberId,
        validFrom: now(),
        validTo: plusMonths(months),
        status: 'active'
      })
    },
    grantItem(product: Product, ownerMemberId: string, options?: { offerId?: string; serviceMode?: 'one_time' | 'continuous'; termMonths?: number; orderId?: string }) {
      const isReport = product.type === 'report'
      const months = options?.termMonths || salePeriodMonthsOf(product)
      const continuous = options?.serviceMode === 'continuous'
      const termEnd = plusMonths(months)
      this.list.push({
        id: genId('ent'),
        source: 'personal',
        type: 'item',
        ownerId: ownerMemberId,
        productId: product.id,
        productVersion: isReport ? product.typeDetail.report?.version : undefined,
        orderId: options?.orderId,
        commerceOfferId: options?.offerId,
        serviceMode: options?.serviceMode,
        selectedTermMonths: options?.termMonths,
        validFrom: now(),
        validTo: termEnd,
        updateValidTo: isReport && continuous ? termEnd : undefined,
        status: 'active'
      })
    },
    grantEnterpriseSeat(productId: string, enterpriseId: string, options?: { offerId?: string; serviceMode?: 'one_time' | 'continuous'; termMonths?: number; orderId?: string }) {
      const user = useUserStore()
      user.grantEnterpriseEntitlement(productId)
      this.list.push({
        id: genId('ent'),
        source: 'enterprise',
        type: 'seat',
        ownerId: enterpriseId,
        productId,
        enterpriseId,
        orderId: options?.orderId,
        commerceOfferId: options?.offerId,
        serviceMode: options?.serviceMode,
        selectedTermMonths: options?.termMonths,
        validFrom: now(),
        validTo: options?.termMonths ? plusMonths(options.termMonths) : undefined,
        status: 'active'
      })
    },
    grantDatasetPending(options: {
      product: Product
      orderId: string
      ownerType: 'personal' | 'enterprise'
      ownerId: string
      operatorMemberId: string
      offerId: string
      selectedTermMonths?: number
    }) {
      const offer = options.product.datasetOffers?.find((item) => item.id === options.offerId)
      if (!offer) throw new Error('数据集销售方案不存在')
      const months = options.selectedTermMonths || salePeriodMonthsOf(options.product)
      const updateValidTo = offer.licenseKind === 'subscription'
        ? plusMonths(months)
        : undefined
      const entitlement: Entitlement = {
        id: genId('ent-dataset'),
        source: options.ownerType,
        type: 'dataset',
        ownerId: options.ownerId,
        enterpriseId: options.ownerType === 'enterprise' ? options.ownerId : undefined,
        productId: options.product.id,
        orderId: options.orderId,
        datasetOfferId: offer.id,
        commerceOfferId: offer.id,
        serviceMode: offer.licenseKind === 'subscription' ? 'continuous' : 'one_time',
        selectedTermMonths: options.selectedTermMonths,
        licenseKind: offer.licenseKind,
        assetVersion: options.product.assetSnapshot?.assetVersion,
        accessScope: offer.accessScope,
        assignedMemberIds: [options.operatorMemberId],
        allowDownload: offer.allowDownload,
        validFrom: now(),
        validTo: offer.licenseKind === 'subscription' ? undefined : plusMonths(months),
        updateValidTo,
        status: 'pending'
      }
      this.list.push(entitlement)
      return entitlement
    },
    activateDataset(entitlementId: string, biDeliveryId: string) {
      const entitlement = this.list.find((item) => item.id === entitlementId && item.type === 'dataset')
      if (!entitlement) throw new Error('数据集权益不存在')
      entitlement.biDeliveryId = biDeliveryId
      entitlement.status = 'active'
      if (entitlement.source === 'enterprise' && entitlement.productId) {
        useUserStore().grantEnterpriseEntitlement(entitlement.productId)
      }
      return entitlement
    },
    assignDatasetMembers(entitlementId: string, memberIds: string[]) {
      const entitlement = this.list.find((item) => item.id === entitlementId && item.type === 'dataset')
      if (!entitlement || entitlement.source !== 'enterprise') throw new Error('仅企业数据权益可分配成员')
      const user = useUserStore()
      if (user.currentEnterpriseMember?.role !== 'admin') throw new Error('仅企业管理员可分配数据权益')
      const activeMemberIds = new Set(user.enterprise.members.filter((item) => item.status === 'active').map((item) => item.id))
      const next = [...new Set(memberIds)].filter((id) => activeMemberIds.has(id))
      const product = entitlement.productId ? useCatalogStore().byId(entitlement.productId) : undefined
      const offer = product?.datasetOffers?.find((item) => item.id === entitlement.datasetOfferId)
      if (offer?.accessScope === 'named_seats' && offer.seats != null && next.length > offer.seats) throw new Error(`最多可分配 ${offer.seats} 个成员`)
      entitlement.assignedMemberIds = next
      return entitlement
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
