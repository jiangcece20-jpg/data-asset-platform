<script setup lang="ts">
import { computed } from 'vue'
import type { SpaceSyncMeta } from '@/types/domain'

const props = defineProps<{
  spaceMeta?: SpaceSyncMeta
}>()

const hasDeclarations = computed(() => {
  const m = props.spaceMeta
  if (!m) return false
  return !!(m.complianceDeclarationUrl || m.dataSourceDeclarationUrl || m.dataSampleUrl || m.securityClassificationUrl || m.qualityAssessmentUrl)
})
</script>

<template>
  <!-- 声明信息 -->
  <div v-if="spaceMeta && hasDeclarations" class="space-y-3">
    <h3 class="text-sm font-semibold text-slate-800">声明信息
      <span class="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">来自可信空间</span>
    </h3>
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div v-if="spaceMeta.complianceDeclarationUrl" class="flex items-center gap-2">
        <span class="text-slate-400">合法合规声明：</span>
        <a :href="spaceMeta.complianceDeclarationUrl" target="_blank" class="text-blue-600 hover:underline">查看文件</a>
      </div>
      <div v-if="spaceMeta.dataSourceDeclarationUrl" class="flex items-center gap-2">
        <span class="text-slate-400">数据来源声明：</span>
        <a :href="spaceMeta.dataSourceDeclarationUrl" target="_blank" class="text-blue-600 hover:underline">查看文件</a>
      </div>
      <div v-if="spaceMeta.dataSampleUrl" class="flex items-center gap-2">
        <span class="text-slate-400">数据样例：</span>
        <a :href="spaceMeta.dataSampleUrl" target="_blank" class="text-blue-600 hover:underline">查看文件</a>
      </div>
      <div v-if="spaceMeta.securityClassificationUrl" class="flex items-center gap-2">
        <span class="text-slate-400">安全分类分级：</span>
        <a :href="spaceMeta.securityClassificationUrl" target="_blank" class="text-blue-600 hover:underline">查看文件</a>
      </div>
      <div v-if="spaceMeta.qualityAssessmentUrl" class="col-span-2 flex items-center gap-2">
        <span class="text-slate-400">数据质量、产品价值评估：</span>
        <a :href="spaceMeta.qualityAssessmentUrl" target="_blank" class="text-blue-600 hover:underline">查看报告</a>
      </div>
    </div>
  </div>

  <!-- 提供方信息 -->
  <div v-if="spaceMeta?.providerName" class="space-y-3">
    <h3 class="text-sm font-semibold text-slate-800">提供方信息
      <span class="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">来自可信空间</span>
    </h3>
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div>
        <span class="text-slate-400">提供方名称：</span>
        <span class="text-slate-700">{{ spaceMeta.providerName }}</span>
      </div>
      <div v-if="spaceMeta.providerEntityType">
        <span class="text-slate-400">主体类型：</span>
        <span class="text-slate-700">{{ spaceMeta.providerEntityType }}</span>
      </div>
      <div v-if="spaceMeta.providerEntityInfo" class="col-span-2">
        <span class="text-slate-400">主体信息：</span>
        <span class="text-slate-700">{{ spaceMeta.providerEntityInfo }}</span>
      </div>
      <div v-if="spaceMeta.providerBrief" class="col-span-2">
        <span class="text-slate-400">提供方简介：</span>
        <span class="text-slate-700">{{ spaceMeta.providerBrief }}</span>
      </div>
      <div v-if="spaceMeta.authorizationLetterUrl" class="flex items-center gap-2">
        <span class="text-slate-400">授权委托书：</span>
        <a :href="spaceMeta.authorizationLetterUrl" target="_blank" class="text-blue-600 hover:underline">查看文件</a>
      </div>
    </div>
  </div>
</template>
