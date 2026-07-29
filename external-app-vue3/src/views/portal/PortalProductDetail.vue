<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { typeMeta, originMeta, dealChannelMeta } from '@/utils/productMeta'
import StatusBadge from '@/components/StatusBadge.vue'
import type { PriceModel } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const title = computed(() => (product.value ? catalog.displayTitle(product.value) : ''))
const access = computed(() => (product.value ? entitlements.accessLevel(product.value) : 'none'))
const owned = computed(() => access.value !== 'none')

const PRICE_MODELS: { value: PriceModel; label: string }[] = [
  { value: 'free', label: '免费' },
  { value: 'member_free', label: '会员免费' },
  { value: 'member_discount', label: '会员折扣' },
  { value: 'item_only', label: '仅单品购买' }
]

function goCheckout() {
  router.push(`/portal/checkout/${id.value}`)
}

function goMember() {
  router.push('/app/checkout/member')
}
</script>

<template>
  <div v-if="product" class="mx-auto max-w-5xl">
    <div class="grid grid-cols-3 gap-6">
      <!-- 左栏：主信息 -->
      <div class="col-span-2 space-y-4">
        <!-- 商品标题 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">{{ typeMeta[product.type].icon }} {{ typeMeta[product.type].label }}</span>
            <span class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{{ originMeta[product.origin] }}</span>
            <StatusBadge dict="availability" :value="product.availability" />
          </div>
          <h1 class="mt-3 text-xl font-bold text-slate-900">{{ title }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ product.subtitle }}</p>
        </div>

        <!-- 基本信息 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">基本信息</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-slate-400">供应方：</span><span class="text-slate-700">{{ product.provider }}</span></div>
            <div><span class="text-slate-400">更新频率：</span><span class="text-slate-700">{{ product.updateFrequency }}</span></div>
            <div><span class="text-slate-400">覆盖范围：</span><span class="text-slate-700">{{ product.coverage }}</span></div>
            <div><span class="text-slate-400">交付方式：</span><span class="text-slate-700">{{ product.deliveryMethod }}</span></div>
          </div>
          <div v-if="product.scenarios?.length" class="mt-3 flex flex-wrap gap-1.5">
            <span v-for="s in product.scenarios" :key="s" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ s }}</span>
          </div>
        </div>

        <!-- 数据描述 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">数据描述</h3>
          <div class="space-y-2 text-sm leading-relaxed text-slate-600">
            <div><span class="text-slate-400">价值主张：</span>{{ product.valueProposition }}</div>
            <div><span class="text-slate-400">详细描述：</span>{{ product.description }}</div>
          </div>
        </div>

        <!-- 字段信息（dataset） -->
        <div v-if="product.type === 'dataset' && product.typeDetail.dataset?.fields?.length" class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">字段信息</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-xs text-slate-400">
                <th class="pb-2 pr-4">字段名</th>
                <th class="pb-2 pr-4">类型</th>
                <th class="pb-2 pr-4">含义</th>
                <th class="pb-2">敏感级</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in product.typeDetail.dataset.fields" :key="f.name" class="border-b border-slate-100">
                <td class="py-2 pr-4 font-mono text-xs text-slate-700">{{ f.name }}</td>
                <td class="py-2 pr-4 text-xs text-slate-600">{{ f.dataType }}</td>
                <td class="py-2 pr-4 text-xs text-slate-600">{{ f.meaning }}</td>
                <td class="py-2 text-xs">
                  <span v-if="f.primaryKey" class="rounded bg-red-50 px-1.5 py-0.5 text-red-600">主键</span>
                  <span v-else-if="f.sensitivity" class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-600">{{ f.sensitivity }}</span>
                  <span v-else class="text-slate-300">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 质量与合规 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">质量与合规</h3>
          <div class="space-y-2 text-sm leading-relaxed text-slate-600">
            <div><span class="text-slate-400">质量承诺：</span>{{ product.qualityPromise }}</div>
            <div><span class="text-slate-400">合规声明：</span>{{ product.complianceNote }}</div>
          </div>
        </div>
      </div>

      <!-- 右栏：购买面板（sticky） -->
      <div class="col-span-1">
        <div class="sticky top-20 rounded-xl border border-slate-200 bg-white p-5">
          <div class="text-2xl font-bold text-brand-600">
            {{ product.price.model === 'free' ? '免费' : product.price.model === 'member_free' ? '会员免费' : `¥${product.price.itemPrice}` }}
          </div>
          <div v-if="product.price.model !== 'free'" class="mt-1 text-xs text-slate-400">
            {{ product.price.model === 'member_free' ? '开通会员后免费使用' : product.price.model === 'member_discount' ? `会员折扣 ${product.price.memberDiscount}折` : '单品购买' }}
          </div>

          <div class="mt-4 space-y-2">
            <button
              class="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
              @click="goCheckout"
            >立即购买</button>
            <button
              v-if="!owned && product.price.model !== 'item_only'"
              class="w-full rounded-lg border border-brand-300 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
              @click="goMember"
            >开通会员</button>
          </div>

          <div v-if="owned" class="mt-4 rounded-lg bg-emerald-50 p-3 text-center">
            <div class="text-sm font-medium text-emerald-700">✅ {{ access === 'member' ? '会员权益已覆盖' : '已购买' }}</div>
          </div>

          <div class="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
            <div>购买方式：{{ product.acquisitions.includes('free') ? '免费' : product.acquisitions.includes('member') ? '会员/单品' : '单品' }}</div>
            <div class="mt-1">来源：{{ originMeta[product.origin] }}</div>
            <div class="mt-1">更新时间：{{ product.updatedAt }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">商品不存在</div>
</template>
