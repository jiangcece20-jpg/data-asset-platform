<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import OperationsChannels from './operations/OperationsChannels.vue'
import OperationsHotWords from './operations/OperationsHotWords.vue'
import OperationsGuideQuestions from './operations/OperationsGuideQuestions.vue'
import OperationsRecommendations from './operations/OperationsRecommendations.vue'

// 各 Tab 的数据状态（在父级维护，跨 Tab 共享）
const hotWords = ref(['货运价格趋势', '公路物流行业月报', '港口吞吐量看板', '资格核验 API', '企业资质核验', '企业物流活跃度', '物流政策速递'])
const guideQuestions = ref([
  '货运价格趋势如何',
  '本周货运价格指数是多少',
  '公路物流行业月报',
  '港口吞吐量看板',
  '司机资格核验 API',
  '企业资质核验 API',
  '企业物流活跃度数据集',
  '有没有物流政策速递'
])

type Tab = 'channels' | 'hotwords' | 'guide' | 'recommendations'
const activeTab = ref<Tab>('channels')

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'channels', label: '频道与入口' },
  { key: 'hotwords', label: '热门词' },
  { key: 'guide', label: 'AI 引导问题' },
  { key: 'recommendations', label: '推荐位' }
]
</script>

<template>
  <div>
    <PageHeader title="运营配置" desc="管理首页入口、频道、热门词、AI 引导问题与商品推荐位" />

    <!-- Tab 切换 -->
    <div class="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
        :class="activeTab === tab.key ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- Tab 内容 -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <OperationsChannels v-if="activeTab === 'channels'" />
      <OperationsHotWords v-else-if="activeTab === 'hotwords'" v-model:hot-words="hotWords" />
      <OperationsGuideQuestions v-else-if="activeTab === 'guide'" v-model:guide-questions="guideQuestions" />
      <OperationsRecommendations v-else-if="activeTab === 'recommendations'" />
    </div>
  </div>
</template>
