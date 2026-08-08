<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const seller = useSellerMarketStore()
const user = useUserStore()
const submitting = ref(false)
const form = reactive({
  displayName: user.context.name,
  realName: user.context.name,
  idMasked: '310***********2218',
  payoutAccountMasked: '6222****8899',
  payoutBank: '招商银行',
  agreeL2: true
})

function submit() {
  if (submitting.value || !form.agreeL2) return
  submitting.value = true
  try {
    seller.applyAccess({ ...form })
    router.replace('/app/seller')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="入驻商家申请" />
    <div class="space-y-3 px-4 pt-3">
      <div class="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-[12px] text-orange-800">
        MVP 校验 L1（身份+收款）与 L2（合规声明）。L3 材料规划保留，本页可不强制。
      </div>
      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <label class="block text-[12px] text-slate-500">卖家展示名
          <input v-model="form.displayName" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">实名
          <input v-model="form.realName" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">证件号（脱敏）
          <input v-model="form.idMasked" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">收款账户（脱敏）
          <input v-model="form.payoutAccountMasked" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">开户行
          <input v-model="form.payoutBank" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="flex items-start gap-2 text-[12px] text-slate-600">
          <input v-model="form.agreeL2" type="checkbox" class="mt-0.5" />
          <span>确认不对外售卖未授权个人信息；知悉源数据许可约束；如实申报自有/衍生来源。</span>
        </label>
      </div>
      <button class="w-full rounded-xl bg-orange-500 py-3 text-[14px] font-medium text-white disabled:opacity-50" :disabled="!form.agreeL2 || submitting" @click="submit">
        提交准入审核
      </button>
    </div>
  </div>
</template>
