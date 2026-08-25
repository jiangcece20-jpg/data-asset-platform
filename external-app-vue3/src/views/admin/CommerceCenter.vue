<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import type { MemberTier, Product } from '@/types/domain'
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { discountToZhe, resolveMemberBenefits } from '@/domain/memberBenefits'

const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const entitlements = useEntitlementStore()

const products = computed(() => catalog.products.filter((product) => product.dealChannel === 'app_payment'))

function itemPrice(product: Product, subject: 'personal' | 'enterprise') {
  const offers = commerceOffersOf(product).filter((offer) => offer.subject === subject)
  const offer = offers.find((item) => item.serviceMode === 'one_time') ?? offers[0]
  return offer ? `¥${offer.price.toLocaleString()}` : '—'
}

function memberPrice(product: Product, tier: MemberTier) {
  const benefit = resolveMemberBenefits(product).find((item) => item.tier === tier)
  if (!benefit) return '不纳入'
  if (benefit.mode === 'free') return '免费'
  return `${discountToZhe(benefit.discount)} 折`
}

function salesStatus(product: Product) {
  if (product.availability === 'published') return { label: '销售中', className: 'text-emerald-600' }
  if (product.availability === 'paused') return { label: '暂停销售', className: 'text-amber-600' }
  if (product.availability === 'delisted') return { label: '已下架', className: 'text-slate-400' }
  return { label: '未上架', className: 'text-slate-400' }
}

function addMonths(dateValue: string, months: number): string | undefined {
  const match = dateValue.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const firstOfTargetMonth = new Date(Date.UTC(year, month + months, 1))
  const lastDay = new Date(Date.UTC(
    firstOfTargetMonth.getUTCFullYear(),
    firstOfTargetMonth.getUTCMonth() + 1,
    0
  )).getUTCDate()
  firstOfTargetMonth.setUTCDate(Math.min(day, lastDay))
  return firstOfTargetMonth.toISOString().slice(0, 10)
}

function soldOrders(product: Product) {
  return orders.list.filter((order) =>
    order.productId === product.id
    && (order.status === 'paid' || order.status === 'pending_activation' || order.status === 'entitlement_active')
  )
}

function deliveryGuarantee(product: Product) {
  const commitments = soldOrders(product).flatMap((order) => {
    const entitlement = entitlements.list.find((item) => item.orderId === order.id)
    const entitlementEnd = entitlement?.updateValidTo || entitlement?.validTo
    if (entitlementEnd) return [entitlementEnd.slice(0, 10)]

    const startsAt = order.activationDate || order.paidAt || order.createdAt
    const endDate = addMonths(startsAt, order.selectedTermMonths || salePeriodMonthsOf(product))
    return endDate ? [endDate] : []
  })
  if (!commitments.length) return undefined
  return commitments.sort().at(-1)
}

function editProduct(product: Product) {
  router.push(`/admin/resources/${product.resourceId}`)
}
</script>

<template>
  <div>
    <PageHeader title="商业化中心" desc="统一查看商品价格方案；价格维护在资源编辑页完成" />

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="product-pricing-table">
      <div class="border-b border-slate-100 px-5 py-4">
        <div class="text-[13px] font-medium text-slate-700">商品价格方案</div>
        <div class="mt-1 text-[11px] text-slate-400">点击商品名称进入资源编辑页</div>
      </div>

      <table class="w-full text-left text-[13px]">
        <thead class="bg-slate-50 text-xs text-slate-400">
          <tr>
            <th class="px-5 py-2.5 font-medium">商品</th>
            <th class="px-3 py-2.5 font-medium">个人单品</th>
            <th class="px-3 py-2.5 font-medium">企业单品</th>
            <th class="px-3 py-2.5 font-medium">普通会员</th>
            <th class="px-3 py-2.5 font-medium">高级会员</th>
            <th class="px-3 py-2.5 font-medium">可售卖周期</th>
            <th class="px-3 py-2.5 font-medium">
              <div>交付保障至</div>
              <div class="mt-0.5 text-[10px] font-normal text-slate-300">已售订单最晚履约日</div>
            </th>
            <th class="px-5 py-2.5 font-medium">销售状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="border-t border-slate-100" data-testid="pricing-row">
            <td class="px-5 py-3">
              <button class="text-left font-medium text-slate-700 hover:text-brand-600 hover:underline" @click="editProduct(product)">
                {{ product.name }}
              </button>
            </td>
            <td class="px-3 py-3 text-slate-600">{{ itemPrice(product, 'personal') }}</td>
            <td class="px-3 py-3 text-slate-600">{{ itemPrice(product, 'enterprise') }}</td>
            <td class="px-3 py-3 text-slate-600">{{ memberPrice(product, 'standard') }}</td>
            <td class="px-3 py-3 text-slate-600">{{ memberPrice(product, 'premium') }}</td>
            <td class="px-3 py-3 text-slate-600">{{ salePeriodMonthsOf(product) }} 个月</td>
            <td class="px-3 py-3" data-testid="delivery-guarantee">
              <template v-if="deliveryGuarantee(product)">
                <div class="font-medium text-slate-700">{{ deliveryGuarantee(product) }}</div>
                <div class="mt-0.5 text-[10px] text-slate-400">{{ soldOrders(product).length }} 笔已售订单</div>
              </template>
              <span v-else class="text-slate-400">暂无已售订单</span>
            </td>
            <td class="px-5 py-3" :class="salesStatus(product).className">{{ salesStatus(product).label }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
