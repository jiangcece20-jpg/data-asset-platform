<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ProductCard from '@/components/mobile/ProductCard.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
import DemandProgress from '@/components/mobile/DemandProgress.vue'
import { useSupplyTaskStore } from '@/stores/supplyTasks'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useTrialStore } from '@/stores/trials'
import { useDemandStore } from '@/stores/demand'
import { useCatalogStore } from '@/stores/catalog'
import { useListingRequestStore } from '@/stores/listingRequests'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const entitlements = useEntitlementStore()
const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const trials = useTrialStore()
const demand = useDemandStore()
const catalog = useCatalogStore()
const listingRequests = useListingRequestStore()
const woStore = useReverseWorkOrderStore()

const tabs = ['权益', '个人订单', '企业订单', '试用与需求', '求上架', '服务通知', '收藏'] as const
const initialTab = (route.query.tab as string) || '权益'
const validTabs = ['权益', '个人订单', '企业订单', '试用与需求', '求上架', '服务通知', '收藏']
const tab = ref<(typeof tabs)[number]>(validTabs.includes(initialTab) ? initialTab as any : '权益')

const supply = useSupplyTaskStore()
const myDemands = computed(() => demand.byOwner(user.context.currentMemberId))
const myCallbacks = computed(() => supply.callbacksForCustomer(user.context.currentMemberId))

const itemEntitlements = computed(() => entitlements.list.filter((e) => e.type === 'item'))
const favorites = computed(() => catalog.products.filter((p) => p.favorite))
const myListingRequests = computed(() => listingRequests.byUser(user.context.currentMemberId))
const enterpriseMember = computed(() => user.currentEnterpriseMember)
const enterpriseOrderUser = computed(() => {
  if (
    user.context.enterpriseAuthStatus !== 'authenticated'
    || !user.context.currentEnterpriseId
    || !enterpriseMember.value
  ) return undefined

  return {
    currentEnterpriseId: user.context.currentEnterpriseId,
    currentMemberId: user.context.currentMemberId,
    enterpriseAuthStatus: user.context.enterpriseAuthStatus,
    role: enterpriseMember.value.role
  }
})
const personalAppOrders = computed(() => orders.appOrders.filter((order) =>
  order.ownerType === 'personal' && order.ownerId === user.context.currentMemberId,
))
const enterpriseOrders = computed(() => {
  const context = enterpriseOrderUser.value
  if (!context) return []

  const appOrders = orders.appOrders
    .filter((order) => order.ownerType === 'enterprise' && order.ownerId === context.currentEnterpriseId)
    .map((order) => ({
      source: 'app' as const,
      id: order.id,
      channelLabel: 'APP 支付',
      productName: order.productName,
      status: order.status,
      amount: order.amount,
      createdAt: order.createdAt
    }))
  const trustedSpaceOrders = spaceOrders.visibleFor(context).map((order) => ({
    source: 'space' as const,
    id: order.spaceOrderId,
    channelLabel: '可信空间',
    productName: order.productName,
    status: order.displayStatus,
    amount: order.amount,
    currency: order.currency,
    spaceOrderId: order.spaceOrderId,
    deliverySummary: order.deliverySummary,
    syncedAt: order.syncedAt,
    detailUrl: order.detailUrl
  }))

  return [...appOrders, ...trustedSpaceOrders]
})

const deliveredNotices = computed(() =>
  woStore.notices.filter((n) =>
    n.status === 'delivered'
    && n.channel === 'in_app'
    && (n.customerId === user.context.currentMemberId
      || (user.context.currentEnterpriseId && n.customerId === user.context.currentEnterpriseId)),
  ),
)
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-6">
    <MobileHeader title="我的" :show-back="false" />

    <div class="px-4 pt-3">
      <div class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg">👤</div>
        <div class="flex-1">
          <div class="text-[14px] font-semibold text-slate-900">{{ user.context.name }}</div>
          <div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span v-if="user.context.personalMember" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">会员至 {{ user.context.memberExpiresAt }}</span>
            <span v-else>非会员</span>
          </div>
        </div>
        <button class="rounded-full bg-slate-100 px-3 py-1.5 text-[12px] text-slate-600" @click="router.push('/app/mine/enterprise')">企业中心 ›</button>
      </div>
    </div>

    <div class="mt-3 px-4">
      <div class="flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 text-[12px]">
        <button
          v-for="t in tabs"
          :key="t"
          class="shrink-0 rounded-full px-3 py-1.5 transition"
          :class="tab === t ? 'bg-white shadow-sm font-medium text-brand-600' : 'text-slate-500'"
          @click="tab = t"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <!-- 权益 -->
    <div v-if="tab === '权益'" class="mt-3 space-y-2.5 px-4">
      <div class="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div class="text-[13px] font-medium text-slate-700">个人会员</div>
        <div class="mt-1 text-[12px] text-slate-400">
          {{ user.context.personalMember ? `有效期至 ${user.context.memberExpiresAt}` : '尚未开通' }}
        </div>
        <button v-if="!user.context.personalMember" class="mt-2 rounded-full bg-brand-500 px-3 py-1.5 text-[12px] text-white" @click="router.push('/app/checkout/member')">
          去开通
        </button>
      </div>
      <div v-if="itemEntitlements.length" class="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div class="mb-1.5 text-[13px] font-medium text-slate-700">单品权益</div>
        <div v-for="e in itemEntitlements" :key="e.id" class="flex items-center justify-between py-1 text-[12px] text-slate-600">
          <span>{{ catalog.byId(e.productId || '')?.name }}</span>
          <span v-if="e.productVersion" class="text-slate-400">版本 {{ e.productVersion }} · 长期有效</span>
          <span v-else-if="e.validTo" class="text-slate-400">有效至 {{ e.validTo }}</span>
          <span v-else class="text-slate-400">长期有效</span>
        </div>
      </div>
      <EmptyState v-if="!user.context.personalMember && !itemEntitlements.length" icon="🎫" title="暂无个人权益" />
    </div>

    <!-- 个人订单 -->
    <div v-else-if="tab === '个人订单'" class="mt-3 space-y-2 px-4">
      <div v-for="o in personalAppOrders" :key="o.id" class="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-medium text-slate-800">{{ o.productName }}</span>
          <StatusBadge dict="appOrder" :value="o.status" />
        </div>
        <div class="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>个人订单 · {{ o.createdAt }}</span>
          <span>¥{{ o.amount }}</span>
        </div>
      </div>
      <EmptyState v-if="!personalAppOrders.length" icon="🧾" title="暂无个人订单" />
    </div>

    <!-- 企业订单 -->
    <div v-else-if="tab === '企业订单'" class="mt-3 space-y-2 px-4">
      <div v-if="!enterpriseOrderUser" class="rounded-2xl border border-slate-100 bg-white p-4 text-center text-[13px] text-slate-500">
        完成企业认证后查看企业订单
      </div>
      <template v-else>
        <div v-for="o in enterpriseOrders" :key="`${o.source}-${o.id}`" class="rounded-2xl border border-slate-100 bg-white p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-medium text-slate-800">{{ o.productName }}</span>
            <StatusBadge v-if="o.source === 'app'" dict="appOrder" :value="o.status" />
            <StatusBadge v-else dict="spaceOrder" :value="o.status" />
          </div>
          <div class="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>{{ o.channelLabel }}</span>
            <span>{{ o.source === 'app' ? `¥${o.amount}` : `${o.amount} ${o.currency}` }}</span>
          </div>
          <div v-if="o.source === 'app'" class="mt-1 text-[11px] text-slate-400">创建于 {{ o.createdAt }}</div>
          <template v-else>
            <div class="mt-1 text-[11px] text-slate-400">空间订单号：{{ o.spaceOrderId }}</div>
            <div v-if="o.deliverySummary" class="mt-1 text-[11px] text-slate-500">交付摘要：{{ o.deliverySummary }}</div>
            <div class="mt-1 text-[11px] text-slate-400">最近同步：{{ o.syncedAt }}</div>
            <a
              v-if="o.detailUrl"
              class="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1.5 text-[12px] text-brand-600"
              :href="o.detailUrl"
              target="_blank"
              rel="noopener noreferrer"
            >前往空间使用</a>
          </template>
        </div>
        <EmptyState v-if="!enterpriseOrders.length" icon="🧾" title="暂无企业订单" />
      </template>
    </div>

    <!-- 试用与需求 -->
    <div v-else-if="tab === '试用与需求'" class="mt-3 space-y-2 px-4">
      <div v-if="trials.list.length">
        <div class="mb-1.5 text-xs font-medium text-slate-400">试用申请</div>
        <div v-for="t in trials.list" :key="t.id" class="mb-2 rounded-2xl border border-slate-100 bg-white p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-medium text-slate-800">{{ t.productName }}</span>
            <StatusBadge dict="trial" :value="t.status" />
          </div>
          <div class="mt-1 text-[11px] text-slate-400">额度 {{ t.usedQuota }}/{{ t.quota }} · 申请于 {{ t.appliedAt }}</div>
        </div>
      </div>
      <div v-if="myDemands.length">
        <div class="mb-1.5 text-xs font-medium text-slate-400">我的需求</div>
        <div class="space-y-2">
          <DemandProgress :demands="myDemands" :callbacks="myCallbacks" @view="(id) => router.push('/app/mine')" />
        </div>
      </div>
      <EmptyState v-if="!trials.list.length && !myDemands.length" icon="📝" title="暂无试用或需求记录" />
    </div>

    <!-- 求上架 -->
    <div v-else-if="tab === '求上架'" class="mt-3 space-y-2 px-4">
      <div v-for="r in myListingRequests" :key="r.id" class="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-medium text-slate-800">{{ r.productName }}</span>
          <StatusBadge dict="listingRequest" :value="r.status" />
        </div>
        <div class="mt-1 text-[11px] text-slate-400">使用场景：{{ r.scenario }} · 提交于 {{ r.createdAt }}</div>
        <div v-if="r.feedbackMessage" class="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500">{{ r.feedbackMessage }}</div>
        <button
          v-if="r.status === 'published'"
          class="mt-2 rounded-full bg-brand-500 px-3 py-1.5 text-[12px] text-white"
          @click="router.push(`/app/product/${r.productId}`)"
        >
          前往购买 ›
        </button>
      </div>
      <EmptyState v-if="!myListingRequests.length" icon="📋" title="暂无求上架记录" />
    </div>

    <!-- 服务通知 -->
    <div v-else-if="tab === '服务通知'" class="mt-3 space-y-2.5 px-4">
      <div v-for="n in deliveredNotices" :key="n.id" class="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[12px] font-medium text-slate-700">📋 服务通知</span>
          <span class="ml-auto text-[10px] text-slate-400">{{ n.deliveredAt?.slice(0, 10) }}</span>
        </div>
        <div class="mt-1.5 text-[12px] leading-relaxed text-slate-600">{{ n.content }}</div>
      </div>
      <EmptyState v-if="!deliveredNotices.length" icon="📭" title="暂无服务通知" desc="商品状态变更时会在此通知您" />
    </div>

    <!-- 收藏 -->
    <div v-else class="mt-3 space-y-2.5 px-4">
      <ProductCard v-for="p in favorites" :key="p.id" :product="p" />
      <EmptyState v-if="!favorites.length" icon="⭐" title="暂无收藏" desc="在商品卡片右上角点击星标即可收藏" />
    </div>
  </div>
</template>
