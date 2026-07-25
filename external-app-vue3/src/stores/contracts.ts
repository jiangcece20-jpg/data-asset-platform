import { defineStore } from 'pinia'
import type { EnterpriseContract } from '@/types/afterSales'
import type { Entitlement } from '@/types/domain'
import { useEntitlementStore } from './entitlements'

export const useContractStore = defineStore('contracts', {
  state: () => ({
    list: [] as EnterpriseContract[]
  }),
  getters: {
    byId(state) {
      return (id: string) => state.list.find((c) => c.id === id)
    }
  },
  actions: {
    // 发起终止：停止续费与新增席位，保留至终止日。
    terminateContract(contractId: string, effectiveTo: string) {
      const contract = this.list.find((c) => c.id === contractId)
      if (!contract) throw new Error('合同不存在')
      contract.status = 'terminating'
      contract.effectiveTo = effectiveTo
    },

    // 到达终止日：撤销企业权益、批量收回席位；要求管理员+成员双层通知。
    finalizeContract(contractId: string): { requiresTwoLayerNotice: boolean } {
      const contract = this.list.find((c) => c.id === contractId)
      if (!contract) throw new Error('合同不存在')
      if (contract.status !== 'terminating') throw new Error('合同未进入终止流程')
      contract.status = 'terminated'
      useEntitlementStore().reclaimSeatsByContract(contract.productId, contract.enterpriseId)
      return { requiresTwoLayerNotice: true }
    },

    // 单成员退出：只收回该席位，不改变企业套餐与其他席位。
    removeMember(contractId: string, seatEntitlementId: string) {
      const contract = this.list.find((c) => c.id === contractId)
      if (!contract) throw new Error('合同不存在')
      useEntitlementStore().reclaimSingleSeat(seatEntitlementId)
      contract.seatIds = contract.seatIds.filter((id) => id !== seatEntitlementId)
    },

    // 商品迁移：先授予替代权益并验证可用，再撤销原权益。
    migrateSeat(oldEntitlementId: string, replacement: Entitlement) {
      useEntitlementStore().migrateThenRevoke(oldEntitlementId, replacement)
    }
  }
})
