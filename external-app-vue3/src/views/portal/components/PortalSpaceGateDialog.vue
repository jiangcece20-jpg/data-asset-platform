<script setup lang="ts">
/**
 * 可信空间跳转门禁弹窗（PRD §7.5）
 * - login：游客硬门禁，要求先登录
 * - auth-notice：个人用户软提示，可继续浏览或去企业认证
 * - browse-mock：原型模拟浏览模式跳转成功态
 */
defineProps<{ mode: 'login' | 'auth-notice' | 'browse-mock' }>()

const emit = defineEmits<{ login: []; continueBrowse: []; goAuth: []; close: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <!-- 游客：要求先登录 -->
      <template v-if="mode === 'login'">
        <div class="text-3xl">🔐</div>
        <div class="mt-3 text-base font-semibold text-slate-900">请先登录</div>
        <p class="mt-2 text-sm leading-relaxed text-slate-500">
          可信空间对游客仅开放 10 条数据浏览，且无法查看商品详情。登录后即可正常前往。
        </p>
        <div class="mt-5 space-y-2">
          <button
            class="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            @click="emit('login')"
          >立即登录</button>
          <button
            class="w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            @click="emit('close')"
          >取消</button>
        </div>
      </template>

      <!-- 个人用户：软提示正式采购需企业认证 -->
      <template v-else-if="mode === 'auth-notice'">
        <div class="text-3xl">🏢</div>
        <div class="mt-3 text-base font-semibold text-slate-900">前往可信空间</div>
        <p class="mt-2 text-sm leading-relaxed text-slate-500">
          你可以直接进入可信空间浏览商品。请注意：<span class="font-medium text-amber-600">正式采购时需要完成企业认证</span>，个人身份无法下单。
        </p>
        <div class="mt-5 space-y-2">
          <button
            class="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            @click="emit('continueBrowse')"
          >继续前往浏览</button>
          <button
            class="w-full rounded-lg border border-brand-300 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            @click="emit('goAuth')"
          >去企业认证</button>
          <button
            class="w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            @click="emit('close')"
          >取消</button>
        </div>
      </template>

      <!-- 原型模拟：浏览模式跳转成功 -->
      <template v-else>
        <div class="text-3xl">🔗</div>
        <div class="mt-3 text-base font-semibold text-slate-900">已前往可信空间（浏览模式）</div>
        <p class="mt-2 text-sm leading-relaxed text-slate-500">
          原型模拟：已在新窗口打开可信空间浏览页，不携带购买意图。正式采购请先完成企业认证后从本页发起。
        </p>
        <button
          class="mt-5 w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          @click="emit('close')"
        >知道了</button>
      </template>
    </div>
  </div>
</template>
