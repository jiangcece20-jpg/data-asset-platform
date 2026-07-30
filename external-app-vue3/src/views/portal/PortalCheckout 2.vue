<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { typeMeta } from '@/utils/productMeta'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const paid = ref(false)
const submitting = ref(false)
const purpose = ref('')

function confirmPurchase() {
  if (submitting.value || paid.value || !product.value) return
  submitting.value = true
  try {
    orders.purchaseItem(id.value, product.value.price.itemPrice || 0)
    paid.value = true
  } catch {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="product" class="mx-auto max-w-4xl">
    <div class="grid grid-cols-3 gap-6">
      <!-- 左栏：订单信息 -->
      <div class="col-span-2 space-y-4">
        <div v-if="!paid" class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-slate-800">购买结算</h2>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <span class="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">{{ typeMeta[product.type].label }}</span>
              <div class="flex-1">
                <div class="text-sm font-medium text-slate-800">{{ product.name }}</div>
                <div class="text-xs text-slate-400">{{ product.subtitle }}</div>
              </div>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-slate-700">购买信息</div>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-xs text-slate-400">购买周期</label>
                  <div class="text-sm text-slate-700">{{ product.type === 'dashboard' ? '12个月' : '长期有效' }}</div>
                </div>
                <div>
                  <label class="mb-1 block text-xs text-slate-400">使用用途</label>
                  <input
                    v-model="purpose"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="请描述使用用途（可选）"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div class="text-4xl">🎉</div>
          <div class="mt-3 text-lg font-medium text-emerald-700">支付成功</div>
          <div class="mt-1 text-sm text-emerald-600">已解锁本商品</div>
          <button class="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm text-white" @click="router.push('/portal/mine')">
            查看我的购买 →
          </button>
        </div>
      </div>

      <!-- 右栏：订单摘要 -->
      <div class="col-span-1">
        <div class="sticky top-20 rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">订单摘要</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">商品名称</span>
              <span class="text-slate-700">{{ product.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">类型</span>
              <span class="text-slate-700">{{ typeMeta[product.type].label }}</span>
            </div>
            <div class="border-t border-slate-100 pt-2">
              <div class="flex justify-between">
                <span class="text-slate-400">原价</span>
                <span class="text-slate-700">¥{{ product.price.itemPrice || 0 }}</span>
              </div>
              <div class="mt-1 flex justify-between">
                <span class="text-slate-400">实付</span>
                <span class="text-lg font-bold text-brand-600">¥{{ product.price.itemPrice || 0 }}</span>
              </div>
            </div>
          </div>
          <button
            v-if="!paid"
            class="mt-4 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="submitting"
            @click="confirmPurchase"
          >确认购买</button>
          <button
            v-if="!paid"
            class="mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600"
            @click="router.back()"
          >取消</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">商品不存在</div>
</template>
