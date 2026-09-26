<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  isValidDemandPriceRange,
  resolveDemandSubmitterSnapshot,
  sanitizeDemandPriceRangeInput
} from '@/domain/demandSubmitFields'
import { useDemandStore } from '@/stores/demand'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ variant: 'mobile' | 'portal'; autoOpen?: boolean }>()

const router = useRouter()
const demand = useDemandStore()
const user = useUserStore()

type Tab = 'list' | 'form'
const activeTab = ref<Tab>('list')
// PC 端：提报需求改为弹框
const modalOpen = ref(false)

watch(
  () => props.autoOpen,
  (open) => {
    if (open && props.variant === 'portal') {
      modalOpen.value = true
      // 打开后清掉 query，避免菜单切回时重复弹窗
      if (router.currentRoute.value.query.submitDemand) {
        const query = { ...router.currentRoute.value.query }
        delete query.submitDemand
        void router.replace({ query })
      }
    }
  },
  { immediate: true }
)

function emptyForm() {
  const snapshot = resolveDemandSubmitterSnapshot(user.context)
  return {
    title: '',
    description: '',
    priceRange: '',
    contactName: snapshot.defaultContactName,
    contact: user.context.phone || ''
  }
}

const form = ref(emptyForm())
const canSubmit = computed(
  () => form.value.title.trim().length > 0 && isValidDemandPriceRange(form.value.priceRange)
)

function setPriceRange(raw: string) {
  form.value.priceRange = sanitizeDemandPriceRangeInput(raw)
}

function onPriceRangeInput(event: Event) {
  setPriceRange((event.target as HTMLInputElement).value)
}

const myDemands = computed(() =>
  demand.list
    .filter((item) => item.ownerId === user.context.currentMemberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

function formatDate(dateStr: string) {
  return dateStr.replace('T', ' ').slice(0, 16)
}

function submitDemand() {
  if (!canSubmit.value) return
  demand.submit({
    question: form.value.title,
    filters: [],
    browsedProductIds: [],
    objectDesc: form.value.title,
    region: '',
    timeRange: '',
    updateFreq: '',
    scenario: form.value.description,
    expectedDelivery: '',
    priceRange: form.value.priceRange,
    contactName: form.value.contactName,
    contact: form.value.contact
  })
  form.value = emptyForm()
  activeTab.value = 'list'
  modalOpen.value = false
}

function openSubmit() {
  if (props.variant === 'portal') {
    form.value = emptyForm()
    modalOpen.value = true
  } else {
    activeTab.value = 'form'
  }
}

function closeModal() {
  modalOpen.value = false
}

function goProduct(productId: string) {
  router.push(props.variant === 'portal' ? `/portal/product/${productId}` : `/app/product/${productId}`)
}
</script>

<template>
  <div>
    <!-- 移动端：Tab 切换 -->
    <div v-if="variant === 'mobile'" class="mb-3 flex gap-1 rounded-xl bg-ink-100 p-1">
      <button
        data-testid="demands-tab-list"
        class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
        :class="activeTab === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500'"
        @click="activeTab = 'list'"
      >
        我的提报
      </button>
      <button
        data-testid="demands-tab-form"
        class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
        :class="activeTab === 'form' ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500'"
        @click="openSubmit"
      >
        提报需求
      </button>
    </div>

    <!-- PC 端：标题 + 提报按钮 -->
    <div v-else class="mb-3 flex items-center justify-between">
      <div class="text-sm text-ink-500">共 {{ myDemands.length }} 条提报记录</div>
      <button
        data-testid="demands-open-submit"
        class="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-500 px-3.5 text-[13px] font-medium text-white transition hover:bg-brand-600"
        @click="openSubmit"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        提报需求
      </button>
    </div>

    <!-- 需求列表 -->
    <div v-if="variant === 'mobile' ? activeTab === 'list' : true" :class="variant === 'mobile' ? 'space-y-2.5' : 'space-y-2'">
      <div
        v-if="!myDemands.length"
        :class="variant === 'mobile'
          ? 'rounded-2xl border border-dashed border-ink-200 bg-white py-10 text-center'
          : 'rounded-xl border border-dashed border-ink-200 bg-white py-12 text-center'"
      >
        <svg class="mx-auto h-9 w-9 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <div class="mt-2" :class="variant === 'mobile' ? 'text-[13px] text-ink-500' : 'text-sm text-ink-500'">暂无提报记录</div>
        <div :class="variant === 'mobile' ? 'mt-1 text-[12px] text-ink-500' : 'mt-1 text-xs text-ink-500'">找数无结果时可提报需求，运营会跟进推荐或定制</div>
        <button
          :data-testid="variant === 'mobile' ? 'demands-empty-submit' : 'demands-empty-submit'"
          :class="variant === 'mobile'
            ? 'mt-4 rounded-full bg-brand-500 px-6 py-2 text-[13px] font-medium text-white'
            : 'mt-4 inline-flex h-9 items-center rounded-lg bg-brand-500 px-5 text-[13px] font-medium text-white transition hover:bg-brand-600'"
          @click="openSubmit"
        >
          立即提报
        </button>
      </div>

      <div
        v-for="item in myDemands"
        :key="item.id"
        data-testid="demand-item"
        :class="variant === 'mobile'
          ? 'rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card'
          : 'ui-card p-4'"
      >
        <div class="flex items-start justify-between gap-2">
          <span :class="variant === 'mobile' ? 'text-[13px] font-medium text-ink-900' : 'text-sm font-medium text-ink-900'">{{ item.question }}</span>
          <StatusBadge :dict="variant === 'mobile' ? 'demand' : 'demandStatus'" :value="item.status" />
        </div>
        <div :class="variant === 'mobile' ? 'mt-1.5 space-y-0.5 text-[11px] text-ink-500' : 'mt-1.5 space-y-0.5 text-xs text-ink-500'">
          <div v-if="item.scenario">需求描述：{{ item.scenario }}</div>
          <div v-if="item.contactName">联系人：{{ item.contactName }}</div>
          <div v-if="item.priceRange">期望价格区间：{{ item.priceRange }}</div>
          <div v-if="item.contact">联系方式：{{ item.contact }}</div>
          <div>{{ formatDate(item.createdAt) }}</div>
        </div>
        <div v-if="item.feedbackMessage" :class="variant === 'mobile' ? 'mt-2 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-700' : 'mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700'">
          {{ item.feedbackMessage }}
        </div>
        <div v-if="item.recommendedProductIds?.length" class="mt-2 flex flex-wrap items-center gap-1.5">
          <span :class="variant === 'mobile' ? 'text-[11px] text-ink-500' : 'text-xs text-ink-500'">推荐商品：</span>
          <button
            v-for="pid in item.recommendedProductIds"
            :key="pid"
            class="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600"
            @click="goProduct(pid)"
          >
            查看
          </button>
        </div>
      </div>
    </div>

    <!-- 移动端：内嵌表单 -->
    <div v-if="variant === 'mobile' && activeTab === 'form'" class="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
      <div class="text-[13px] font-medium text-ink-700">📝 数据需求提报</div>
      <div class="mt-1 text-[11px] text-ink-500">描述您需要的数据内容，运营会为您跟进推荐或定制</div>

      <div class="mt-4 space-y-3">
        <div>
          <label class="mb-1 block text-[12px] font-medium text-ink-600">需求标题 <span class="text-danger-500">*</span></label>
          <input
            v-model="form.title"
            data-testid="demand-title"
            class="w-full rounded-lg border border-ink-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="一句话概括您的需求"
          />
        </div>
        <div>
          <label class="mb-1 block text-[12px] font-medium text-ink-600">需求描述</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-lg border border-ink-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="请详细描述您需要的数据内容、格式、用途..."
          />
        </div>
        <div>
          <label class="mb-1 block text-[12px] font-medium text-ink-600">联系人</label>
          <input
            v-model="form.contactName"
            data-testid="demand-contact-name"
            class="w-full rounded-lg border border-ink-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="默认使用登录姓名，可修改"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="mb-1 block text-[12px] font-medium text-ink-600">期望价格区间（元）</label>
            <input
              :value="form.priceRange"
              data-testid="demand-price-range"
              class="w-full rounded-lg border border-ink-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="如：0-5000"
              @input="onPriceRangeInput"
            />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-ink-600">联系方式</label>
            <input
              v-model="form.contact"
              class="w-full rounded-lg border border-ink-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="手机号或邮箱"
            />
          </div>
        </div>
        <button
          class="w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          data-testid="demand-submit"
          :disabled="!canSubmit"
          @click="submitDemand"
        >
          提交需求
        </button>
      </div>
    </div>

    <!-- PC 端：提报需求弹框 -->
    <teleport to="body">
      <div
        v-if="variant === 'portal' && modalOpen"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/40 p-4"
        @click.self="closeModal"
      >
        <div class="w-full max-w-lg rounded-xl bg-white shadow-float">
          <div class="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
            <div>
              <div class="text-[15px] font-semibold text-ink-900">提报需求</div>
              <div class="mt-0.5 text-xs text-ink-500">描述您需要的数据内容，运营会为您跟进推荐或定制</div>
            </div>
            <button class="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700" aria-label="关闭" @click="closeModal">
              <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div class="space-y-3.5 px-5 py-4">
            <div>
              <label class="mb-1 block text-[13px] font-medium text-ink-700">需求标题 <span class="text-danger-500">*</span></label>
              <input
                v-model="form.title"
                data-testid="demand-title"
                class="ui-field w-full px-3"
                placeholder="一句话概括您的需求"
              />
            </div>
            <div>
              <label class="mb-1 block text-[13px] font-medium text-ink-700">需求描述</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full rounded-lg border border-ink-200 px-3 py-2 text-[13px] focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="请详细描述您需要的数据内容、格式、用途..."
              ></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-[13px] font-medium text-ink-700">期望价格区间（元）</label>
                <input
                  :value="form.priceRange"
                  data-testid="demand-price-range"
                  class="ui-field w-full px-3"
                  placeholder="如：0-5000"
                  @input="onPriceRangeInput"
                />
              </div>
              <div>
                <label class="mb-1 block text-[13px] font-medium text-ink-700">联系方式</label>
                <input
                  v-model="form.contact"
                  class="ui-field w-full px-3"
                  placeholder="手机号或邮箱"
                />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-[13px] font-medium text-ink-700">联系人</label>
              <input
                v-model="form.contactName"
                data-testid="demand-contact-name"
                class="ui-field w-full px-3"
                placeholder="默认使用登录姓名，可修改"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-ink-100 px-5 py-3.5">
            <button class="h-9 rounded-lg border border-ink-200 px-4 text-[13px] text-ink-600 transition hover:border-ink-300" @click="closeModal">取消</button>
            <button
              class="h-9 rounded-lg bg-brand-500 px-5 text-[13px] font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              data-testid="demand-submit"
              :disabled="!canSubmit"
              @click="submitDemand"
            >提交需求</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
