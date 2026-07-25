<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'

const router = useRouter()
const catalog = useCatalogStore()

const contentProducts = computed(() => catalog.products.filter((p) => p.type === 'report' || p.type === 'dashboard'))
</script>

<template>
  <div>
    <PageHeader title="内容中心" desc="报告正文/版本、报表绑定、预览、下载/导出（资产选料与出域审批仍在数据资产管理平台完成）" />

    <div class="space-y-3">
      <div v-for="p in contentProducts" :key="p.id" class="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[14px] font-medium text-slate-800">{{ p.name }}</span>
            <StatusBadge dict="availability" :value="p.availability" />
          </div>
          <div class="mt-1 text-[12px] text-slate-400">
            {{ p.type === 'report' ? `版本 ${p.typeDetail.report?.version} · ${p.typeDetail.report?.blocks.length || 0} 个内容区块` : `更新周期 ${p.typeDetail.dashboard?.updateCycle}` }}
          </div>
        </div>
        <button class="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] text-slate-600" @click="router.push(`/admin/content/${p.id}`)">编辑内容 ›</button>
      </div>
    </div>
  </div>
</template>
