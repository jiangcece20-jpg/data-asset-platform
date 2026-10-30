<script setup lang="ts">
import { ref } from 'vue'
import PrototypeProductCard from './PrototypeProductCard.vue'
import type { ProductPreview } from './prototypeScenes'
const props = defineProps<{ product: ProductPreview; start: 'details' | 'action' }>()
const emit = defineEmits<{ acquired: [action: string]; favorite: []; close: [] }>()
type View = 'details' | 'use' | 'checkout' | 'application' | 'order' | 'progress'
const view = ref<View>('details')
const paid = ref(props.product.action === '查看订单' && props.product.state !== '订单待付款')
const applicationNote = ref('')
function action() {
  const label = props.product.action
  view.value = label === '立即使用' ? 'use' : label === '查看申请' ? 'progress'
    : label === '查看订单' ? 'order' : /购买|支付/.test(label) ? 'checkout'
    : /试用|申请/.test(label) ? 'application' : 'details'
}
function pay() { paid.value = true; view.value = 'order'; emit('acquired', '查看订单') }
function apply() { view.value = 'progress'; emit('acquired', '查看申请') }
if (props.start === 'action') action()
</script>
<template>
  <div class="product-flow" :data-product-view="view">
    <p class="demo-label">前端原型演示 · 示例数据与订单，不产生真实交易</p>
    <template v-if="view === 'details'">
      <PrototypeProductCard :product="product" @favorite="emit('favorite')" @action="action" />
      <section class="flow-section"><h3>商品说明</h3><p>{{ product.description }}</p><p>价格：{{ product.price }}</p><p>获取方式：{{ product.action }}。当前状态：{{ product.state || '请在获取前核对商品权益与购买条件' }}。</p></section>
      <section class="flow-section"><h3>资料与适用范围</h3><p v-for="evidence in product.evidence" :key="evidence.label">{{ evidence.label }}：{{ evidence.fact }}{{ evidence.state === 'unknown' ? '（待核实）' : '' }}</p></section>
      <p class="flow-hint">匹配依据以已列出的资料为准，示例画面不能证明资料未说明的具体覆盖范围。</p>
    </template>
    <template v-else-if="view === 'use'">
      <h3>数据预览</h3><p>{{ product.name }}</p><p class="flow-hint">以下为展示使用方式的示例记录，不作为真实商品覆盖证据。</p>
      <div class="flow-table"><table><thead><tr><th>记录</th><th>内容</th><th>示例值</th></tr></thead><tbody><tr><td>1</td><td>示例指标 A</td><td>100</td></tr><tr><td>2</td><td>示例指标 B</td><td>120</td></tr></tbody></table></div>
      <p>当前权益：可用。可在此预览数据，返回后继续查看找数结果。</p>
    </template>
    <template v-else-if="view === 'checkout'">
      <h3>订单信息</h3><dl><dt>商品</dt><dd>{{ product.name }}</dd><dt>商品价格与周期</dt><dd>{{ product.price }}</dd><dt>订单状态</dt><dd>{{ product.action === '继续支付' ? '待支付，继续已有订单' : '待确认购买' }}</dd></dl>
      <p>请核对当前身份、商品和价格。支付后进入订单状态，开通前不能使用。</p><div class="flow-actions"><button type="button" class="primary" data-testid="confirm-demo-payment" @click="pay">确认支付</button><button type="button" class="secondary" @click="emit('close')">取消</button></div>
    </template>
    <template v-else-if="view === 'application'">
      <h3>申请信息</h3><dl><dt>商品</dt><dd>{{ product.name }}</dd><dt>申请类型</dt><dd>试用申请</dd></dl><label>试用用途（选填）<textarea v-model="applicationNote" rows="3" placeholder="说明你希望如何使用数据"></textarea></label><p>提交申请后等待处理，不会自动付款或开通权益。</p><button type="button" class="primary" data-testid="confirm-demo-trial" @click="apply">确认提交申请</button>
    </template>
    <template v-else-if="view === 'order'">
      <h3>订单详情</h3><dl><dt>商品</dt><dd>{{ product.name }}</dd><dt>价格与周期</dt><dd>{{ product.price }}</dd><dt>状态</dt><dd>{{ paid ? '已支付，待开通' : '待支付' }}</dd></dl><ol><li>订单确认</li><li>{{ paid ? '支付已完成' : '等待支付' }}</li><li>等待交付或开通</li></ol><p>开通完成后才可使用；当前可返回找数或查看此订单。</p><button v-if="!paid" type="button" class="primary" @click="view = 'checkout'">继续支付</button>
    </template>
    <template v-else-if="view === 'progress'">
      <h3>试用申请进度</h3><p>{{ product.name }}</p><p class="flow-status">申请已提交，待处理</p><ol><li>申请已提交</li><li>等待业务处理</li><li>结果通知及后续使用安排</li></ol><p>申请提交不等于已开通试用，不自动付款。</p>
    </template>
    <div class="flow-actions"><button type="button" class="secondary" @click="emit('close')">返回找数结果</button><button v-if="view !== 'details'" type="button" class="text-button" @click="view = 'details'">查看商品说明</button></div>
  </div>
</template>
<style scoped>
.product-flow :deep(.secondary-action){display:none}.product-flow{color:#344158;font-size:14px;line-height:1.8}.demo-label{font-size:12px;color:#7b8399;margin:0 0 16px}.product-flow h3{font-size:18px;margin:12px 0}.flow-section{margin-top:20px}.flow-hint{font-size:12px;color:#7c8799}.flow-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px}.product-flow button{padding:9px 15px;border-radius:8px;cursor:pointer}.primary{background:#6759d7;color:white;border:1px solid #6759d7}.secondary{background:white;color:#6654aa;border:1px solid #d8d4ee}.text-button{background:transparent;border:0;color:#6654aa}.flow-table{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{padding:12px;border:1px solid #e0e5ef;text-align:left}th{background:#f3f4fa}.product-flow dl{display:grid;grid-template-columns:120px 1fr;gap:12px}.product-flow dt{color:#7c8799}.product-flow dd{margin:0;overflow-wrap:anywhere}.product-flow label{display:grid;gap:8px}.product-flow textarea{width:100%;border:1px solid #ddd;border-radius:8px;padding:12px;font:inherit;box-sizing:border-box}.flow-status{padding:12px;background:#eef5fc;color:#4a6382;border-radius:8px}@media(max-width:520px){.product-flow{font-size:13px}.product-flow dl{grid-template-columns:100px 1fr}}
</style>
