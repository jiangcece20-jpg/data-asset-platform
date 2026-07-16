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
import { seedProducts } from './products'

export const seedEnhancements: ProductEnhancement[] = [
  {
    productId: 'prod-qualification-api',
    displayTitle: '资格核验 API · 秒级合规核验',
    recommendText: '司机准入必备，99.9% 可用性保障',
    tags: ['合规首选'],
    manualDescription: 'APP 侧补充：已对接 3 家头部物流企业验证，平均节省人工核验时间 90%。',
    previewNote: '企业认证后可在 APP 内直接测试调用',
    sortWeight: 90,
    recommendSlot: true
  },
  {
    productId: 'prod-enterprise-activity',
    displayTitle: '企业物流活跃度数据集 · 精准画像',
    recommendText: '260 万家企业活跃度全景覆盖',
    tags: ['热门数据集'],
    manualDescription: 'APP 侧补充：适合企业征信、供应商评估场景，样本数据可直接下载体验。',
    previewNote: '公开样本 5 条，企业申请后可获取完整版',
    sortWeight: 80,
    recommendSlot: true
  },
  {
    productId: 'prod-privacy-verify',
    displayTitle: '企业资质隐私核验 · PIR 技术保障',
    recommendText: '查询过程双向匿名，安全合规',
    tags: ['隐私计算'],
    manualDescription: 'APP 侧补充：固定脱敏沙箱即点即用。',
    previewNote: '固定脱敏沙箱即点即用',
    sortWeight: 60,
    recommendSlot: false
  }
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
  {
    id: 'ent-history-001',
    source: 'personal',
    type: 'item',
    productId: 'prod-logistics-monthly',
    productVersion: 'V2026-07',
    ownerId: 'mem-1',
    validFrom: '2026-07-17',
    status: 'active'
  }
]

export const seedOrders: Order[] = [
  {
    id: 'order-history-001',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    productId: 'prod-logistics-monthly',
    productName: '物流行业月报',
    amount: 99,
    status: 'entitlement_active',
    createdAt: '2026-07-17T09:00:00.000Z',
    paidAt: '2026-07-17T09:01:00.000Z'
  }
]

export const seedTrials: TrialApplication[] = []

export const seedDemands: DemandLead[] = []

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
