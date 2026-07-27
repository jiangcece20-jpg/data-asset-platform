<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { typeMeta, originMeta, dealChannelMeta } from '@/utils/productMeta'
import type { ProductOrigin } from '@/types/domain'

const router = useRouter()
const catalog = useCatalogStore()
const trustedSpaceCatalog = useTrustedSpaceCatalogStore()

const originFilter = ref<ProductOrigin | ''>('')
const origins: ProductOrigin[] = ['asset_platform', 'app_content', 'trusted_space']

const list = computed(() => (originFilter.value ? catalog.products.filter((p) => p.origin === originFilter.value) : catalog.products))

async function syncSpaceProducts() {
  await trustedSpaceCatalog.syncAll()
}
</script>

<template>
  <div>
    <PageHeader title="商品中心" desc="双来源列表、空间同步、APP 商品、增强信息、上下架" />

    <div class="mb-3 flex items-center justify-between">
      <div class="flex gap-1.5">
        <button
          class="rounded-full border px-3 py-1.5 text-[12px]"
          :class="!originFilter ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500'"
          @click="originFilter = ''"
        >
          全部（{{ catalog.products.length }}）
        </button>
        <button
          v-for="s in origins"
          :key="s"
          class="rounded-full border px-3 py-1.5 text-[12px]"
          :class="originFilter === s ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500'"
          @click="originFilter = s"
        >
          {{ originMeta[s] }}（{{ catalog.products.filter((p) => p.origin === s).length }}）
        </button>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[12px] text-slate-400">
          <template v-if="trustedSpaceCatalog.syncing">空间商品同步中…</template>
          <template v-else-if="trustedSpaceCatalog.error">同步失败：{{ trustedSpaceCatalog.error }}</template>
          <template v-else-if="trustedSpaceCatalog.lastSuccessAt">最近成功：{{ trustedSpaceCatalog.lastSuccessAt }}</template>
          <template v-else>尚未同步空间商品</template>
        </span>
        <button
          class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="trustedSpaceCatalog.syncing"
          @click="syncSpaceProducts"
        >
          🔄 同步空间商品
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="bg-slate-50 text-xs text-slate-400">
          <tr>
            <th class="px-4 py-2.5 font-medium">商品名称</th>
            <th class="px-4 py-2.5 font-medium">类型</th>
            <th class="px-4 py-2.5 font-medium">来源</th>
            <th class="px-4 py-2.5 font-medium">前台状态</th>
            <th class="px-4 py-2.5 font-medium">交易归属</th>
            <th class="px-4 py-2.5 font-medium">后台状态</th>
            <th class="px-4 py-2.5 font-medium">更新时间</th>
            <th class="px-4 py-2.5 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in list" :key="p.id" class="border-t border-slate-100 hover:bg-slate-50">
            <td class="px-4 py-2.5 font-medium text-slate-800">{{ p.name }}</td>
            <td class="px-4 py-2.5 text-slate-500">{{ typeMeta[p.type].icon }} {{ typeMeta[p.type].label }}</td>
            <td class="px-4 py-2.5 text-slate-500">{{ originMeta[p.origin] }}</td>
            <td class="px-4 py-2.5"><StatusBadge dict="availability" :value="p.availability" /></td>
            <td class="px-4 py-2.5 text-slate-500">{{ dealChannelMeta[p.dealChannel].label }}</td>
            <td class="px-4 py-2.5"><StatusBadge dict="product" :value="p.status" /></td>
            <td class="px-4 py-2.5 text-slate-400">{{ p.updatedAt }}</td>
            <td class="px-4 py-2.5">
              <button class="text-brand-600 hover:underline" @click="router.push(`/admin/products/${p.id}`)">编辑 ›</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
