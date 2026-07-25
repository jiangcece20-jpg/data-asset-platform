import { defineStore } from 'pinia'
import { genId } from '@/utils/id'
import type {
  SupplyTask,
  SupplyTaskStatus,
  SupplyDecision,
  DemandCallback,
  CallbackOutcome,
  SupplyTimelineEntry
} from '@/types/demandFlow'
import { canMergeDemand, canSplitSupplyTask, resolveReopen, resolveWithdrawal } from '@/domain/demandNormalization'
import { useDemandStore } from './demand'

const PUBLISHABLE: SupplyTaskStatus[] = ['planned', 'in_production']

export const useSupplyTaskStore = defineStore('supplyTasks', {
  state: () => ({
    tasks: [] as SupplyTask[],
    callbacks: [] as DemandCallback[],
    timeline: [] as SupplyTimelineEntry[]
  }),

  getters: {
    byId(state) {
      return (id: string) => state.tasks.find((t) => t.id === id)
    },
    callbacksFor(state) {
      return (taskId: string) => state.callbacks.filter((c) => c.supplyTaskId === taskId)
    },
    timelineFor(state) {
      return (taskId: string) => state.timeline.filter((e) => e.supplyTaskId === taskId)
    },
    openTasks(state) {
      return state.tasks.filter((t) => t.status !== 'published' && t.status !== 'cancelled')
    },
    callbacksForCustomer(state) {
      return (customerId: string) => state.callbacks.filter((c) => c.customerId === customerId)
    }
  },

  actions: {
    _log(taskId: string, type: SupplyTimelineEntry['type'], actor: string, detail: string) {
      this.timeline.push({ id: genId('stl'), supplyTaskId: taskId, type, actor, detail, createdAt: new Date().toISOString() })
    },

    // 聚合：把若干需求归并为一个供给任务。
    aggregateDemands(demandIds: string[], decision: SupplyDecision, owner: string, title: string): SupplyTask {
      const demand = useDemandStore()
      const taskId = genId('supply')
      // 合并校验：已归入其他任务或终态的需求不可合并。
      for (const id of demandIds) {
        const lead = demand.byId(id)
        if (!lead) throw new Error('需求不存在')
        if (!canMergeDemand({ ...lead, supplyTaskId: lead.supplyTaskId }, taskId)) {
          throw new Error('需求已归入其他供给任务')
        }
      }
      const nowIso = new Date().toISOString()
      const task: SupplyTask = {
        id: taskId,
        title,
        status: 'evaluating',
        decision,
        demandIds: [...demandIds],
        owner,
        createdAt: nowIso,
        updatedAt: nowIso
      }
      this.tasks.push(task)
      this._log(taskId, 'created', owner, `创建供给任务：${title}`)
      demandIds.forEach((id) => {
        demand.linkToTask(id, taskId)
        this._log(taskId, 'demand_linked', owner, `关联需求 ${id}`)
      })
      return task
    },

    splitSupplyTask(taskId: string, splitDemandIds: string[], owner: string, title: string): SupplyTask {
      const task = this.tasks.find((t) => t.id === taskId)
      if (!task) throw new Error('供给任务不存在')
      if (!canSplitSupplyTask(task.demandIds, splitDemandIds)) {
        throw new Error('供给任务至少保留两个需求才能拆分')
      }
      const demand = useDemandStore()
      const nowIso = new Date().toISOString()
      const newTask: SupplyTask = {
        id: genId('supply'),
        title,
        status: 'evaluating',
        decision: task.decision,
        demandIds: [...splitDemandIds],
        owner,
        createdAt: nowIso,
        updatedAt: nowIso
      }
      task.demandIds = task.demandIds.filter((id) => !splitDemandIds.includes(id))
      task.updatedAt = nowIso
      this.tasks.push(newTask)
      splitDemandIds.forEach((id) => demand.moveToTask(id, newTask.id))
      this._log(taskId, 'split', owner, `拆出 ${splitDemandIds.length} 个需求至 ${newTask.id}`)
      this._log(newTask.id, 'created', owner, `由 ${taskId} 拆分而来`)
      return newTask
    },

    changeDecision(taskId: string, decision: SupplyDecision, actor: string) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (!task) throw new Error('供给任务不存在')
      task.decision = decision
      task.updatedAt = new Date().toISOString()
      this._log(taskId, 'decision_changed', actor, `处置决策变更为 ${decision}`)
    },

    advanceStatus(taskId: string, status: SupplyTaskStatus, actor: string) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (!task) throw new Error('供给任务不存在')
      task.status = status
      task.updatedAt = new Date().toISOString()
      this._log(taskId, 'status_changed', actor, `状态变更为 ${status}`)
    },

    // 发布：关联商品 ID，为每个仍在订阅的需求生成独立回告通知。
    publish(taskId: string, productId: string, actor: string) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (!task) throw new Error('供给任务不存在')
      if (!PUBLISHABLE.includes(task.status)) throw new Error('仅规划或加工中的供给任务可发布')
      const demand = useDemandStore()
      task.publishedProductId = productId
      task.status = 'published'
      task.updatedAt = new Date().toISOString()
      this._log(taskId, 'published', actor, `发布商品 ${productId}`)
      task.demandIds.forEach((demandId) => {
        const lead = demand.byId(demandId)
        if (!lead || !lead.subscribed || lead.status === 'withdrawn') return
        this.callbacks.push({
          id: genId('cb'),
          supplyTaskId: taskId,
          demandId,
          customerId: lead.ownerId,
          status: 'pending',
          outcome: 'none',
          content: `您关注的需求已上架：${task.title}`,
          attempts: 0
        })
      })
    },

    markCallbackDelivered(callbackId: string, actor: string) {
      const cb = this.callbacks.find((c) => c.id === callbackId)
      if (!cb) throw new Error('回告不存在')
      cb.status = 'delivered'
      cb.deliveredAt = new Date().toISOString()
      this._log(cb.supplyTaskId, 'callback_delivered', actor, `回告已送达：${cb.customerId}`)
    },

    markCallbackFailed(callbackId: string, actor: string) {
      const cb = this.callbacks.find((c) => c.id === callbackId)
      if (!cb) throw new Error('回告不存在')
      if (cb.attempts >= 4) throw new Error('回告失败次数已达上限，请手动确认')
      cb.attempts += 1
      cb.status = 'failed'
    },

    markCallbackManualConfirmed(callbackId: string, actor: string, result: string) {
      const cb = this.callbacks.find((c) => c.id === callbackId)
      if (!cb) throw new Error('回告不存在')
      cb.status = 'manual_confirmed'
      cb.manualResult = result
      this._log(cb.supplyTaskId, 'callback_delivered', actor, `回告手动确认：${cb.customerId}`)
    },

    recordOutcome(callbackId: string, outcome: CallbackOutcome, actor: string) {
      const cb = this.callbacks.find((c) => c.id === callbackId)
      if (!cb) throw new Error('回告不存在')
      cb.outcome = outcome
      this._log(cb.supplyTaskId, 'callback_outcome', actor, `回告结果：${cb.customerId} → ${outcome}`)
    },

    // 撤回单条需求：共享任务只关闭该客户订阅与其待发回告；唯一需求则释放任务。
    withdrawDemand(demandId: string, actor: string) {
      const demand = useDemandStore()
      const lead = demand.byId(demandId)
      if (!lead) throw new Error('需求不存在')
      const taskId = lead.supplyTaskId
      const siblings = taskId ? demand.activeSiblingCount(taskId, demandId) : 0
      const decision = resolveWithdrawal({ ...lead, supplyTaskId: taskId }, siblings)
      demand.withdraw(demandId)
      // 取消该需求尚未送达的回告
      this.callbacks
        .filter((c) => c.demandId === demandId && c.status === 'pending')
        .forEach((c) => {
          c.status = 'manual_confirmed'
          c.manualResult = '客户已撤回需求'
        })
      if (taskId) {
        this._log(taskId, 'demand_unlinked', actor, `需求 ${demandId} 撤回（${decision}）`)
        if (decision === 'close_and_release') {
          const task = this.tasks.find((t) => t.id === taskId)
          if (task && task.status !== 'published') {
            task.status = 'cancelled'
            task.updatedAt = new Date().toISOString()
            this._log(taskId, 'cancelled', actor, '唯一需求撤回，供给任务释放')
          }
        }
      }
      return decision
    },

    reopenDemand(demandId: string, actor: string) {
      const demand = useDemandStore()
      const lead = demand.byId(demandId)
      if (!lead) throw new Error('需求不存在')
      const { priorConclusion } = resolveReopen({
        id: lead.id,
        objectDesc: lead.objectDesc,
        region: lead.region,
        timeRange: lead.timeRange,
        status: lead.status,
        supplyTaskId: lead.supplyTaskId,
        feedbackMessage: lead.feedbackMessage
      })
      return demand.reopen(demandId, priorConclusion)
    },

    cancelTask(taskId: string, actor: string, reason: string) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (!task) throw new Error('供给任务不存在')
      task.status = 'cancelled'
      task.updatedAt = new Date().toISOString()
      this._log(taskId, 'cancelled', actor, `供给任务取消：${reason}`)
    }
  }
})
