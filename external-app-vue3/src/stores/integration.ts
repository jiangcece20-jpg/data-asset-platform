import { defineStore } from 'pinia'
import { genId } from '@/utils/id'
import type { ConnectorEvent, Connector, PipelineDecision } from '@/types/configGovernance'
import type { ImpactSnapshot } from '@/types/reverseFlow'
import { decideEvent, decideAfterFailure } from '@/domain/integrationPipeline'
import { useReverseWorkOrderStore } from './reverseWorkOrders'

export interface IncomingEvent {
  connector: Connector
  subjectId: string
  eventType: string
  eventVersion: number
  idempotencyKey: string
  signatureValid: boolean
  purchaseIntentId?: string
  spaceEnterpriseId?: string
  spaceProductNo?: string
}

function subjectKey(connector: Connector, subjectId: string, eventType: string): string {
  return `${connector}:${subjectId}:${eventType}`
}

function emptyImpact(subjectId: string): ImpactSnapshot {
  return {
    id: genId('impact'),
    productId: subjectId,
    createdAt: new Date().toISOString(),
    customerIds: [],
    inFlightOrderIds: [],
    activeEntitlementIds: [],
    enterpriseMemberIds: [],
    trialIds: [],
    listingRequestIds: [],
    catalogReferenceIds: [],
    contractIds: [],
    isComplete: true
  }
}

export const useIntegrationStore = defineStore('integration', {
  state: () => ({
    events: [] as ConnectorEvent[],
    processingVersions: {} as Record<string, number>
  }),
  getters: {
    deadLetters(state) {
      return state.events.filter((e) => e.status === 'dead_letter')
    },
    byId(state) {
      return (id: string) => state.events.find((e) => e.id === id)
    }
  },
  actions: {
    processEvent(input: IncomingEvent): { decision: PipelineDecision; event: ConnectorEvent } {
      const key = subjectKey(input.connector, input.subjectId, input.eventType)
      const seen = this.events.some((e) => e.idempotencyKey === input.idempotencyKey)
      const decision = decideEvent({
        signatureValid: input.signatureValid,
        eventVersion: input.eventVersion,
        currentProcessingVersion: this.processingVersions[key],
        idempotencyKeySeen: seen
      })
      const event: ConnectorEvent = {
        id: genId('cevt'),
        connector: input.connector,
        subjectId: input.subjectId,
        eventType: input.eventType,
        eventVersion: input.eventVersion,
        idempotencyKey: input.idempotencyKey,
        signatureValid: input.signatureValid,
        purchaseIntentId: input.purchaseIntentId,
        spaceEnterpriseId: input.spaceEnterpriseId,
        spaceProductNo: input.spaceProductNo,
        status: decision === 'process' ? 'processed' : 'received',
        attempts: 0,
        processingVersion: this.processingVersions[key] ?? 0,
        createdAt: new Date().toISOString()
      }
      if (decision === 'process') {
        this.processingVersions[key] = input.eventVersion
        event.processingVersion = input.eventVersion
      }
      this.events.push(event)
      return { decision, event }
    },

    // 业务关联校验拒绝的事件需要留痕并进入失败治理，但不能推进对象处理版本。
    recordRejectedEvent(input: IncomingEvent): ConnectorEvent {
      const existing = this.events.find((event) => event.idempotencyKey === input.idempotencyKey)
      if (existing) return existing
      const key = subjectKey(input.connector, input.subjectId, input.eventType)
      const event: ConnectorEvent = {
        id: genId('cevt'),
        connector: input.connector,
        subjectId: input.subjectId,
        eventType: input.eventType,
        eventVersion: input.eventVersion,
        idempotencyKey: input.idempotencyKey,
        signatureValid: input.signatureValid,
        purchaseIntentId: input.purchaseIntentId,
        spaceEnterpriseId: input.spaceEnterpriseId,
        spaceProductNo: input.spaceProductNo,
        status: 'received',
        attempts: 0,
        processingVersion: this.processingVersions[key] ?? 0,
        createdAt: new Date().toISOString()
      }
      this.events.push(event)
      return event
    },

    // 处理失败：累计重试，超阈值进入死信队列。
    failEvent(eventId: string): { outcome: 'retry' | 'dead_letter' } {
      const event = this.events.find((e) => e.id === eventId)
      if (!event) throw new Error('事件不存在')
      event.attempts += 1
      const outcome = decideAfterFailure(event.attempts)
      event.status = outcome === 'dead_letter' ? 'dead_letter' : 'retrying'
      return { outcome }
    },

    // 人工修正：写入高于旧事件的处理版本，开集成工单；之后旧事件会被判为 stale。
    repair(eventId: string, actor: string, reviewAt: string): { workOrderId: string } {
      const event = this.events.find((e) => e.id === eventId)
      if (!event) throw new Error('事件不存在')
      const key = subjectKey(event.connector, event.subjectId, event.eventType)
      const newVersion = Math.max(this.processingVersions[key] ?? 0, event.eventVersion) + 1
      this.processingVersions[key] = newVersion
      event.processingVersion = newVersion
      event.status = 'repaired'

      const wo = useReverseWorkOrderStore()
      const result = wo.createWorkOrder({
        subjectId: event.id,
        subjectType: 'integration',
        action: 'manual_repair',
        reason: 'config_error',
        reasonDetail: `连接器 ${event.connector} 事件 ${event.eventType} 人工修正`,
        severity: 'S2',
        impact: emptyImpact(event.id),
        entitlementTreatment: 'keep',
        treatmentSummary: '人工修正并写入更高处理版本',
        createdBy: actor,
        owner: actor,
        reviewAt,
        customerNoticeContent: '',
        taskTemplate: ['manual_repair', 'reconcile_state']
      })
      event.workOrderId = result.workOrder.id
      return { workOrderId: result.workOrder.id }
    }
  }
})
