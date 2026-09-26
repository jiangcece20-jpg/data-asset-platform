<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { ConfigVersion } from '@/types/configGovernance'

defineProps<{ version: ConfigVersion }>()
</script>

<template>
  <div class="rounded-xl border border-ink-200 bg-white p-4" data-testid="config-diff">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-[13px] font-medium text-ink-700">版本 v{{ version.version }} · {{ version.domain }}</span>
      <StatusBadge dict="configVersion" :value="version.status" />
      <StatusBadge dict="reviewRequirement" :value="version.reviewRequirement" />
    </div>
    <div class="grid grid-cols-2 gap-2 text-[12px]">
      <div class="rounded-lg bg-ink-100 p-2">
        <div class="mb-1 text-ink-500">变更前</div>
        <pre class="whitespace-pre-wrap break-all text-ink-600">{{ JSON.stringify(version.before) }}</pre>
      </div>
      <div class="rounded-lg bg-success-50 p-2">
        <div class="mb-1 text-ink-500">变更后</div>
        <pre class="whitespace-pre-wrap break-all text-ink-700">{{ JSON.stringify(version.after) }}</pre>
      </div>
    </div>
    <div class="mt-2 text-[12px] text-ink-500">
      生效范围 {{ version.effectiveScope }} · 影响商品 {{ version.affectedProductIds.length }} · 编辑 {{ version.editor }}<span v-if="version.reviewer"> · 审核 {{ version.reviewer }}</span>
    </div>
  </div>
</template>
