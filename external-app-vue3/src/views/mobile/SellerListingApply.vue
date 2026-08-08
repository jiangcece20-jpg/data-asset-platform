<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSellerMarketStore } from '@/stores/sellerMarket'

const props = defineProps<{
  embedded?: boolean
  variant?: 'mobile' | 'portal'
}>()
const emit = defineEmits<{ done: [] }>()

const route = useRoute()
const router = useRouter()
const seller = useSellerMarketStore()
const catalog = useCatalogStore()

const artifactId = ref(seller.listableArtifacts[0]?.id || '')
const title = ref('')
const subtitle = ref('')
const price = ref(99)
const complianceSummary = ref('无个人信息对外售卖；来源与许可已声明')
const error = ref('')
const submitting = ref(false)

const artifact = computed(() => seller.listableArtifacts.find((a) => a.id === artifactId.value))
const sourceProduct = computed(() => {
  const id = String(route.query.productId || '')
  return id ? catalog.byId(id) : undefined
})

watch(artifact, (a) => {
  if (!a) return
  if (sourceProduct.value?.type === 'report') {
    title.value = `${sourceProduct.value.name} · 衍生看板`
    subtitle.value = `基于已购报告 ${sourceProduct.value.typeDetail.report?.version || ''} 加工`
    return
  }
  title.value = a.name
  subtitle.value = `用数对象 ${a.version} · ${a.dataProvenance === 'owned' ? '自有数据' : '已购衍生'}`
}, { immediate: true })

watch(sourceProduct, (product) => {
  if (!product || product.type !== 'report') return
  title.value = `${product.name} · 衍生看板`
  subtitle.value = `基于已购报告 ${product.typeDetail.report?.version || ''} 加工`
}, { immediate: true })

function submit() {
  error.value = ''
  if (!seller.isApprovedSeller) {
    error.value = '请先完成卖家准入'
    return
  }
  submitting.value = true
  try {
    seller.submitListing({
      artifactId: artifactId.value,
      title: title.value.trim(),
      subtitle: subtitle.value.trim(),
      price: Number(price.value),
      complianceSummary: complianceSummary.value.trim()
    })
    if (props.embedded) emit('done')
    else router.replace({ path: '/app/mine', query: { menu: 'seller', sellerTab: 'listings' } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div :class="embedded ? 'mt-3 space-y-3' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!embedded" title="上架申请" />
    <div :class="embedded ? 'space-y-3' : 'space-y-3 px-4 pt-3'">
      <div class="rounded-2xl border border-slate-100 bg-white p-3 text-[12px] text-slate-600 shadow-card">
        <template v-if="sourceProduct?.type === 'report'">
          来自「我的数据」个人报告：{{ sourceProduct.name }}。可选择用数对象后提交上架审核。
        </template>
        <template v-else>
          双入口演示：本页为卖家上架入口。用数侧「申请上架到 APP」会落到同一审核权威。
        </template>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <label class="block text-[12px] text-slate-500">可上架对象（用数）
          <select v-model="artifactId" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
            <option v-for="a in seller.listableArtifacts" :key="a.id" :value="a.id">
              {{ a.name }} · {{ a.version }} · {{ a.dataProvenance === 'owned' ? '自有' : '衍生' }}
            </option>
          </select>
        </label>
        <div v-if="artifact" class="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          {{ artifact.licenseSummary }} · 更新于 {{ artifact.updatedAt }}
        </div>
        <label class="block text-[12px] text-slate-500">商品标题
          <input v-model="title" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">卖点摘要
          <input v-model="subtitle" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">价格（元）
          <input v-model.number="price" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">合规摘要（前台可见）
          <textarea v-model="complianceSummary" rows="2" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
      </div>

      <div v-if="error" class="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>
      <button class="w-full rounded-xl bg-orange-500 py-3 text-[14px] font-medium text-white disabled:opacity-50" :disabled="submitting" @click="submit">
        提交上架审核
      </button>
    </div>
  </div>
</template>
