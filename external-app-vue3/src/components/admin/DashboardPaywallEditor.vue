<script setup lang="ts">
import {
  buttonFreeAttempts,
  buttonMasked,
  fieldConfigurable,
  fieldEffectivelyMasked,
  moduleMasked,
  setButtonFreeAttempts,
  toggleButton,
  toggleField,
  toggleModule,
  type DashboardPaywallModule,
  type DashboardPaywallSelection
} from '@/domain/dashboardPaywall'

const props = defineProps<{
  catalog: DashboardPaywallModule[]
  modelValue: DashboardPaywallSelection
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardPaywallSelection]
}>()

function patch(next: DashboardPaywallSelection) {
  emit('update:modelValue', next)
}
</script>

<template>
  <div data-testid="dashboard-paywall-editor" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
    <div class="mb-1 text-xs font-medium text-slate-600">收费内容区</div>
    <p class="mb-3 text-[11px] leading-relaxed text-slate-400">
      结构来自关联看板，运营只勾选要打码的内容。勾选模块后该模块下字段和按钮全部打码。整体付费墙由其它产品读取本配置。
    </p>

    <div class="space-y-4 text-[12px] text-slate-700">
      <div>
        <div class="mb-2 text-[11px] font-medium text-slate-500">模块</div>
        <div class="flex flex-wrap gap-x-4 gap-y-2">
          <label v-for="module in catalog" :key="module.id" class="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              :data-testid="`paywall-module-${module.id}`"
              :checked="moduleMasked(modelValue, module.id)"
              @change="patch(toggleModule(modelValue, module.id))"
            />
            {{ module.label }}
          </label>
        </div>
      </div>

      <div>
        <div class="mb-2 text-[11px] font-medium text-slate-500">字段</div>
        <div v-for="module in catalog" :key="`fields-${module.id}`" class="mb-2 last:mb-0">
          <div class="mb-1 text-[11px] text-slate-400">{{ module.label }}：</div>
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <label v-for="field in module.fields" :key="field.id" class="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                :data-testid="`paywall-field-${module.id}-${field.id}`"
                :checked="fieldEffectivelyMasked(modelValue, module.id, field.id)"
                :disabled="!fieldConfigurable(modelValue, module.id)"
                @change="patch(toggleField(modelValue, module.id, field.id))"
              />
              {{ field.label }}
            </label>
            <span v-if="!module.fields.length" class="text-[11px] text-slate-400">该模块暂无字段</span>
          </div>
        </div>
      </div>

      <div>
        <div class="mb-2 text-[11px] font-medium text-slate-500">功能按钮</div>
        <div class="space-y-2">
          <div
            v-for="module in catalog"
            :key="`buttons-${module.id}`"
            class="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <label
              v-for="button in module.buttons"
              :key="button.id"
              class="inline-flex items-center gap-1.5"
            >
              <input
                type="checkbox"
                :data-testid="`paywall-button-${module.id}-${button.id}`"
                :checked="buttonMasked(modelValue, module.id, button.id)"
                :disabled="!fieldConfigurable(modelValue, module.id)"
                @change="patch(toggleButton(modelValue, module.id, button.id))"
              />
              {{ button.label }}（{{ module.label }}）
            </label>
            <label
              v-for="button in module.buttons.filter((item) => buttonMasked(modelValue, module.id, item.id) && fieldConfigurable(modelValue, module.id))"
              :key="`attempts-${button.id}`"
              class="inline-flex items-center gap-1 text-[11px] text-slate-500"
            >
              免费次数
              <input
                type="number"
                min="0"
                :data-testid="`paywall-button-attempts-${module.id}-${button.id}`"
                :value="buttonFreeAttempts(modelValue, module.id, button.id)"
                class="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-[12px]"
                @change="patch(setButtonFreeAttempts(modelValue, module.id, button.id, Number(($event.target as HTMLInputElement).value)))"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
