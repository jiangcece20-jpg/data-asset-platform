<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import VersionHistoryList from '@/components/admin/config/VersionHistoryList.vue'
import { useConfigVersionStore } from '@/stores/configVersions'

const configVersions = useConfigVersionStore()
const cfgError = ref('')
const reviewerName = ref('')

const priceVersions = computed(() => configVersions.forDomain('member_price'))

function publishPrice(newPrice: number) {
  cfgError.value = ''
  try {
    const current = configVersions.currentPublished('member_price')
    configVersions.publish({
      domain: 'member_price',
      before: current?.after ?? { price: 299 },
      after: { price: newPrice },
      editor: 'op-1',
      reviewer: reviewerName.value || undefined,
      effectiveScope: '全部会员',
      affectedProductIds: ['membership']
    })
  } catch (e) {
    cfgError.value = (e as Error).message
  }
}

function rollbackPrice(version: number) {
  cfgError.value = ''
  try {
    configVersions.rollback('member_price', version, 'op-1', '价格误配回滚')
  } catch (e) {
    cfgError.value = (e as Error).message
  }
}
</script>

<template>
  <div>
    <PageHeader title="运营配置" desc="首页入口、频道、场景、推荐位、热门词、AI 引导问题" />

    <!-- 会员价格（版本化，需双人审核） -->
    <div data-testid="config-versioning" class="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-[13px] font-medium text-slate-700">会员价格（版本化，需双人审核）</span>
        <input v-model="reviewerName" data-testid="reviewer-input" placeholder="第二审核人" class="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
        <button class="rounded-lg bg-blue-600 px-3 py-1 text-[12px] text-white" data-testid="publish-price" @click="publishPrice(199)">发布调价至 199</button>
      </div>
      <div v-if="cfgError" data-testid="config-error" class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ cfgError }}</div>
      <VersionHistoryList :versions="priceVersions" @rollback="rollbackPrice" />
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">首页入口 / 频道</div>
      <div class="text-[12px] leading-relaxed text-slate-500">
        综合 APP 首页：找数唯一入口（已配置）<br />
        全部商品频道：行业报告 / 交互报表 / 数据集 / API / PQ-PIR / 联合分析 / 解决方案（7 个类型频道，已配置）
      </div>
    </div>
  </div>
</template>
