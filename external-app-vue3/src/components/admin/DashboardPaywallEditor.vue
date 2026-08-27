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

defineProps<{
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
      结构来自关联看板：每个模块下挂字段与功能按钮，运营只勾选要打码的内容。勾选整模块后，该模块下字段和按钮全部打码且不可单独取消。
    </p>

    <div class="space-y-3 text-[12px] text-slate-700">
      <section
        v-for="module in catalog"
        :key="module.id"
        class="rounded-md border border-slate-200 bg-white p-3"
        :data-testid="`paywall-module-section-${module.id}`"
      >
        <label class="mb-2 flex items-center gap-1.5 font-medium text-slate-700">
          <input
            type="checkbox"
            :data-testid="`paywall-module-${module.id}`"
            :checked="moduleMasked(modelValue, module.id)"
            @change="patch(toggleModule(modelValue, module.id))"
          />
          {{ module.label }}
          <span class="text-[11px] font-normal text-slate-400">（整模块打码）</span>
        </label>

        <div class="ml-5 space-y-2 border-l border-slate-100 pl-3">
          <div>
            <div class="mb-1 text-[11px] font-medium text-slate-500">字段</div>
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
              <span v-if="!module.fields.length" class="text-[11px] text-slate-400">该模块暂无字段，请先在关联看板同步结构</span>
            </div>
          </div>

          <div v-if="module.buttons.length">
            <div class="mb-1 text-[11px] font-medium text-slate-500">功能按钮</div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <template v-for="button in module.buttons" :key="button.id">
                <label class="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    :data-testid="`paywall-button-${module.id}-${button.id}`"
                    :checked="buttonMasked(modelValue, module.id, button.id)"
                    :disabled="!fieldConfigurable(modelValue, module.id)"
                    @change="patch(toggleButton(modelValue, module.id, button.id))"
                  />
                  {{ button.label }}
                </label>
                <label
                  v-if="buttonMasked(modelValue, module.id, button.id) && fieldConfigurable(modelValue, module.id)"
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
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
