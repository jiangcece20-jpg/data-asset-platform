<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import StatusBadge from '@/components/StatusBadge.vue'

const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const orders = useOrderStore()

const personalEntitlements = computed(() => entitlements.currentPersonalEntitlements)
const itemEntitlements = computed(() => personalEntitlements.value.filter((e) => e.type === 'item'))
const memberEntitlement = computed(() => personalEntitlements.value.find((e) => e.type === 'member'))
const hasMember = computed(() => Boolean(memberEntitlement.value))

const myOrders = computed(() =>
  orders.appOrders.filter((o) => o.ownerType === 'personal' && o.ownerId === user.context.currentMemberId)
)

function goProduct(id: string) {
  router.push(`/portal/product/${id}`)
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="grid grid-cols-4 gap-6">
      <!-- 左栏：用户信息 -->
      <div class="col-span-1">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl">👤</div>
            <div>
              <div class="text-sm font-semibold text-slate-800">{{ user.context.name }}</div>
              <div class="text-xs text-slate-400">{{ user.enterprise.name || '个人用户' }}</div>
            </div>
          </div>
          <div class="mt-4 rounded-lg bg-slate-50 p-3">
            <div class="text-xs text-slate-400">会员状态</div>
            <div class="mt-1 text-sm font-medium" :class="hasMember ? 'text-amber-600' : 'text-slate-500'">
              {{ hasMember ? '已开通 · 至 ' + memberEntitlement?.validTo : '未开通' }}
            </div>
            <button v-if="!hasMember" class="mt-2 w-full rounded-lg bg-amber-500 py-1.5 text-xs text-white" @click="router.push('/app/checkout/member')">
              续费会员
            </button>
          </div>
          <button class="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs text-slate-600" @click="router.push('/portal/bills')">
            📈 查看API账单
          </button>
        </div>
      </div>

      <!-- 右栏：已购列表 -->
      <div class="col-span-3 space-y-3">
        <h2 class="text-lg font-semibold text-slate-800">已购数据资产 ({{ itemEntitlements.length }})</h2>
        <div v-if="itemEntitlements.length" class="space-y-2">
          <div
            v-for="e in itemEntitlements"
            :key="e.id"
            class="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">
                  {{ e.productId ? (catalog.byId(e.productId)?.type || '') : '' }}
                </span>
                <div>
                  <div class="text-sm font-medium text-slate-800">
                    {{ e.productId ? catalog.byId(e.productId)?.name : '未知商品' }}
                  </div>
                  <div class="text-xs text-slate-400">
                    {{ e.validTo ? '有效至 ' + e.validTo : '长期有效' }}
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="e.productId"
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  @click="goProduct(e.productId)"
                >查看详情</button>
                <button
                  v-if="e.productId && catalog.byId(e.productId)?.type === 'api'"
                  class="rounded-lg border border-brand-300 px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50"
                  @click="router.push('/portal/bills')"
                >用量明细</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl bg-white p-8 text-center">
          <div class="text-4xl">📦</div>
          <div class="mt-2 text-sm text-slate-500">暂无已购数据资产</div>
          <button class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white" @click="router.push('/portal/search')">去发现 →</button>
        </div>

        <!-- 订单记录 -->
        <div v-if="myOrders.length" class="mt-6">
          <h2 class="mb-3 text-lg font-semibold text-slate-800">订单记录 ({{ myOrders.length }})</h2>
          <div class="space-y-2">
            <div
              v-for="o in myOrders"
              :key="o.id"
              class="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-slate-800">{{ o.productName }}</span>
                <StatusBadge dict="appOrder" :value="o.status" />
              </div>
              <div class="mt-1 flex items-center justify-between text-xs text-slate-400">
                <span>{{ o.createdAt }}</span>
                <span>¥{{ o.amount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
