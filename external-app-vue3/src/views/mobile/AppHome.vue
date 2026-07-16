<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const placeholderModules = [
  { icon: '🚚', label: '运单' },
  { icon: '💳', label: '钱包' },
  { icon: '🧾', label: '发票' },
  { icon: '📦', label: '货源' },
  { icon: '🛠️', label: '车辆服务' },
  { icon: '📢', label: '消息' },
  { icon: '🗺️', label: '地图追踪' },
  { icon: '⚙️', label: '设置' }
]
</script>

<template>
  <div class="min-h-full bg-gradient-to-b from-brand-50 to-slate-50 pb-6">
    <div class="px-4 pb-3 pt-4">
      <div class="text-lg font-semibold text-slate-900">综合对外 APP</div>
      <div class="text-xs text-slate-400">首页仅示意其他模块，本原型不重构综合 APP 其余功能</div>
    </div>

    <!-- 找数唯一入口 -->
    <div class="px-4">
      <button
        class="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-left text-white shadow-lg active:scale-[0.99]"
        @click="router.push('/app/discover')"
      >
        <div class="text-xs font-medium text-white/80">唯一入口 · 问数 找数 买数</div>
        <div class="mt-1 text-xl font-bold">🔍 找数</div>
        <div class="mt-1.5 text-[13px] leading-snug text-white/85">说说你想了解的问题，或描述你需要的数据</div>
        <div class="mt-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs">立即体验 →</div>
      </button>
    </div>

    <!-- 其他模块示意（灰色占位，不可交互） -->
    <div class="mt-6 px-4">
      <div class="mb-2 text-xs font-medium text-slate-400">其他功能模块（示意，不在本原型范围）</div>
      <div class="grid grid-cols-4 gap-3">
        <div v-for="m in placeholderModules" :key="m.label" class="flex flex-col items-center gap-1 opacity-40">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">{{ m.icon }}</div>
          <div class="text-[11px] text-slate-500">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <div class="mx-4 mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-[11px] leading-relaxed text-slate-400">
      验收标准：综合 APP 首页只示意并标出"找数"入口，不重构其他功能。
    </div>
  </div>
</template>
