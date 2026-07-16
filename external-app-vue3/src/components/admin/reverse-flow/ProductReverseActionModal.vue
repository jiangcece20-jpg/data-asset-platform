<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProductReverseAction, ReverseReasonCode } from '@/types/reverseFlow'
import type { ProductReversePreview } from '@/stores/productReverse'
import ImpactSnapshotPanel from './ImpactSnapshotPanel.vue'

const props = defineProps<{
  open: boolean
  productName: string
  preview?: ProductReversePreview
}>()

const emit = defineEmits<{
  close: []
  requestPreview: [payload: { action: ProductReverseAction; reason: ReverseReasonCode; reasonDetail: string }]
  confirm: [payload: { preview: ProductReversePreview; reasonDetail: string; owner: string; reviewAt: string }]
}>()

const reasonsByAction: Record<ProductReverseAction, ReverseReasonCode[]> = {
  pause: ['commercial_adjustment', 'quality_issue'],
  delist: ['commercial_adjustment', 'upstream_stop'],
  recall: ['quality_issue', 'compliance_risk'],
}

const actionLabels: Record<ProductReverseAction, string> = {
  pause: '暂停销售',
  delist: '下架',
  recall: '召回',
}

const reasonLabels: Record<ReverseReasonCode, string> = {
  commercial_adjustment: '商业调整',
  quality_issue: '质量问题',
  compliance_risk: '合规风险',
  upstream_stop: '上游停供',
  config_error: '配置错误',
  customer_request: '客户请求',
  payment_failure: '支付失败',
  delivery_failure: '交付失败',
  identity_mismatch: '身份不匹配',
}

const availabilityLabels: Record<string, string> = {
  candidate: '筹备中',
  preparing: '准备中',
  published: '已发布',
  paused: '暂停销售',
  delisted: '已下架',
}

const serviceLabels: Record<string, string> = {
  normal: '正常',
  degraded: '降级',
  suspended: '暂停服务',
  terminated: '终止服务',
}

const entitlementTreatmentLabels: Record<string, string> = {
  keep: '保留现有权益',
  keep_and_compensate: '保留权益，恢复后补偿',
  freeze: '立即冻结受影响权益',
  migrate_or_refund: '进入迁移或退款处置',
}

const action = ref<ProductReverseAction>('pause')
const reason = ref<ReverseReasonCode>('commercial_adjustment')
const reasonDetail = ref('')
const owner = ref('')
const reviewAt = ref('')
const validationError = ref('')

const reasonsForAction = computed(() => reasonsByAction[action.value])

const isPreviewValid = computed(() =>
  props.preview != null
  && props.preview.action === action.value
  && props.preview.reason === reason.value,
)

const canConfirm = computed(() => isPreviewValid.value)

function selectAction(a: ProductReverseAction) {
  action.value = a
  reason.value = reasonsByAction[a][0]
  validationError.value = ''
}

function selectReason(r: ReverseReasonCode) {
  reason.value = r
  validationError.value = ''
}

function requestPreview() {
  validationError.value = ''
  if (!reasonDetail.value.trim()) {
    validationError.value = '请填写原因说明'
    return
  }
  if (!owner.value.trim()) {
    validationError.value = '请填写负责人'
    return
  }
  if (!reviewAt.value) {
    validationError.value = '请选择复核时间'
    return
  }
  const reviewTime = new Date(reviewAt.value).getTime()
  if (isNaN(reviewTime) || reviewTime <= Date.now()) {
    validationError.value = '复核时间必须晚于当前时间'
    return
  }
  emit('requestPreview', {
    action: action.value,
    reason: reason.value,
    reasonDetail: reasonDetail.value,
  })
}

function confirm() {
  if (!canConfirm.value || !props.preview) return
  emit('confirm', {
    preview: props.preview,
    reasonDetail: reasonDetail.value,
    owner: owner.value,
    reviewAt: reviewAt.value,
  })
}

function close() {
  emit('close')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="close">
    <div class="max-h-[90vh] w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-[16px] font-semibold text-slate-800">商品逆向操作 · {{ productName }}</div>
        <button class="text-slate-400 hover:text-slate-600" @click="close">✕</button>
      </div>

      <!-- Action selection -->
      <div class="mb-4">
        <div class="mb-2 text-[13px] font-medium text-slate-600">操作类型</div>
        <div class="flex gap-2">
          <button
            v-for="a in (['pause', 'delist', 'recall'] as ProductReverseAction[])"
            :key="a"
            data-testid="action-btn"
            :data-value="a"
            class="rounded-lg px-4 py-2 text-[13px] font-medium transition"
            :class="action === a ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'"
            @click="selectAction(a)"
          >
            {{ actionLabels[a] }}
          </button>
        </div>
      </div>

      <!-- Reason selection -->
      <div class="mb-4">
        <div class="mb-2 text-[13px] font-medium text-slate-600">原因</div>
        <div class="flex gap-2">
          <button
            v-for="r in reasonsForAction"
            :key="r"
            data-testid="reason-option"
            :data-value="r"
            class="rounded-lg px-3 py-1.5 text-[12px] transition"
            :class="reason === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'"
            @click="selectReason(r)"
          >
            {{ reasonLabels[r] }}
          </button>
        </div>
      </div>

      <!-- Reason detail -->
      <div class="mb-4">
        <label class="mb-1 block text-[13px] font-medium text-slate-600">原因说明</label>
        <textarea
          data-testid="reason-detail-input"
          v-model="reasonDetail"
          rows="2"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          placeholder="请详细说明原因"
        ></textarea>
      </div>

      <!-- Owner & Review time -->
      <div class="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-[13px] font-medium text-slate-600">负责人</label>
          <input
            data-testid="owner-input"
            v-model="owner"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            placeholder="请输入负责人"
          />
        </div>
        <div>
          <label class="mb-1 block text-[13px] font-medium text-slate-600">复核时间</label>
          <input
            data-testid="review-at-input"
            v-model="reviewAt"
            type="datetime-local"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          />
        </div>
      </div>

      <!-- Validation error -->
      <div v-if="validationError" data-testid="validation-error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
        {{ validationError }}
      </div>

      <!-- Preview button -->
      <button
        data-testid="preview-btn"
        class="mb-4 w-full rounded-lg bg-slate-100 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-200"
        @click="requestPreview"
      >
        预览影响
      </button>

      <!-- Impact & Policy output -->
      <template v-if="isPreviewValid && preview">
        <div class="mb-4">
          <ImpactSnapshotPanel :impact="preview.impact" />
        </div>

        <div data-testid="policy-outcome" class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div class="mb-2 text-[12px] font-medium text-slate-600">处置策略</div>
          <div class="grid grid-cols-2 gap-2 text-[12px]">
            <div class="flex justify-between"><span class="text-slate-400">商品状态</span><span class="text-slate-700">{{ availabilityLabels[preview.policy.availability] }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">服务状态</span><span class="text-slate-700">{{ serviceLabels[preview.policy.service] }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">权益处置</span><span class="text-slate-700">{{ entitlementTreatmentLabels[preview.policy.entitlement] }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">严重级别</span><span class="text-slate-700">{{ preview.policy.severity }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">客户通知</span><span class="text-slate-700">{{ preview.policy.requiresCustomerNotice ? '需通知客户' : '无需通知' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">需要审批</span><span class="text-slate-700">{{ preview.policy.requiresReview ? '是' : '否' }}</span></div>
          </div>
        </div>
      </template>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <button class="rounded-lg bg-slate-100 px-4 py-2 text-[13px] text-slate-600" @click="close">取消</button>
        <button
          data-testid="confirm-btn"
          class="rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white disabled:bg-slate-200 disabled:text-slate-400"
          :disabled="!canConfirm"
          @click="confirm"
        >
          确认执行
        </button>
      </div>
    </div>
  </div>
</template>
