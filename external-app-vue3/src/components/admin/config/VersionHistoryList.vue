<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { ConfigVersion } from '@/types/configGovernance'

defineProps<{ versions: ConfigVersion[] }>()
const emit = defineEmits<{ rollback: [version: number] }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" data-testid="version-history">
    <div class="mb-2 text-[13px] font-medium text-slate-700">版本历史（不可变）</div>
    <div v-for="v in versions" :key="v.id" data-testid="version-row" :data-version="v.version" class="flex items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
      <span class="text-slate-600">v{{ v.version }}</span>
      <StatusBadge dict="configVersion" :value="v.status" />
      <span v-if="v.rolledBackFromVersion" class="text-slate-400">← 回滚自 v{{ v.rolledBackFromVersion }}</span>
      <button
        v-if="v.status !== 'published'"
        class="ml-auto rounded bg-amber-500 px-2 py-0.5 text-white"
        data-testid="rollback-btn"
        @click="emit('rollback', v.version)"
      >回滚到此版本</button>
    </div>
    <div v-if="!versions.length" class="py-3 text-center text-[12px] text-slate-400">暂无版本</div>
  </div>
</template>
