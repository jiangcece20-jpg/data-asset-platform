<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import PurchaseIdentityBanner from '@/components/shared/PurchaseIdentityBanner.vue'
import { currentPurchaseIdentity } from '@/domain/purchaseIdentity'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const submittedOrderId = ref('')
const checkoutIntent = ref<ReturnType<typeof orders.getEnterpriseReportCheckoutIntent>>()
const identity = computed(() => currentPurchaseIdentity(user))
const enterpriseEligible = computed(() =>
  user.isEnterpriseAuthenticated
  && Boolean(user.context.currentEnterpriseId)
  && Boolean(user.currentEnterpriseMember)
)

const packagePrice = computed(() => checkoutIntent.value?.amount ?? (product.value?.price.itemPrice || 199) * 10)

function returnToReportCheckout() {
  router.replace(`/app/checkout/item/${id.value}`)
}

onMounted(() => {
  checkoutIntent.value = orders.getEnterpriseReportCheckoutIntent(String(route.query.intent || ''), id.value)
  if (!checkoutIntent.value) returnToReportCheckout()
})

function submit() {
  if (submittedOrderId.value || !product.value || !enterpriseEligible.value || !checkoutIntent.value) return
  try {
    const order = orders.submitEnterpriseOrder(id.value, packagePrice.value, checkoutIntent.value.mode, checkoutIntent.value.id)
    submittedOrderId.value = order.id
  } catch {
    returnToReportCheckout()
  }
}

const submittedOrder = computed(() => orders.list.find((o) => o.id === submittedOrderId.value))
</script>

<template>
  <div v-if="product && checkoutIntent" class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="企业采购" />
    <div class="px-4 pt-3">
      <div v-if="!submittedOrder" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <PurchaseIdentityBanner v-if="enterpriseEligible" class="mb-3" :type-label="identity.typeLabel" :name="identity.name" note="合同采购按当前企业身份提交，不再二次选择主体。" />
        <div v-else class="mb-3 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-700">
          企业购买需由已认证的当前企业成员发起
        </div>
        <div class="text-[14px] font-semibold text-slate-900">{{ product.name }} · 企业方案</div>
        <div class="mt-1 text-[12px] text-slate-500">企业采购后由管理员在企业中心分配席位，成员即可共享内容</div>

        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500">
          已确认结算方式：{{ checkoutIntent.mode === 'online' ? '在线支付' : '报价 → 合同 → 对公付款' }}
        </div>

        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500">
          套餐金额：¥{{ packagePrice }}<template v-if="checkoutIntent.selectedTermMonths"> · {{ checkoutIntent.selectedTermMonths }} 个月</template>，企业成员权限由管理员分配
        </div>

        <button data-testid="enterprise-intent-submit" class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!enterpriseEligible" @click="submit">
          {{ checkoutIntent.mode === 'online' ? `确认以${user.enterprise.name}名义支付` : `确认以${user.enterprise.name}名义提交企业订单` }}
        </button>
      </div>

      <div v-else class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-slate-900">企业订单已{{ checkoutIntent.mode === 'online' ? '支付' : '提交' }}</div>
          <StatusBadge dict="appOrder" :value="submittedOrder.status" />
        </div>
        <div v-if="submittedOrder.contractStatus" class="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
          合同状态：<StatusBadge dict="contract" :value="submittedOrder.contractStatus" />
        </div>
        <p class="mt-2 text-[12px] leading-relaxed text-slate-400">
          {{ checkoutIntent.mode === 'online' ? '权益已生效，前往企业中心分配席位。' : '运营后台将推进报价、合同签署与对公付款确认，确认后自动开通企业权益。' }}
        </p>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="router.push('/app/mine/enterprise')">
          前往企业中心查看进度
        </button>
      </div>
    </div>
  </div>
</template>
