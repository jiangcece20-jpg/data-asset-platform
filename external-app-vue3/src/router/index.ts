import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', redirect: '/app/home' },

    // ---------------- 移动端：综合 APP 找数模块 ----------------
    { path: '/app/home', name: 'app-home', component: () => import('@/views/mobile/AppHome.vue'), meta: { title: '综合APP首页' } },
    { path: '/app/discover', name: 'discover-home', component: () => import('@/views/mobile/DiscoverHome.vue'), meta: { title: '找数' } },
    { path: '/app/ai-find', name: 'ai-find', component: () => import('@/views/mobile/AIFindData.vue'), meta: { title: 'AI找数' } },
    { path: '/app/answer', name: 'answer-result', component: () => import('@/views/mobile/AnswerResult.vue'), meta: { title: '问答案' } },
    { path: '/app/search', name: 'search-result', component: () => import('@/views/mobile/SearchResult.vue'), meta: { title: '找数据' } },
    { path: '/app/product/:id', name: 'product-detail', component: () => import('@/views/mobile/ProductDetail.vue'), meta: { title: '商品详情' } },
    { path: '/app/enterprise-auth', name: 'enterprise-auth', component: () => import('@/views/mobile/EnterpriseAuth.vue'), meta: { title: '企业认证' } },
    { path: '/app/checkout/member', name: 'checkout-member', component: () => import('@/views/mobile/CheckoutMember.vue'), meta: { title: '会员购买' } },
    { path: '/app/checkout/item/:id', name: 'checkout-item', component: () => import('@/views/mobile/CheckoutItem.vue'), meta: { title: '单品购买' } },
    { path: '/app/checkout/enterprise/:id', name: 'checkout-enterprise', component: () => import('@/views/mobile/CheckoutEnterprise.vue'), meta: { title: '企业采购' } },
    { path: '/app/space-bridge/:id', name: 'space-bridge', component: () => import('@/views/mobile/SpaceBridge.vue'), meta: { title: '可信空间' } },
    { path: '/app/demand', name: 'demand-form', component: () => import('@/views/mobile/DemandForm.vue'), meta: { title: '需求提交' } },
    { path: '/app/listing-request/:id', name: 'listing-request', component: () => import('@/views/mobile/ListingRequest.vue'), meta: { title: '求上架' } },
    { path: '/app/mine', name: 'mine', component: () => import('@/views/mobile/Mine.vue'), meta: { title: '我的' } },
    { path: '/app/mine/enterprise', name: 'mine-enterprise', component: () => import('@/views/mobile/MineEnterprise.vue'), meta: { title: '企业中心' } },
    { path: '/app/mine/enterprise/bills', name: 'api-usage-bills', component: () => import('@/views/mobile/ApiUsageBills.vue'), meta: { title: 'API 用量账单' } },
    { path: '/app/mine/enterprise/bills/:id', name: 'api-usage-bill-detail', component: () => import('@/views/mobile/ApiUsageBillDetail.vue'), meta: { title: 'API 用量账单' } },

    // ---------------- PC 运营后台 ----------------
    { path: '/admin', name: 'admin-dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { title: '概览' } },
    { path: '/admin/resources', name: 'admin-resources', component: () => import('@/views/admin/ResourceCenter.vue'), meta: { title: '资源管理' } },
    { path: '/admin/resources/:id', name: 'admin-resource-edit', component: () => import('@/views/admin/ResourceEdit.vue'), meta: { title: '资源编辑' } },
    { path: '/admin/commerce', name: 'admin-commerce', component: () => import('@/views/admin/CommerceCenter.vue'), meta: { title: '商业化中心' } },
    { path: '/admin/orders', name: 'admin-orders', component: () => import('@/views/admin/OrderCenter.vue'), meta: { title: '订单中心' } },
    { path: '/admin/enterprise', name: 'admin-enterprise', component: () => import('@/views/admin/EnterpriseBenefits.vue'), meta: { title: '企业权益' } },
    { path: '/admin/trials-leads', name: 'admin-trials-leads', component: () => import('@/views/admin/TrialsLeads.vue'), meta: { title: '试用与线索' } },
    { path: '/admin/operations', name: 'admin-operations', component: () => import('@/views/admin/OperationsConfig.vue'), meta: { title: '运营配置' } },
    { path: '/admin/approval', name: 'admin-approval', component: () => import('@/views/admin/ApprovalIntegration.vue'), meta: { title: '审批与集成' } },
    { path: '/admin/approval/reverse-work-orders', name: 'admin-reverse-work-orders', component: () => import('@/views/admin/ReverseWorkOrderList.vue'), meta: { title: '逆向工单' } },
    { path: '/admin/approval/reverse-work-orders/:id', name: 'admin-reverse-work-order-detail', component: () => import('@/views/admin/ReverseWorkOrderDetail.vue'), meta: { title: '逆向工单详情' } },
    { path: '/admin/approval/demand-supply', name: 'admin-demand-supply', component: () => import('@/views/admin/DemandSupplyList.vue'), meta: { title: '需求供给' } },
    { path: '/admin/approval/demand-supply/:id', name: 'admin-demand-supply-detail', component: () => import('@/views/admin/DemandSupplyDetail.vue'), meta: { title: '需求供给详情' } },
    { path: '/admin/approval/after-sales', name: 'admin-after-sales', component: () => import('@/views/admin/AfterSalesList.vue'), meta: { title: '交易售后' } },
    { path: '/admin/approval/after-sales/:id', name: 'admin-after-sales-detail', component: () => import('@/views/admin/AfterSalesDetail.vue'), meta: { title: '交易售后详情' } },
    { path: '/admin/approval/integration', name: 'admin-integration-governance', component: () => import('@/views/admin/IntegrationGovernance.vue'), meta: { title: '集成治理' } }
  ]
})

export default router
