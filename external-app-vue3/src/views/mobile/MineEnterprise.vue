<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'

const router = useRouter()
const user = useUserStore()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const enterpriseContextAllowed = computed(() =>
  user.context.enterpriseAuthStatus === 'authenticated'
  && Boolean(user.context.currentEnterpriseId)
  && Boolean(user.context.currentEnterpriseId
    && user.enterpriseMemberFor(user.context.currentEnterpriseId, user.context.currentMemberId)),
)
const enterpriseEntitledProductIds = computed(() =>
  [...new Set(entitlements.currentEnterpriseSeatEntitlements.flatMap((entitlement) =>
    entitlement.productId ? [entitlement.productId] : [],
  ))],
)

const inviteName = ref('')
const invitePhone = ref('')

function invite() {
  if (!inviteName.value || !invitePhone.value) return
  user.inviteMember(inviteName.value, invitePhone.value)
  inviteName.value = ''
  invitePhone.value = ''
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="企业中心" />

    <div v-if="!enterpriseContextAllowed" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-center">
      <div class="text-[13px] text-slate-500">尚未完成企业认证</div>
      <button class="mt-3 w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white" @click="router.push({ path: '/app/enterprise-auth', query: { redirect: '/app/mine/enterprise' } })">
        去认证
      </button>
    </div>

    <template v-else>
      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-slate-900">{{ user.enterprise.name }}</div>
          <StatusBadge dict="enterprise" :value="user.enterprise.status" />
        </div>
        <div class="mt-1 text-[12px] text-slate-400">{{ user.enterprise.packageName }} · 到期 {{ user.enterprise.expiresAt }}</div>
        <div class="mt-3 flex items-center gap-3">
          <div class="flex-1 rounded-xl bg-slate-50 p-2.5 text-center">
            <div class="text-[16px] font-bold text-slate-800">{{ user.enterprise.seatsUsed }}/{{ user.enterprise.seatsTotal }}</div>
            <div class="text-[11px] text-slate-400">已用席位</div>
          </div>
          <div class="flex-1 rounded-xl bg-slate-50 p-2.5 text-center">
            <div class="text-[16px] font-bold text-slate-800">{{ enterpriseEntitledProductIds.length }}</div>
            <div class="text-[11px] text-slate-400">已购内容</div>
          </div>
        </div>
      </div>

      <button v-if="user.context.currentEnterpriseId" data-testid="api-usage-bills-entry" class="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-card" @click="router.push('/app/mine/enterprise/bills')">
        <div>
          <div class="text-[14px] font-medium text-slate-800">API 用量账单</div>
          <div class="mt-1 text-[12px] text-slate-400">查看可信空间出具的企业或个人调用明细</div>
        </div>
        <span class="text-slate-300">›</span>
      </button>

      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="mb-2 text-[13px] font-medium text-slate-700">成员管理</div>
        <div v-for="m in user.enterprise.members" :key="m.id" class="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
          <div>
            <div class="text-[13px] text-slate-800">{{ m.name }}</div>
            <div class="text-[11px] text-slate-400">
              {{ m.phone }} · {{ m.role === 'admin' ? '管理员' : '成员' }} · {{ m.seatAssigned ? '已分配席位' : m.status === 'invited' ? '待接受邀请' : '未分配席位' }}
            </div>
          </div>
          <button
            v-if="m.seatAssigned"
            class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
            @click="user.revokeSeat(m.id)"
          >
            收回席位
          </button>
          <button v-else class="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] text-white" @click="user.assignSeat(m.id)">分配席位</button>
        </div>

        <div class="mt-3 flex gap-2">
          <input v-model="inviteName" placeholder="姓名" class="w-1/3 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] focus:outline-none" />
          <input v-model="invitePhone" placeholder="手机号" class="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] focus:outline-none" />
          <button class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="invite">邀请</button>
        </div>
      </div>

      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="mb-1.5 text-[13px] font-medium text-slate-700">已开通内容权益</div>
        <div v-for="pid in enterpriseEntitledProductIds" :key="pid" class="py-1 text-[12px] text-slate-600">
          📄 {{ catalog.byId(pid)?.name || pid }}
        </div>
        <div v-if="!enterpriseEntitledProductIds.length" class="text-[12px] text-slate-400">暂无企业内容权益</div>
      </div>
    </template>
  </div>
</template>
