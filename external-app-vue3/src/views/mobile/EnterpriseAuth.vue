<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const redirect = computed(() => String(route.query.redirect || '/app/mine/enterprise'))

function startAuth() {
  user.startEnterpriseAuth()
}
function approveAuth() {
  user.completeEnterpriseAuth()
}
function continueFlow() {
  router.push(redirect.value)
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="企业认证" />

    <div class="px-4 pt-3">
      <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-700">企业试用与可信空间购买前置条件</div>
        <p class="mt-1 text-[12px] leading-relaxed text-slate-400">完成企业认证后，可申请企业试用、发起可信空间购买，并与企业成员共享已购内容。</p>

        <div v-if="user.context.enterpriseAuthStatus === 'none'" class="mt-4 space-y-2.5">
          <div>
            <div class="mb-1 text-[11px] text-slate-400">企业名称</div>
            <div class="rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700">{{ user.enterprise.name }}</div>
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">统一社会信用代码</div>
            <div class="rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-400">91310000MA1G****12（示例）</div>
          </div>
          <button class="mt-2 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="startAuth">提交认证</button>
        </div>

        <div v-else-if="user.context.enterpriseAuthStatus === 'pending'" class="mt-4 rounded-xl bg-amber-50 p-3 text-center">
          <div class="text-[13px] text-amber-700">⏳ 认证审核中，预计 1 个工作日内完成</div>
          <button class="mt-3 w-full rounded-full bg-amber-500 py-2.5 text-[13px] font-medium text-white" @click="approveAuth">
            模拟：审核通过（演示用）
          </button>
        </div>

        <div v-else class="mt-4 rounded-xl bg-emerald-50 p-3 text-center">
          <div class="text-[13px] font-medium text-emerald-700">✅ 企业认证已通过</div>
          <div class="mt-1 text-[12px] text-emerald-600">已恢复原商品上下文，可继续操作</div>
          <button class="mt-3 w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white" @click="continueFlow">继续</button>
        </div>
      </div>
    </div>
  </div>
</template>
