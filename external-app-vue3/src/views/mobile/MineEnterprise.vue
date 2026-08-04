<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { statusClass, statusMeta } from '@/utils/statusMeta'

const router = useRouter()
const user = useUserStore()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const datasetCommerce = useDatasetCommerceStore()
const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const enterpriseContextAllowed = computed(() =>
  user.context.enterpriseAuthStatus === 'authenticated'
  && Boolean(user.context.currentEnterpriseId)
  && Boolean(user.context.currentEnterpriseId
    && user.enterpriseMemberFor(user.context.currentEnterpriseId, user.context.currentMemberId)),
)
const enterpriseEntitledProductIds = computed(() =>
  [...new Set([...entitlements.currentEnterpriseSeatEntitlements, ...entitlements.visibleDatasetEntitlements.filter((item) => item.source === 'enterprise')].flatMap((entitlement) =>
    entitlement.productId ? [entitlement.productId] : [],
  ))],
)

const inviteName = ref('')
const invitePhone = ref('')
const isAdmin = computed(() => user.currentEnterpriseMember?.role === 'admin')
const enterpriseDatasetEntitlements = computed(() => entitlements.visibleDatasetEntitlements.filter((item) => item.source === 'enterprise'))
const myEnterprisePurchases = computed(() => datasetCommerce.approvalRequests
  .filter((request) => request.enterpriseId === user.context.currentEnterpriseId && request.applicantMemberId === user.context.currentMemberId)
  .map((request) => ({ request, order: orders.list.find((item) => item.id === request.orderId) }))
  .sort((a, b) => b.request.submittedAt.localeCompare(a.request.submittedAt)))
const enterpriseOrderCount = computed(() => {
  const enterpriseId = user.context.currentEnterpriseId
  const member = user.currentEnterpriseMember
  if (!enterpriseId || !member || !enterpriseContextAllowed.value) return 0
  const appCount = orders.appOrders.filter((order) => (
    order.ownerType === 'enterprise'
    && order.ownerId === enterpriseId
    && (member.role === 'admin' || order.operatorMemberId === user.context.currentMemberId)
  )).length
  const spaceCount = spaceOrders.visibleFor({
    currentEnterpriseId: enterpriseId,
    currentMemberId: user.context.currentMemberId,
    enterpriseAuthStatus: user.context.enterpriseAuthStatus,
    role: member.role
  }).length
  return appCount + spaceCount
})

function setMemberPurchaseAllowed(value: boolean) {
  user.updateEnterprisePurchasePolicy({ memberPurchaseAllowed: value })
}

function setApprovalRequired(value: boolean) {
  user.updateEnterprisePurchasePolicy({ memberPurchaseApprovalRequired: value })
}

function toggleDatasetMember(entitlementId: string, memberId: string, checked: boolean) {
  const entitlement = entitlements.list.find((item) => item.id === entitlementId)
  const assigned = new Set(entitlement?.assignedMemberIds || [])
  if (checked) assigned.add(memberId)
  else assigned.delete(memberId)
  entitlements.assignDatasetMembers(entitlementId, [...assigned])
}

function invite() {
  if (!inviteName.value || !invitePhone.value) return
  user.inviteMember(inviteName.value, invitePhone.value)
  inviteName.value = ''
  invitePhone.value = ''
}

function continueDatasetPayment(orderId: string) {
  router.push(`/app/payment/dataset/${orderId}`)
}

function goMyData() {
  router.push('/app/mine?tab=data')
}

function goEnterpriseOrders() {
  router.push({
    path: '/app/mine',
    query: { tab: 'orders', subject: 'enterprise', from: 'enterprise-center' }
  })
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
        <div class="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-[11px]" data-testid="mock-member-switcher">
          <span class="text-violet-700">原型身份：</span>
          <button v-for="member in user.enterprise.members.filter((item) => item.status === 'active').slice(0, 2)" :key="member.id" class="rounded-full px-2 py-1" :class="user.context.currentMemberId === member.id ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'" @click="user.switchMockEnterpriseMember(member.id)">{{ member.name }}（{{ member.role === 'admin' ? '管理员' : '成员' }}）</button>
        </div>
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

      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="enterprise-orders-and-bills">
        <div class="mb-2 text-[13px] font-medium text-slate-700">企业订单与账单</div>
        <button data-testid="view-enterprise-orders" class="flex w-full items-center justify-between border-t border-slate-50 py-3 text-left" @click="goEnterpriseOrders">
          <div>
            <div class="text-[13px] text-slate-800">查看企业订单</div>
            <div class="mt-0.5 text-[11px] text-slate-400">在“我的订单”中仅查看当前企业订单</div>
          </div>
          <div class="flex items-center gap-2"><span class="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-600">{{ enterpriseOrderCount }} 笔</span><span class="text-slate-300">›</span></div>
        </button>
        <button v-if="user.context.currentEnterpriseId" data-testid="api-usage-bills-entry" class="flex w-full items-center justify-between border-t border-slate-50 py-3 text-left" @click="router.push('/app/mine/enterprise/bills')">
          <div>
            <div class="text-[13px] text-slate-800">API 调用与费用账单</div>
            <div class="mt-0.5 text-[11px] text-slate-400">按订单、API、凭证查看企业授权范围内费用</div>
          </div>
          <span class="text-slate-300">›</span>
        </button>
      </div>

      <div v-if="isAdmin" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="enterprise-dataset-assignments">
        <div class="mb-2 text-[13px] font-medium text-slate-700">企业数据权益分配</div>
        <div v-for="entitlement in enterpriseDatasetEntitlements" :key="entitlement.id" class="border-t border-slate-50 py-3 first:border-t-0">
          <div class="text-[12px] font-medium text-slate-800">{{ catalog.byId(entitlement.productId || '')?.name }}</div>
          <div class="mt-1 text-[10px] text-slate-400">{{ entitlement.accessScope === 'enterprise_wide' ? '企业全员可用' : '指定成员使用' }} · 用数模块内部分析、报表及细粒度权限由对应团队管理</div>
          <div v-if="entitlement.accessScope === 'named_seats'" class="mt-2 flex flex-wrap gap-2">
            <label v-for="member in user.enterprise.members.filter((item) => item.status === 'active')" :key="member.id" class="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] text-slate-600"><input type="checkbox" :checked="entitlement.assignedMemberIds?.includes(member.id)" @change="toggleDatasetMember(entitlement.id, member.id, ($event.target as HTMLInputElement).checked)" />{{ member.name }}</label>
          </div>
        </div>
        <div v-if="!enterpriseDatasetEntitlements.length" class="py-3 text-center text-[12px] text-slate-400">暂无企业数据集权益</div>
      </div>

      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="enterprise-purchase-policy">
        <div class="flex items-center justify-between">
          <div><div class="text-[13px] font-medium text-slate-700">企业采购策略</div><div class="mt-0.5 text-[11px] text-slate-400">仅影响成员以企业主体购买资产平台数据集</div></div>
          <span class="text-[10px] text-slate-400">{{ isAdmin ? '管理员可设置' : '仅查看' }}</span>
        </div>
        <label class="mt-3 flex items-center justify-between border-t border-slate-50 pt-3 text-[12px] text-slate-600">
          <span>允许普通成员发起企业采购</span>
          <input type="checkbox" :checked="user.enterprise.purchasePolicy.memberPurchaseAllowed" :disabled="!isAdmin" data-testid="policy-member-allowed" @change="setMemberPurchaseAllowed(($event.target as HTMLInputElement).checked)" />
        </label>
        <label class="mt-3 flex items-center justify-between text-[12px] text-slate-600">
          <span>普通成员采购需管理员审批</span>
          <input type="checkbox" :checked="user.enterprise.purchasePolicy.memberPurchaseApprovalRequired" :disabled="!isAdmin || !user.enterprise.purchasePolicy.memberPurchaseAllowed" data-testid="policy-approval-required" @change="setApprovalRequired(($event.target as HTMLInputElement).checked)" />
        </label>
        <div class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">原型可演示企业余额、合同支付或公对公转账；生产首期优先落地一种正式企业支付路径。</div>
      </div>

      <div v-if="isAdmin" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="purchase-approval-list">
        <div class="mb-2 text-[13px] font-medium text-slate-700">待审批采购（{{ datasetCommerce.pendingEnterpriseApprovals.length }}）</div>
        <div v-for="request in datasetCommerce.pendingEnterpriseApprovals" :key="request.id" class="border-t border-slate-50 py-3 first:border-t-0">
          <div class="flex items-start justify-between gap-3"><div><div class="text-[12px] font-medium text-slate-800">{{ request.productName }}</div><div class="mt-1 text-[11px] text-slate-400">申请人 {{ user.enterprise.members.find((item) => item.id === request.applicantMemberId)?.name }} · ¥{{ request.amount.toLocaleString() }}</div></div></div>
          <div class="mt-2 flex gap-2"><button class="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] text-white" data-testid="approve-dataset-purchase" @click="datasetCommerce.approve(request.id)">通过</button><button class="rounded-full bg-red-50 px-3 py-1.5 text-[11px] text-red-600" @click="datasetCommerce.reject(request.id)">驳回</button></div>
        </div>
        <div v-if="!datasetCommerce.pendingEnterpriseApprovals.length" class="py-3 text-center text-[12px] text-slate-400">暂无待审批采购</div>
      </div>

      <div v-if="myEnterprisePurchases.length" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card" data-testid="my-enterprise-purchases">
        <div class="mb-2 text-[13px] font-medium text-slate-700">我的企业采购</div>
        <div v-for="purchase in myEnterprisePurchases" :key="purchase.request.id" class="border-t border-slate-50 py-3 first:border-t-0">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[12px] font-medium text-slate-800">{{ purchase.request.productName }}</div>
              <div class="mt-1 text-[11px] text-slate-400">订单 {{ purchase.request.orderId }} · ¥{{ purchase.request.amount.toLocaleString() }}</div>
            </div>
            <span class="shrink-0 rounded-full px-2 py-1 text-[10px]" :class="statusClass('approval', purchase.request.status)">{{ statusMeta('approval', purchase.request.status).label }}</span>
          </div>
          <div v-if="purchase.request.status === 'pending'" class="mt-2 text-[11px] text-amber-700">等待企业管理员审批，审批通过后可继续选择企业付款方式。</div>
          <div v-else-if="purchase.request.status === 'rejected'" class="mt-2 text-[11px] text-red-600">{{ purchase.request.reason || '企业管理员已驳回' }}</div>
          <template v-else-if="purchase.order">
            <div class="mt-2 text-[11px] text-slate-500">订单状态：{{ statusMeta('appOrder', purchase.order.status).label }}</div>
            <button v-if="purchase.order.status === 'pending_payment'" data-testid="continue-enterprise-dataset-payment" class="mt-2 rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white" @click="continueDatasetPayment(purchase.order.id)">继续企业付款</button>
            <button v-else-if="purchase.order.status === 'entitlement_active'" class="mt-2 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] text-white" @click="goMyData">查看已交付数据</button>
          </template>
        </div>
      </div>

      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-[13px] font-medium text-slate-700">成员管理</div>
          <span class="text-[10px] text-slate-400">{{ isAdmin ? '管理员可操作' : '仅查看' }}</span>
        </div>
        <div v-for="m in user.enterprise.members" :key="m.id" class="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
          <div>
            <div class="text-[13px] text-slate-800">{{ m.name }}</div>
            <div class="text-[11px] text-slate-400">
              {{ m.phone }} · {{ m.role === 'admin' ? '管理员' : '成员' }} · {{ m.seatAssigned ? '已分配席位' : m.status === 'invited' ? '待接受邀请' : '未分配席位' }}
            </div>
          </div>
          <button
            v-if="isAdmin && m.seatAssigned"
            data-testid="revoke-enterprise-seat"
            class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
            @click="user.revokeSeat(m.id)"
          >
            收回席位
          </button>
          <button v-else-if="isAdmin" data-testid="assign-enterprise-seat" class="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] text-white" @click="user.assignSeat(m.id)">分配席位</button>
        </div>

        <div v-if="isAdmin" class="mt-3 flex gap-2" data-testid="invite-enterprise-member">
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
