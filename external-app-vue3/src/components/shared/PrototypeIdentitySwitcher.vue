<script setup lang="ts">
import { computed } from 'vue'
import { currentPurchaseSubject, hasEnterprisePurchaseIdentity } from '@/domain/purchaseIdentity'
import { useUserStore } from '@/stores/user'

const user = useUserStore()

const options = [
  { id: 'personal' as const, label: '个人', hint: '陈静' },
  { id: 'enterprise_admin' as const, label: '企业管理员', hint: '万联' },
  { id: 'enterprise_member' as const, label: '企业成员', hint: '王涛' }
]

const active = computed(() => {
  if (!hasEnterprisePurchaseIdentity(user) || currentPurchaseSubject(user) === 'personal') return 'personal'
  return user.currentEnterpriseMember?.role === 'admin' ? 'enterprise_admin' : 'enterprise_member'
})
</script>

<template>
  <div data-testid="prototype-identity-switcher" class="flex min-w-0 flex-1 items-center gap-2">
    <span class="shrink-0 text-[11px] text-violet-600">原型身份</span>
    <div class="flex min-w-0 flex-wrap items-center gap-1">
      <button
        v-for="option in options"
        :key="option.id"
        :data-testid="`prototype-identity-${option.id}`"
        class="rounded-full px-2 py-0.5 text-[11px] transition"
        :class="active === option.id ? 'bg-violet-600 text-white' : 'bg-white text-violet-700'"
        @click="user.switchMockPurchaseIdentity(option.id)"
      >
        {{ option.label }}
        <span class="hidden sm:inline">· {{ option.hint }}</span>
      </button>
    </div>
    <span class="hidden truncate text-[11px] text-violet-400 lg:inline">先切换再购买，支付方式随身份变化</span>
  </div>
</template>
