<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import VersionHistoryList from '@/components/admin/config/VersionHistoryList.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useConfigVersionStore } from '@/stores/configVersions'

const catalog = useCatalogStore()
const configVersions = useConfigVersionStore()
const cfgError = ref('')
const reviewerName = ref('')

const priceVersions = computed(() => configVersions.forDomain('member_price'))

// 演示：会员价格调整（需双人审核）。
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

// 热门词与引导问题按找数场景对齐（与 App 首屏 ai.ts 的 guideQuestions 一致）
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
const newWord = ref('')

function addWord() {
  if (!newWord.value.trim()) return
  hotWords.value.push(newWord.value.trim())
  newWord.value = ''
}
function removeWord(i: number) {
  hotWords.value.splice(i, 1)
}

function toggleRecommend(productId: string, current: boolean) {
  const p = catalog.byId(productId)
  if (p) p.recommendSlot = !current
}
</script>

<template>
  <div>
    <PageHeader title="运营配置" desc="首页入口、频道、场景、推荐位、热门词、AI 引导问题" />

    <!-- 配置版本化：草稿 → 审核 → 发布 → 历史/回滚 -->
    <div data-testid="config-versioning" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-[13px] font-medium text-slate-700">会员价格（版本化，需双人审核）</span>
        <input v-model="reviewerName" data-testid="reviewer-input" placeholder="第二审核人" class="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
        <button class="rounded-lg bg-blue-600 px-3 py-1 text-[12px] text-white" data-testid="publish-price" @click="publishPrice(199)">发布调价至 199</button>
      </div>
      <div v-if="cfgError" data-testid="config-error" class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ cfgError }}</div>
      <VersionHistoryList :versions="priceVersions" @rollback="rollbackPrice" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">首页入口 / 频道</div>
        <div class="text-[12px] leading-relaxed text-slate-500">
          综合 APP 首页：找数唯一入口（已配置）<br />
          全部商品频道：行业报告 / 交互报表 / 数据集 / API / PQ-PIR / 联合分析 / 解决方案（7 个类型频道，已配置）
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">热门词</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="(w, i) in hotWords" :key="w" class="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] text-slate-600">
            {{ w }}
            <button class="text-slate-400" @click="removeWord(i)">×</button>
          </span>
        </div>
        <div class="mt-2 flex gap-1.5">
          <input v-model="newWord" placeholder="新增热门词" class="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]" @keydown.enter="addWord" />
          <button class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="addWord">添加</button>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">AI 引导问题</div>
        <ul class="space-y-1 text-[12px] text-slate-600">
          <li v-for="q in guideQuestions" :key="q">💬 {{ q }}</li>
        </ul>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">推荐位</div>
        <div v-for="p in catalog.published" :key="p.id" class="flex items-center justify-between py-1 text-[12px]">
          <span class="text-slate-600">{{ p.name }}</span>
          <button
            class="rounded-full px-2 py-0.5 text-[11px]"
            :class="p.recommendSlot ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'"
            @click="toggleRecommend(p.id, !!p.recommendSlot)"
          >
            {{ p.recommendSlot ? '推荐中' : '未推荐' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
