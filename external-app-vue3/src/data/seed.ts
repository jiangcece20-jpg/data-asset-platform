import type {
  ProductEnhancement,
  Enterprise,
  Entitlement,
  Order,
  TrialApplication,
  DemandLead,
  ApprovalRecord
} from '@/types/domain'

export { seedProducts } from './products'
export { seedResources, userViewResources } from './resources'

export const seedEnhancements: ProductEnhancement[] = [
  // Enhancement 已合并进 Product，此数组保留为空以兼容旧导入
]

// ---------------------------------------------------------------------------
// 企业与成员
// ---------------------------------------------------------------------------
export const seedEnterprise: Enterprise = {
  id: 'ent-wanlian-logistics',
  name: '万联供应链管理有限公司',
  packageName: '企业内容套餐 · 标准版',
  seatsTotal: 10,
  seatsUsed: 3,
  status: 'active',
  expiresAt: '2027-07-04',
  entitledProductIds: [],
  purchasePolicy: {
    memberPurchaseAllowed: true,
    memberPurchaseApprovalRequired: false
  },
  members: [
    { id: 'mem-1', name: '陈静', phone: '138****2201', role: 'admin', seatAssigned: false, status: 'active' },
    { id: 'mem-2', name: '王涛', phone: '139****7710', role: 'member', seatAssigned: true, status: 'active' },
    { id: 'mem-3', name: '李梅', phone: '136****3345', role: 'member', seatAssigned: true, status: 'active' },
    { id: 'mem-4', name: '赵鹏', phone: '137****9982', role: 'member', seatAssigned: true, status: 'active' },
    { id: 'mem-5', name: '孙丽（待分配）', phone: '135****4471', role: 'member', seatAssigned: false, status: 'invited' }
  ]
}

// ---------------------------------------------------------------------------
// 权益 / 订单 / 试用 / 需求 / 审批 初始状态
// ---------------------------------------------------------------------------
export const seedEntitlements: Entitlement[] = [
  // ===== A14 到期与续订 Mock 数据 =====
  // 场景1: 持续更新权益即将到期（7天后到期）
  {
    id: 'ent-renewal-expiring',
    source: 'enterprise',
    type: 'dataset',
    productId: 'prod-truck-trajectory',
    orderId: 'order-continuous-update-001',
    datasetOfferId: 'offer-truck-enterprise-continuous',
    commerceOfferId: 'offer-truck-enterprise-continuous',
    serviceMode: 'continuous',
    licenseKind: 'subscription',
    assetVersion: 'v3.2.0',
    accessScope: 'named_seats',
    assignedMemberIds: ['mem-1', 'mem-2', 'mem-3'],
    allowDownload: true,
    biDeliveryId: 'bi-delivery-continuous-001',
    ownerId: 'ent-wanlian-logistics',
    enterpriseId: 'ent-wanlian-logistics',
    validFrom: '2025-08-10',
    validTo: '2026-08-17', // 7天后到期
    updateValidTo: '2026-08-17',
    status: 'active'
  },
  // 场景2: 已到期权益（停止更新，但数据保留）
  {
    id: 'ent-renewal-expired',
    source: 'personal',
    type: 'dataset',
    productId: 'prod-warehouse-turnover-risk',
    orderId: 'order-history-continuous-001',
    datasetOfferId: 'offer-warehouse-personal-continuous',
    commerceOfferId: 'offer-warehouse-personal-continuous',
    serviceMode: 'continuous',
    licenseKind: 'subscription',
    assetVersion: 'v2.3.2',
    accessScope: 'personal',
    allowDownload: true,
    biDeliveryId: 'bi-delivery-expired-001',
    ownerId: 'mem-1',
    validFrom: '2024-08-10',
    validTo: '2026-08-08', // 已到期
    updateValidTo: '2026-08-08',
    status: 'active'
  },
  // ===== 原有数据 =====
  {
    id: 'ent-history-001',
    source: 'personal',
    type: 'item',
    productId: 'prod-logistics-monthly',
    productVersion: 'V2026-07',
    ownerId: 'mem-1',
    validFrom: '2026-07-17',
    status: 'active'
  },
  {
    id: 'ent-dataset-history-001',
    source: 'personal',
    type: 'dataset',
    productId: 'prod-warehouse-turnover-risk',
    orderId: 'order-dataset-history-001',
    datasetOfferId: 'offer-warehouse-personal',
    commerceOfferId: 'offer-warehouse-personal',
    serviceMode: 'one_time',
    licenseKind: 'snapshot',
    assetVersion: 'v2.3.2',
    accessScope: 'personal',
   assignedMemberIds: ['mem-1'],
    allowDownload: true,
   biDeliveryId: 'bi-delivery-history-001',
    ownerId: 'mem-1',
    validFrom: '2026-07-18',
    status: 'active'
 },
  {
   id: 'ent-dataset-enterprise-001',
    source: 'enterprise',
    type: 'dataset',
    productId: 'prod-truck-trajectory',
    orderId: 'order-enterprise-dataset-001',
    datasetOfferId: 'offer-truck-enterprise-snapshot',
    commerceOfferId: 'offer-truck-enterprise-snapshot',
    serviceMode: 'one_time',
    licenseKind: 'snapshot',
    assetVersion: 'v3.2.0',
    accessScope: 'named_seats',
   assignedMemberIds: ['mem-1', 'mem-2'],
    allowDownload: true,
   biDeliveryId: 'bi-delivery-enterprise-001',
    ownerId: 'ent-wanlian-logistics',
    enterpriseId: 'ent-wanlian-logistics',
    validFrom: '2026-07-29',
    status: 'active'
  }
]

export const seedOrders: Order[] = [
  // ===== A14 到期与续订 Mock 数据 =====
  // 场景1: 持续更新订单（即将到期）
  {
    id: 'order-continuous-update-001',
    channel: 'app',
    ownerType: 'enterprise',
    ownerId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-1',
    productId: 'prod-truck-trajectory',
    productName: '全国货车轨迹热力数据集',
    productType: 'dataset',
    datasetOfferId: 'offer-truck-enterprise-continuous',
    commerceOfferId: 'offer-truck-enterprise-continuous',
    serviceMode: 'continuous',
    selectedTermMonths: 12,
    paymentMethod: 'enterprise_balance',
    entitlementId: 'ent-renewal-expiring',
    biDeliveryId: 'bi-delivery-continuous-001',
    amount: 5800,
    status: 'entitlement_active',
    entitlementGranted: true,
    createdAt: '2025-08-10T09:00:00.000Z',
    paidAt: '2025-08-10T09:01:00.000Z'
  },
  // 场景2: 已到期持续更新订单（续订场景）
  {
    id: 'order-history-continuous-001',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    productId: 'prod-warehouse-turnover-risk',
    productName: '仓储周转效率数据集',
    productType: 'dataset',
    datasetOfferId: 'offer-warehouse-personal-continuous',
    commerceOfferId: 'offer-warehouse-personal-continuous',
    serviceMode: 'continuous',
    selectedTermMonths: 24,
    paymentMethod: 'personal_online',
    entitlementId: 'ent-renewal-expired',
    biDeliveryId: 'bi-delivery-expired-001',
    amount: 998,
    status: 'entitlement_active',
    entitlementGranted: true,
    createdAt: '2024-08-10T10:00:00.000Z',
    paidAt: '2024-08-10T10:01:00.000Z'
  },

  {
    id: 'order-seller-paid-001',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-buyer-demo',
    productId: 'prod-seller-route-board',
    productName: '华东干线时效数据集',
    productType: 'dataset',
    commerceOfferId: 'offer-seller-route-personal',
    serviceMode: 'one_time',
    selectedTermMonths: 12,
    paymentMethod: 'personal_online',
    amount: 199,
    status: 'pending_activation',
    entitlementGranted: false,
    entitlementPendingManual: true,
    sellerId: 'seller-chenjing',
    settlementMode: 'platform_collect',
    createdAt: '2026-08-08T08:30:00.000Z',
    paidAt: '2026-08-08T08:31:00.000Z',
    note: '平台已收款，待运营开通数据集；按合同与卖家结算'
  },
  {
    id: 'order-seller-contract-001',
    channel: 'app',
    ownerType: 'enterprise',
    ownerId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-1',
    productId: 'prod-seller-warehouse-board',
    productName: '仓网周转健康数据集',
    productType: 'dataset',
    commerceOfferId: 'offer-seller-wh-enterprise',
    serviceMode: 'one_time',
    selectedTermMonths: 6,
    paymentMethod: 'enterprise_contract',
    amount: 1290,
    status: 'pending_payment',
    entitlementGranted: false,
    sellerId: 'seller-zhangshu',
    settlementMode: 'platform_collect',
    createdAt: '2026-08-08T09:10:00.000Z',
    note: '企业合同采购，待平台确认到账后开通；平台按合同与卖家结算'
  },

  {
    id: 'order-history-001',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    productId: 'prod-logistics-monthly',
    productName: '中国公路物流行业月报',
    productType: 'report',
    serviceMode: 'one_time',
    paymentMethod: 'personal_online',
    amount: 99,
    status: 'entitlement_active',
    createdAt: '2026-07-17T09:00:00.000Z',
    paidAt: '2026-07-17T09:01:00.000Z'
  },
  {
    id: 'order-dataset-history-001',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    operatorMemberId: 'mem-1',
    productId: 'prod-warehouse-turnover-risk',
    productName: '仓储周转效率数据集',
    productType: 'dataset',
    datasetOfferId: 'offer-warehouse-personal',
    commerceOfferId: 'offer-warehouse-personal',
    serviceMode: 'one_time',
    paymentMethod: 'personal_online',
    entitlementId: 'ent-dataset-history-001',
    biDeliveryId: 'bi-delivery-history-001',
    amount: 599,
    status: 'entitlement_active',
    entitlementGranted: true,
    createdAt: '2026-07-18T10:00:00.000Z',
    paidAt: '2026-07-18T10:01:00.000Z'
  },
  {
   id: 'order-enterprise-dataset-001',
    channel: 'app',
    ownerType: 'enterprise',
    ownerId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-1',
    productId: 'prod-truck-trajectory',
    productName: '全国货车轨迹热力数据集',
    productType: 'dataset',
    datasetOfferId: 'offer-truck-enterprise-snapshot',
    commerceOfferId: 'offer-truck-enterprise-snapshot',
    serviceMode: 'one_time',
    paymentMethod: 'enterprise_bank_transfer',
    entitlementId: 'ent-dataset-enterprise-001',
    biDeliveryId: 'bi-delivery-enterprise-001',
    amount: 3800,
    status: 'entitlement_active',
    entitlementGranted: true,
    createdAt: '2026-07-29T09:30:00.000Z',
    paidAt: '2026-07-29T15:20:00.000Z'
  },
  {
    id: 'order-enterprise-dataset-pending-confirmation',
    channel: 'app',
    ownerType: 'enterprise',
    ownerId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-2',
    productId: 'prod-truck-trajectory',
    productName: '全国货车轨迹热力数据集',
    productType: 'dataset',
    datasetOfferId: 'offer-truck-enterprise-snapshot',
    commerceOfferId: 'offer-truck-enterprise-snapshot',
    serviceMode: 'one_time',
    paymentMethod: 'enterprise_bank_transfer',
    amount: 3800,
    status: 'payment_pending_confirmation',
    entitlementGranted: false,
    createdAt: '2026-08-04T14:00:00.000Z'
  }
]

export const seedTrials: TrialApplication[] = []

// 需求回流演示：四条对象/地域/时间一致的相似需求（跨来源），可聚合为一个供给任务。
export const seedDemands: DemandLead[] = [
  {
    id: 'demand-seed-1',
    question: '想要长三角港口吞吐量月度数据',
    filters: ['港口', '吞吐量'],
    browsedProductIds: [],
    objectDesc: '港口吞吐量',
    region: '长三角',
    timeRange: '近12个月',
    updateFreq: '每月',
    scenario: '产能与运力评估',
    expectedDelivery: '2026-09',
    status: 'new',
    recommendedProductIds: [],
    feedbackMessage: '',
    createdAt: '2026-07-15 10:20',
    ownerId: 'mem-1',
    source: 'search_miss',
    subscribed: true
  },
  {
    id: 'demand-seed-2',
    question: '港口吞吐量数据有吗',
    filters: ['港口'],
    browsedProductIds: [],
    objectDesc: '港口吞吐量',
    region: '长三角',
    timeRange: '近12个月',
    updateFreq: '每月',
    scenario: '供应链选址',
    expectedDelivery: '2026-09',
    status: 'new',
    recommendedProductIds: [],
    feedbackMessage: '',
    createdAt: '2026-07-16 14:05',
    ownerId: 'mem-2',
    source: 'search_miss',
    subscribed: true
  },
  {
    id: 'demand-seed-3',
    question: '求上架：长三角港口吞吐量数据集',
    filters: [],
    browsedProductIds: ['prod-port-throughput-candidate'],
    objectDesc: '港口吞吐量',
    region: '长三角',
    timeRange: '近12个月',
    updateFreq: '每月',
    scenario: '临港产业研究',
    expectedDelivery: '2026-09',
    status: 'new',
    recommendedProductIds: [],
    feedbackMessage: '',
    createdAt: '2026-07-16 16:40',
    ownerId: 'mem-3',
    source: 'listing_request',
    subscribed: true
  },
  {
    id: 'demand-seed-4',
    question: '试用后反馈：需要更细的港口吞吐量口径',
    filters: [],
    browsedProductIds: [],
    objectDesc: '港口吞吐量',
    region: '长三角',
    timeRange: '近12个月',
    updateFreq: '每月',
    scenario: '口岸运营',
    expectedDelivery: '2026-09',
    status: 'not_supported',
    recommendedProductIds: [],
    feedbackMessage: '暂无该口径供给',
    createdAt: '2026-07-14 09:10',
    ownerId: 'mem-1',
    source: 'trial_feedback',
    subscribed: true
  }
]

export const seedApprovals: ApprovalRecord[] = [
  {
    id: 'appr-001',
    productId: 'prod-freight-index',
    productName: '全国货运价格指数',
    productType: 'dashboard',
    checklist: [
      { item: '指标口径与来源说明完整', passed: true, note: '' },
      { item: '企业级明细已脱敏', passed: true, note: '' },
      { item: '导出规则已配置', passed: true, note: '' }
    ],
    conclusion: 'approved',
    reason: '符合交互报表类目发布要求',
    reviewer: '合规审批人-周敏',
    timeline: [
      { time: '2026-06-01 09:00', actor: '商品运营-林航', action: '提交审批' },
      { time: '2026-06-02 14:30', actor: '合规审批人-周敏', action: '审批通过' }
    ]
  },
  {
    id: 'appr-002',
    productId: 'prod-driver-credit-candidate',
    productName: '司机信用评分数据集（可申请上架）',
    productType: 'dataset',
    checklist: [
      { item: '资产出域审批完成', passed: false, note: '资产平台出域审批未完成' },
      { item: '数据字典与脱敏样本齐备', passed: null, note: '待补充' },
      { item: '合规声明完整', passed: null, note: '待补充' }
    ],
    conclusion: 'pending',
    reason: '',
    reviewer: '待分配',
    timeline: [{ time: '2026-07-11 09:15', actor: '商品运营-林航', action: '创建商品草稿' }]
  }
]
