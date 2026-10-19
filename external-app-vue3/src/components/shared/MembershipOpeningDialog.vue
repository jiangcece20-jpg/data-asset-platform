<script setup lang="ts">
import { nextTick, ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const panel = ref<HTMLElement>()
const copyMessage = ref('')
const customerService = '13102499703'
let previousFocus: HTMLElement | null = null
const professional = ['1+5自选品种产业数据，价值1.5万/年', '本企业固定社媒平台舆情/资讯订阅，价值1.5万/年', 'BI企业高级版10账号，价值3万/年', '数据采购版本价95折，省2.5万/年', '数据服务应用2个服务项，价值0.6万/年', '企业定制看板2张，价值10万/年', '统一技术支持']
const intelligent = ['1+10自选品种产业数据，价值3万/年', '多企业+多社媒平台定制化订阅，价值4万/年', 'AI+BI专业版20账号，价值10万/年', '数据采购版本价88折，省6万/年', '数据服务应用5个服务项，价值1.5万/年', '真实货源寻源支持与推荐20次，价值10万/年', '专属1对1客服']
function close() { emit('update:open', false) }
async function copyContact() {
  try { await navigator.clipboard.writeText(customerService); copyMessage.value = '客服电话已复制' }
  catch { copyMessage.value = `客服电话：${customerService}` }
}
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = panel.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
  if (!buttons?.length) return
  const first = buttons[0]!, last = buttons[buttons.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(() => props.open, async open => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement
    copyMessage.value = ''
    await nextTick()
    panel.value?.querySelector('button')?.focus()
  } else previousFocus?.focus()
})
onBeforeUnmount(() => { if (props.open) previousFocus?.focus() })
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-8" @click.self="close">
    <section ref="panel" role="dialog" aria-modal="true" aria-label="开通会员" class="relative max-h-[92vh] w-full max-w-6xl overflow-auto rounded-xl bg-[#fff7e8] p-5 pt-12 sm:p-8 sm:pt-14" @keydown.esc="close" @keydown="trapFocus">
      <button aria-label="关闭会员开通弹窗" class="absolute right-5 top-3 text-2xl text-ink-400" @click="close">×</button>
      <div class="grid gap-5 md:grid-cols-2">
        <article class="rounded-xl border border-ink-100 bg-white p-5 sm:p-7">
          <div class="flex items-center justify-between"><h2 class="text-2xl font-bold text-ink-900">专业版</h2><span class="rounded bg-blue-600 px-3 py-1 text-sm text-white">当前可选</span></div>
          <div class="mt-5 text-orange-600">¥ <strong class="text-4xl">49,800</strong><span class="ml-3 text-sm text-ink-400">/年</span></div>
          <p class="mt-2 text-sm text-ink-400 line-through">¥19.1万/年/10账号</p>
          <button class="mt-5 w-full rounded-lg bg-[#2d211e] px-3 py-5 text-sm text-white sm:text-base" @click="copyContact">开通权限请联系企业客服：{{ customerService }} <span aria-hidden="true">▢</span></button>
          <ul class="mt-6 space-y-4 text-sm leading-relaxed text-ink-600"><li v-for="item in professional" :key="item">✓ {{ item }}</li></ul>
        </article>
        <article class="rounded-xl border border-ink-100 bg-[#f7f7f7] p-5 text-ink-400 sm:p-7">
          <div class="flex items-center justify-between"><h2 class="text-2xl font-bold">智能版</h2><span class="rounded bg-ink-200 px-3 py-1 text-sm">敬请期待</span></div>
          <div class="mt-5">¥ <strong class="text-4xl">99,800</strong><span class="ml-3 text-sm">/年</span></div>
          <p class="mt-2 text-sm line-through">¥38万/年/20账号</p>
          <p class="mt-5 rounded-lg bg-ink-200 px-3 py-5 text-center text-sm sm:text-base">2026年12月上线</p>
          <ul class="mt-6 space-y-4 text-sm leading-relaxed"><li v-for="item in intelligent" :key="item">✓ {{ item }}</li></ul>
        </article>
      </div>
      <p v-if="copyMessage" role="status" class="mt-3 text-center text-sm text-ink-700">{{ copyMessage }}</p>
    </section>
  </div>
</template>
