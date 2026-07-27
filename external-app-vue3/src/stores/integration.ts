import { defineStore } from 'pinia'
import { genId } from '@/utils/id'
import type {
  ConnectorEvent,
  ConnectorRepairRevision,
  Connector,
  PipelineDecision
} from '@/types/configGovernance'
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
  payloadFingerprint?: string
}

function subjectKey(connector: Connector, subjectId: string, eventType: string): string {
  return `${connector}:${subjectId}:${eventType}`
}

function matchesIncomingEvent(event: ConnectorEvent, input: IncomingEvent): boolean {
  return (
    event.connector === input.connector
    && event.subjectId === input.subjectId
    && event.eventType === input.eventType
    && event.eventVersion === input.eventVersion
    && event.idempotencyKey === input.idempotencyKey
    && event.signatureValid === input.signatureValid
    && event.purchaseIntentId === input.purchaseIntentId
    && event.spaceEnterpriseId === input.spaceEnterpriseId
    && event.spaceProductNo === input.spaceProductNo
    && event.payloadFingerprint === input.payloadFingerprint
  )
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
    processingVersions: {} as Record<string, number>,
    repairRevisions: [] as ConnectorRepairRevision[]
  }),
  getters: {
    deadLetters(state) {
      return state.events.filter((e) => e.status === 'dead_letter')
    },
    byId(state) {
      return (id: string) => state.events.find((e) => e.id === id)
    },
    byIdempotencyKey(state) {
      return (idempotencyKey: string) => state.events.find((event) => event.idempotencyKey === idempotencyKey)
    }
  },
  actions: {
    matchesIdempotentPayload(input: IncomingEvent): boolean {
      const existing = this.events.find((event) => event.idempotencyKey === input.idempotencyKey)
      return !existing || matchesIncomingEvent(existing, input)
    },

    applyAndCommitEvent(
      input: IncomingEvent,
      event: ConnectorEvent,
      apply: () => boolean
    ): { decision: PipelineDecision; event: ConnectorEvent } {
      try {
        if (!apply()) {
          event.failureReason = '业务镜像写入失败'
          return { decision: this.failEvent(event.id).outcome, event }
        }
      } catch (error) {
        event.failureReason = error instanceof Error ? error.message : '业务镜像写入失败'
        return { decision: this.failEvent(event.id).outcome, event }
      }

      const key = subjectKey(input.connector, input.subjectId, input.eventType)
      this.processingVersions[key] = input.eventVersion
      event.processingVersion = input.eventVersion
      event.status = 'processed'
      delete event.failureReason
      return { decision: 'process', event }
    },

    processEvent(
      input: IncomingEvent,
      apply: () => boolean
    ): { decision: PipelineDecision; event: ConnectorEvent } {
      const key = subjectKey(input.connector, input.subjectId, input.eventType)
      const existing = this.events.find((event) => event.idempotencyKey === input.idempotencyKey)
      if (existing) {
        if (!matchesIncomingEvent(existing, input)) {
          return { decision: 'retry_payload_rejected', event: existing }
        }
        if (existing.status === 'processed') {
          return { decision: 'duplicate_noop', event: existing }
        }
        if (existing.status === 'dead_letter') {
          return { decision: 'dead_letter', event: existing }
        }
        if (existing.status === 'retrying') {
          const retryDecision = decideEvent({
            signatureValid: input.signatureValid,
            eventVersion: input.eventVersion,
            currentProcessingVersion: this.processingVersions[key],
            idempotencyKeySeen: false
          })
          if (retryDecision !== 'process') return { decision: retryDecision, event: existing }
          return this.applyAndCommitEvent(input, existing, apply)
        }

        const permanentDecision = decideEvent({
          signatureValid: input.signatureValid,
          eventVersion: input.eventVersion,
          currentProcessingVersion: this.processingVersions[key],
          idempotencyKeySeen: false
        })
        return { decision: permanentDecision, event: existing }
      }

      const decision = decideEvent({
        signatureValid: input.signatureValid,
        eventVersion: input.eventVersion,
        currentProcessingVersion: this.processingVersions[key],
        idempotencyKeySeen: false
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
        payloadFingerprint: input.payloadFingerprint,
        status: 'received',
        attempts: 0,
        processingVersion: this.processingVersions[key] ?? 0,
        createdAt: new Date().toISOString()
      }
      this.events.push(event)
      if (decision !== 'process') return { decision, event }
      return this.applyAndCommitEvent(input, event, apply)
    },

    // 权威主动对账是死信恢复的显式入口；普通重复回调不能调用该路径。
    processAuthoritativeEvent(
      input: IncomingEvent,
      apply: () => boolean
    ): { decision: PipelineDecision; event: ConnectorEvent } {
      const existing = this.events.find((event) => event.idempotencyKey === input.idempotencyKey)
      if (!existing || existing.status !== 'dead_letter') {
        return this.processEvent(input, apply)
      }
      if (!matchesIncomingEvent(existing, input)) {
        return { decision: 'retry_payload_rejected', event: existing }
      }
      const key = subjectKey(input.connector, input.subjectId, input.eventType)
      const retryDecision = decideEvent({
        signatureValid: input.signatureValid,
        eventVersion: input.eventVersion,
        currentProcessingVersion: this.processingVersions[key],
        idempotencyKeySeen: false
      })
      if (retryDecision !== 'process') return { decision: retryDecision, event: existing }
      return this.applyAndCommitEvent(input, existing, apply)
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
        payloadFingerprint: input.payloadFingerprint,
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

    // 人工处置只记录审计修订和工单；空间事实与业务版本必须由权威事件对账推进。
    repair(
      eventId: string,
      actor: string,
      reviewAt: string
    ): { repairRevisionId: string; workOrderId: string; status: 'audit_recorded' } {
      const event = this.events.find((e) => e.id === eventId)
      if (!event) throw new Error('事件不存在')
      if (event.status !== 'dead_letter') throw new Error('仅死信事件可记录人工处置')
      const existing = this.repairRevisions.find((revision) => revision.eventId === eventId)
      if (existing) {
        return {
          repairRevisionId: existing.id,
          workOrderId: existing.workOrderId,
          status: existing.status
        }
      }

      const wo = useReverseWorkOrderStore()
      const result = wo.createWorkOrder({
        subjectId: event.id,
        subjectType: 'integration',
        action: 'reconcile',
        reason: 'config_error',
        reasonDetail: `连接器 ${event.connector} 事件 ${event.eventType} 人工审计处置`,
        severity: 'S2',
        impact: emptyImpact(event.id),
        entitlementTreatment: 'keep',
        treatmentSummary: '仅记录审计处置；空间事实须通过可信空间主动对账写入',
        createdBy: actor,
        owner: actor,
        reviewAt,
        customerNoticeContent: '',
        taskTemplate: ['reconcile_state']
      })
      const revision: ConnectorRepairRevision = {
        id: genId('repairrev'),
        eventId,
        revision: 1,
        status: 'audit_recorded',
        workOrderId: result.workOrder.id,
        actor,
        createdAt: new Date().toISOString()
      }
      this.repairRevisions.push(revision)
      event.workOrderId = result.workOrder.id
      event.repairRevisionId = revision.id
      return {
        repairRevisionId: revision.id,
        workOrderId: result.workOrder.id,
        status: revision.status
      }
    }
  }
})
