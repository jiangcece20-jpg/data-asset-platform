<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { SPACE_TRIAL_APPLY_LABEL, USER_INTENT_HINT } from '@/domain/spaceIntent'
import { currentIntentPartyName, currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const intents = useSpaceIntentStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const submitted = ref(false)

const contactName = ref(user.context.name)
const contactPhone = ref('')
const scenario = ref('')
const currentEnterprise = computed(() => currentIntentPartyName(user))

function submit() {
  if (!user.context.loggedIn || !product.value) return
  intents.submit({
    productId: product.value.id,
    contactName: contactName.value,
    contactPhone: contactPhone.value,
    scenario: scenario.value,
    enterpriseId: currentPurchaseSubject(user) === 'enterprise' ? user.context.currentEnterpriseId : undefined,
    requestedEnterpriseName: currentEnterprise.value
  })
  submitted.value = true
}

function goMine() {
  const path = route.path.startsWith('/portal') ? '/portal/mine' : '/app/mine'
  router.push({ path, query: { menu: 'orders', orderTab: 'intent' } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader :title="SPACE_TRIAL_APPLY_LABEL" />

    <div class="px-4 pt-3">
      <div v-if="!user.context.loggedIn" class="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-card">
        <div class="text-[13px] text-slate-500">请先登录</div>
      </div>

      <div v-else-if="submitted" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">✅</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">已提交</div>
        <div class="mt-1 text-[12px] leading-relaxed text-emerald-600">{{ USER_INTENT_HINT }} 可在「我的 · 意向单」查看进度；到账后改到「买数」。</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="goMine">
          回我的
        </button>
      </div>

      <div v-else-if="product" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[14px] font-semibold text-slate-900">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-slate-500">{{ USER_INTENT_HINT }}</div>
        <div class="mt-3 space-y-3 text-[13px]">
          <div>
            <div class="mb-1 text-[11px] text-slate-400">联系人</div>
            <input v-model="contactName" data-testid="contact-name" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">联系方式</div>
            <input v-model="contactPhone" data-testid="contact-phone" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">使用场景</div>
            <textarea v-model="scenario" data-testid="scenario" rows="3" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">当前企业</div>
            <div data-testid="requested-enterprise" class="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-800">
              {{ currentEnterprise }}
            </div>
          </div>
        </div>
        <button
          data-testid="submit-intent"
          class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white"
          @click="submit"
        >{{ SPACE_TRIAL_APPLY_LABEL }}</button>
      </div>

      <div v-else class="p-6 text-center text-sm text-slate-400">商品不存在</div>
    </div>
  </div>
</template>
