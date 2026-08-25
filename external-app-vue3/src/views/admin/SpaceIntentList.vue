<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { OPS_STATUS_LABELS } from '@/domain/spaceIntent'
import { useCatalogStore } from '@/stores/catalog'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import type { SpaceIntentOpsStatus } from '@/types/spaceIntent'

const router = useRouter()
const intents = useSpaceIntentStore()
const catalog = useCatalogStore()

const filterStatus = ref('')
const filterKind = ref('')
const filterSpaceName = ref('')

const STATUS_OPTIONS: SpaceIntentOpsStatus[] = [
  'unclaimed',
  'pending_enterprise',
  'space_dealing',
  'pending_delivery',
  'completed',
  'closed'
]

const rows = computed(() =>
  intents.list
    .filter((item) => {
      if (filterStatus.value && item.opsStatus !== filterStatus.value) return false
      const product = catalog.byId(item.productId)
      if (filterKind.value && product?.spaceKind !== filterKind.value) return false
      if (filterSpaceName.value && product?.spaceName !== filterSpaceName.value) return false
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
)

const spaceNames = computed(() =>
  [...new Set(
    intents.list
      .map((item) => catalog.byId(item.productId)?.spaceName)
      .filter((name): name is string => Boolean(name))
  )]
)

function spaceKindLabel(productId: string) {
  const kind = catalog.byId(productId)?.spaceKind
  if (kind === 'owned') return '自有'
  if (kind === 'federated') return '互联'
  return '—'
}

function goToDetail(id: string) {
  router.push(`/admin/space-intents/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="空间意向单" desc="运营领取、确认企业，并代办空间成交与数据集接入" />

    <div class="mb-3 flex flex-wrap gap-2">
      <select v-model="filterStatus" data-testid="filter-ops-status" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部状态</option>
        <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">{{ OPS_STATUS_LABELS[status] }}</option>
      </select>
      <select v-model="filterKind" data-testid="filter-space-kind" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部来源</option>
        <option value="owned">自有</option>
        <option value="federated">互联</option>
      </select>
      <select v-model="filterSpaceName" data-testid="filter-space-name" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部空间</option>
        <option v-for="name in spaceNames" :key="name" :value="name">{{ name }}</option>
      </select>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400">
          <tr>
            <th class="px-3 py-2">商品</th>
            <th class="px-3 py-2">空间</th>
            <th class="px-3 py-2">来源</th>
            <th class="px-3 py-2">状态</th>
            <th class="px-3 py-2">联系人</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in rows"
            :key="item.id"
            data-testid="space-intent-row"
            :data-id="item.id"
            class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
            @click="goToDetail(item.id)"
          >
            <td class="px-3 py-2 text-slate-700">{{ catalog.byId(item.productId)?.name || item.productId }}</td>
            <td class="px-3 py-2 text-slate-600">{{ catalog.byId(item.productId)?.spaceName || '—' }}</td>
            <td class="px-3 py-2 text-slate-600">{{ spaceKindLabel(item.productId) }}</td>
            <td class="px-3 py-2 text-slate-600">{{ OPS_STATUS_LABELS[item.opsStatus] }}</td>
            <td class="px-3 py-2 text-slate-600">{{ item.contactName }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length" class="py-6 text-center text-[12px] text-slate-400">暂无空间意向单</div>
    </div>
  </div>
</template>
