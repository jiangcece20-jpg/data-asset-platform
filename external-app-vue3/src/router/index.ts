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
    { path: '/app/checkout/dataset/:id', name: 'checkout-dataset', component: () => import('@/views/shared/DatasetCheckout.vue'), meta: { title: '数据集购买' } },
    { path: '/app/payment/dataset/:orderId', name: 'payment-dataset', component: () => import('@/views/shared/DatasetPayment.vue'), meta: { title: '数据集支付' } },
    { path: '/app/space-bridge/:id', name: 'space-bridge', component: () => import('@/views/mobile/SpaceBridge.vue'), meta: { title: '可信空间' } },
    { path: '/app/space-intent/:id', name: 'space-intent', component: () => import('@/views/mobile/SpaceIntentForm.vue'), meta: { title: '提交试用申请' } },
    { path: '/app/demand', name: 'demand-form', component: () => import('@/views/mobile/DemandForm.vue'), meta: { title: '需求提交' } },
    { path: '/app/listing-request/:id', name: 'listing-request', component: () => import('@/views/mobile/ListingRequest.vue'), meta: { title: '求上架' } },
    { path: '/app/mine', name: 'mine', component: () => import('@/views/mobile/Mine.vue'), meta: { title: '我的' } },
    { path: '/app/mine/orders/:source/:id', name: 'order-detail', component: () => import('@/views/shared/OrderDetail.vue'), meta: { title: '订单详情' } },
    { path: '/app/seller', name: 'seller-center', component: () => import('@/views/mobile/SellerCenter.vue'), meta: { title: '卖家中心' } },
    { path: '/app/seller/apply', name: 'seller-apply', component: () => import('@/views/mobile/SellerApply.vue'), meta: { title: '入驻申请' } },
    { path: '/app/seller/listing', name: 'seller-listing', component: () => import('@/views/mobile/SellerListingApply.vue'), meta: { title: '上架申请' } },
    { path: '/app/seller/orders', name: 'seller-orders', component: () => import('@/views/mobile/SellerOrders.vue'), meta: { title: '卖家订单' } },
    { path: '/app/mine/enterprise', name: 'mine-enterprise', component: () => import('@/views/mobile/MineEnterprise.vue'), meta: { title: '企业中心' } },
    { path: '/app/mine/enterprise/bills', name: 'api-usage-bills', component: () => import('@/views/mobile/ApiUsageBills.vue'), meta: { title: 'API 用量账单' } },
    { path: '/app/mine/enterprise/bills/:id', name: 'api-usage-bill-detail', component: () => import('@/views/mobile/ApiUsageBillDetail.vue'), meta: { title: 'API 用量账单' } },

    // ---------------- PC 运营后台 ----------------
    { path: '/admin', name: 'admin-dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { title: '概览' } },
    { path: '/admin/resources', name: 'admin-resources', component: () => import('@/views/admin/ResourceCenter.vue'), meta: { title: '资源管理' } },
    { path: '/admin/resources/:id', name: 'admin-resource-edit', component: () => import('@/views/admin/ResourceEdit.vue'), meta: { title: '资源编辑' } },
    { path: '/admin/commerce', name: 'admin-commerce', component: () => import('@/views/admin/CommerceCenter.vue'), meta: { title: '商业化中心' } },
    { path: '/admin/orders', name: 'admin-orders', component: () => import('@/views/admin/OrderCenter.vue'), meta: { title: '订单中心' } },
    { path: '/admin/sellers', name: 'admin-sellers', component: () => import('@/views/admin/SellerMarketAdmin.vue'), meta: { title: '入驻商家' } },
    { path: '/admin/enterprise', name: 'admin-enterprise', component: () => import('@/views/admin/EnterpriseBenefits.vue'), meta: { title: '企业权益' } },
    { path: '/admin/trials-leads', name: 'admin-trials-leads', component: () => import('@/views/admin/TrialsLeads.vue'), meta: { title: '试用与线索' } },
    { path: '/admin/space-intents', name: 'admin-space-intents', component: () => import('@/views/admin/SpaceIntentList.vue'), meta: { title: '空间意向单' } },
    { path: '/admin/space-intents/:id', name: 'admin-space-intents-detail', component: () => import('@/views/admin/SpaceIntentDetail.vue'), meta: { title: '空间意向单详情' } },
    { path: '/admin/operations', name: 'admin-operations', component: () => import('@/views/admin/OperationsConfig.vue'), meta: { title: '运营配置' } },
    { path: '/admin/approval', name: 'admin-approval', component: () => import('@/views/admin/ApprovalIntegration.vue'), meta: { title: '审批与集成' } },
    { path: '/admin/approval/reverse-work-orders', name: 'admin-reverse-work-orders', component: () => import('@/views/admin/ReverseWorkOrderList.vue'), meta: { title: '逆向工单' } },
    { path: '/admin/approval/reverse-work-orders/:id', name: 'admin-reverse-work-order-detail', component: () => import('@/views/admin/ReverseWorkOrderDetail.vue'), meta: { title: '逆向工单详情' } },
    { path: '/admin/approval/demand-supply', name: 'admin-demand-supply', component: () => import('@/views/admin/DemandSupplyList.vue'), meta: { title: '需求供给' } },
    { path: '/admin/approval/demand-supply/:id', name: 'admin-demand-supply-detail', component: () => import('@/views/admin/DemandSupplyDetail.vue'), meta: { title: '需求供给详情' } },
    { path: '/admin/approval/after-sales', name: 'admin-after-sales', component: () => import('@/views/admin/AfterSalesList.vue'), meta: { title: '交易售后' } },
    { path: '/admin/approval/after-sales/:id', name: 'admin-after-sales-detail', component: () => import('@/views/admin/AfterSalesDetail.vue'), meta: { title: '交易售后详情' } },
    { path: '/admin/approval/integration', name: 'admin-integration-governance', component: () => import('@/views/admin/IntegrationGovernance.vue'), meta: { title: '集成治理' } },
    { path: '/admin/permissions', name: 'admin-permissions', component: () => import('@/views/admin/PermissionManagement.vue'), meta: { title: '权限管理' } },

    // ---------------- PC 门户 ----------------
    { path: '/portal', redirect: '/portal/home' },
    { path: '/portal/home', name: 'portal-home', component: () => import('@/views/portal/PortalHome.vue'), meta: { title: '门户首页' } },
    { path: '/portal/search', name: 'portal-search', component: () => import('@/views/portal/PortalSearch.vue'), meta: { title: '搜索发现' } },
    { path: '/portal/product/:id', name: 'portal-product-detail', component: () => import('@/views/portal/PortalProductDetail.vue'), meta: { title: '商品详情' } },
    { path: '/portal/space-intent/:id', name: 'portal-space-intent', component: () => import('@/views/mobile/SpaceIntentForm.vue'), meta: { title: '提交试用申请' } },
    { path: '/portal/checkout/:id', name: 'portal-checkout', component: () => import('@/views/portal/PortalCheckout.vue'), meta: { title: '购买结算' } },
    { path: '/portal/checkout/dataset/:id', name: 'portal-checkout-dataset', component: () => import('@/views/shared/DatasetCheckout.vue'), meta: { title: '数据集购买' } },
    { path: '/portal/payment/dataset/:orderId', name: 'portal-payment-dataset', component: () => import('@/views/shared/DatasetPayment.vue'), meta: { title: '数据集支付' } },
   { path: '/portal/mine', name: 'portal-mine', component: () => import('@/views/portal/PortalMine.vue'), meta: { title: '我的' } },
    { path: '/portal/mine/orders/:source/:id', name: 'portal-order-detail', component: () => import('@/views/shared/OrderDetail.vue'), meta: { title: '订单详情' } },
    { path: '/portal/enterprise', name: 'portal-enterprise', component: () => import('@/views/portal/PortalEnterprise.vue'), meta: { title: '企业中心' } },
   { path: '/portal/bills', name: 'portal-bills', component: () => import('@/views/portal/PortalBills.vue'), meta: { title: 'API账单' } },
    { path: '/portal/demand', name: 'portal-demand', component: () => import('@/views/portal/PortalDemand.vue'), meta: { title: '需求提报' } }
  ]
})

export default router
