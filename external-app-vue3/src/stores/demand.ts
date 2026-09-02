import { defineStore } from 'pinia'
import { seedDemands } from '@/data/seed'
import { resolveDemandSubmitterSnapshot, revealDemandPhoneForOps } from '@/domain/demandSubmitFields'
import type { DemandLead, DemandSource, DemandStatus } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useUserStore } from './user'

export interface DemandSubmitPayload {
  question: string
  filters: string[]
  browsedProductIds: string[]
  objectDesc: string
  region: string
  timeRange: string
  updateFreq: string
  scenario: string
  expectedDelivery: string
  priceRange?: string
  contact?: string
  contactName?: string
  ownerId?: string
  source?: DemandSource
}

function submitEnterpriseName(user: ReturnType<typeof useUserStore>): string {
  return user.isEnterpriseAuthenticated ? user.enterprise.name : '个人'
}

function submitterSnapshot(user: ReturnType<typeof useUserStore>, contactName?: string, contact?: string) {
  const snapshot = resolveDemandSubmitterSnapshot(user.context)
  return {
    contactName: contactName?.trim() || snapshot.defaultContactName,
    contact: contact !== undefined ? revealDemandPhoneForOps(contact) : contact,
    submitterAccount: snapshot.submitterAccount,
    submitterUserId: snapshot.submitterUserId
  }
}

export interface BridgeListingPayload {
  productId: string
  productName: string
  ownerId: string
  objectDesc: string
  region: string
  timeRange: string
  updateFreq: string
  scenario: string
  expectedDelivery: string
}

export const useDemandStore = defineStore('demand', {
  state: () => ({
    list: seedDemands.map((d) => ({ ...d })) as DemandLead[]
  }),
  getters: {
    byId(state) {
      return (id: string) => state.list.find((d) => d.id === id)
    },
    byTask(state) {
      return (taskId: string) => state.list.filter((d) => d.supplyTaskId === taskId)
    },
    byOwner(state) {
      return (ownerId: string) => state.list.filter((d) => d.ownerId === ownerId)
    },
    // 供给任务上仍在订阅、未撤回的其他需求数（用于撤回语义判断）
    activeSiblingCount(state) {
      return (taskId: string, excludeId: string) =>
        state.list.filter(
          (d) =>
            d.supplyTaskId === taskId &&
            d.id !== excludeId &&
            d.subscribed &&
            d.status !== 'withdrawn'
        ).length
    }
  },
  actions: {
    submit(payload: DemandSubmitPayload) {
      const user = useUserStore()
      const { ownerId, source, contactName, contact, ...rest } = payload
      const lead: DemandLead = {
        id: genId('demand'),
        ...rest,
        ...submitterSnapshot(user, contactName, contact),
        enterpriseName: submitEnterpriseName(user),
        status: 'new',
        recommendedProductIds: [],
        feedbackMessage: '',
        createdAt: now(),
        ownerId: ownerId ?? user.context.currentMemberId,
        source: source ?? 'search_miss',
        subscribed: true
      }
      this.list.push(lead)
      return lead
    },
    updateStatus(id: string, status: DemandStatus, feedbackMessage?: string, recommendedProductIds?: string[]) {
      const lead = this.list.find((x) => x.id === id)
      if (!lead) return
      lead.status = status
      if (feedbackMessage !== undefined) lead.feedbackMessage = feedbackMessage
      if (recommendedProductIds) lead.recommendedProductIds = recommendedProductIds
    },

    // ── 需求回流闭环 actions（§7.4、§11.2）────────────────────────
    // 归入供给任务（聚合），标记为处理中。原记录保留。
    linkToTask(demandId: string, taskId: string) {
      const lead = this.list.find((d) => d.id === demandId)
      if (!lead) return
      lead.supplyTaskId = taskId
      lead.status = 'aggregated'
    },
    // 拆分时改挂到新任务（保持聚合态）
    moveToTask(demandId: string, taskId: string) {
      const lead = this.list.find((d) => d.id === demandId)
      if (!lead) return
      lead.supplyTaskId = taskId
    },
    // 撤回：仅关闭该客户订阅与后续通知；不物理删除。
    withdraw(demandId: string) {
      const lead = this.list.find((d) => d.id === demandId)
      if (!lead) return
      lead.status = 'withdrawn'
      lead.subscribed = false
    },
    // 终态重开：基于原需求创建新需求，保留原结论，不改动终态原记录。
    reopen(demandId: string, priorConclusion: string): DemandLead | undefined {
      const source = this.list.find((d) => d.id === demandId)
      if (!source) return undefined
      const reopened: DemandLead = {
        ...source,
        id: genId('demand'),
        status: 'reopened',
        supplyTaskId: undefined,
        mergedIntoId: undefined,
        reopenedFromId: source.id,
        priorConclusion,
        feedbackMessage: '',
        subscribed: true,
        createdAt: now()
      }
      this.list.push(reopened)
      return reopened
    },
    // 求上架桥接为需求记录，使回流可同时聚合两类来源（同客户不重复）。
    bridgeFromListing(payload: BridgeListingPayload): DemandLead {
      const existing = this.list.find(
        (d) =>
          d.source === 'listing_request' &&
          d.ownerId === payload.ownerId &&
          d.browsedProductIds.includes(payload.productId) &&
          d.status !== 'withdrawn'
      )
      if (existing) return existing
      const user = useUserStore()
      const lead: DemandLead = {
        id: genId('demand'),
        question: `求上架：${payload.productName}`,
        filters: [],
        browsedProductIds: [payload.productId],
        objectDesc: payload.objectDesc,
        region: payload.region,
        timeRange: payload.timeRange,
        updateFreq: payload.updateFreq,
        scenario: payload.scenario,
        expectedDelivery: payload.expectedDelivery,
        ...submitterSnapshot(user),
        enterpriseName: submitEnterpriseName(user),
        status: 'new',
        recommendedProductIds: [],
        feedbackMessage: '',
        createdAt: now(),
        ownerId: payload.ownerId,
        source: 'listing_request',
        subscribed: true
      }
      this.list.push(lead)
      return lead
    }
  }
})
