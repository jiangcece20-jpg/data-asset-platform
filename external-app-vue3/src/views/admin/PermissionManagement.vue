<script setup lang="ts">
import PageHeader from '@/components/admin/PageHeader.vue'

const modules = [
  { name: '角色与权限', desc: '后台角色、菜单权限、数据范围（示意）' },
  { name: '账号与组织', desc: '运营账号、组织归属与启停（示意）' },
  { name: '操作审计', desc: '关键操作留痕与查询（示意）' }
]
</script>

<template>
  <div>
    <PageHeader
      title="权限管理"
      desc="本页用于表达运营后台还包含权限与账号等能力；找数买数原型能力集中在「运营管理」菜单下，此处不做真实权限配置。"
    />

    <div class="mt-4 grid gap-3 md:grid-cols-3">
      <div
        v-for="item in modules"
        :key="item.name"
        class="rounded-xl border border-dashed border-slate-200 bg-white p-4"
      >
        <div class="text-sm font-medium text-slate-800">{{ item.name }}</div>
        <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ item.desc }}</p>
        <div class="mt-3 text-[11px] text-slate-400">本期原型占位 · 不可配置</div>
      </div>
    </div>
  </div>
</template>
