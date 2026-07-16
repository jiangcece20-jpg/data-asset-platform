<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'

const user = useUserStore()
const catalog = useCatalogStore()

const grantProductId = ref('')
const appOnlyProducts = catalog.products.filter((p) => p.dealChannel === 'app_payment')

function grant() {
  if (!grantProductId.value) return
  user.grantEnterpriseEntitlement(grantProductId.value)
  grantProductId.value = ''
}
</script>

<template>
  <div>
    <PageHeader title="企业权益" desc="套餐、席位、成员、分配记录、到期续费" />

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-[14px] font-semibold text-slate-800">{{ user.enterprise.name }}</div>
          <StatusBadge dict="enterprise" :value="user.enterprise.status" />
        </div>
        <div class="text-[12px] text-slate-400">{{ user.enterprise.packageName }} · 到期 {{ user.enterprise.expiresAt }}</div>

        <table class="mt-3 w-full text-left text-[13px]">
          <thead class="text-xs text-slate-400"><tr><th class="py-1.5">成员</th><th class="py-1.5">角色</th><th class="py-1.5">席位状态</th><th class="py-1.5">操作</th></tr></thead>
          <tbody>
            <tr v-for="m in user.enterprise.members" :key="m.id" class="border-t border-slate-100">
              <td class="py-1.5 text-slate-700">{{ m.name }}（{{ m.phone }}）</td>
              <td class="py-1.5 text-slate-500">{{ m.role === 'admin' ? '管理员' : '成员' }}</td>
              <td class="py-1.5 text-slate-500">{{ m.seatAssigned ? '已分配' : m.status === 'invited' ? '待接受邀请' : '未分配' }}</td>
              <td class="py-1.5">
                <button v-if="m.seatAssigned" class="text-slate-500 hover:underline" @click="user.revokeSeat(m.id)">收回席位</button>
                <button v-else class="text-brand-600 hover:underline" @click="user.assignSeat(m.id)">分配席位</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="mt-3 flex gap-2">
          <button class="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] text-slate-600" @click="user.renewEnterprise(12)">续费 12 个月</button>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">席位使用情况</div>
        <div class="text-2xl font-bold text-slate-900">{{ user.enterprise.seatsUsed }}/{{ user.enterprise.seatsTotal }}</div>
        <div class="mt-1 text-[12px] text-slate-400">已用/总席位</div>

        <div class="mt-4">
          <div class="mb-1.5 text-[13px] font-medium text-slate-700">已开通内容</div>
          <div v-for="pid in user.enterprise.entitledProductIds" :key="pid" class="py-1 text-[12px] text-slate-600">
            📄 {{ catalog.byId(pid)?.name || pid }}
          </div>
          <div class="mt-2 flex gap-1.5">
            <select v-model="grantProductId" class="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]">
              <option value="">选择商品手动开通</option>
              <option v-for="p in appOnlyProducts" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="grant">开通</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
