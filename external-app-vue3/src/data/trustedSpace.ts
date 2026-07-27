import type {
  ApiUsageBillMirror,
  EnterpriseSpaceBinding,
  SpaceOrderEvent,
  TrustedProductSnapshot
} from '@/types/trustedSpace'

export const seedTrustedProductSnapshots: TrustedProductSnapshot[] = [
  {
    appProductId: 'prod-qualification-api',
    spaceProductId: 'space-product-api-20415',
    spaceProductNo: 'SPACE-API-20415',
    name: '道路运输从业人员资格核验 API',
    type: 'api',
    provider: '可信数据空间 · 交通运输认证机构',
    saleStatus: 'published',
    price: { model: 'quote', quoteNote: '按调用量阶梯计费，详见空间报价' },
    currency: 'CNY',
    version: 12,
    spaceUpdatedAt: '2026-07-27T09:45:00.000Z',
    syncedAt: '2026-07-27T10:00:00.000Z',
    syncState: 'current'
  },
  {
    appProductId: 'prod-privacy-verify',
    spaceProductId: 'space-product-pir-40217',
    spaceProductNo: 'SPACE-PIR-40217',
    name: '企业资质隐私核验 API',
    type: 'api',
    provider: '可信数据空间 · 平台自营',
    saleStatus: 'published',
    price: { model: 'quote', quoteNote: '按核验次数报价' },
    currency: 'CNY',
    version: 8,
    spaceUpdatedAt: '2026-07-27T09:40:00.000Z',
    syncedAt: '2026-07-27T10:00:00.000Z',
    syncState: 'current'
  },
  {
    appProductId: 'prod-enterprise-activity',
    spaceProductId: 'space-product-ds-10893',
    spaceProductNo: 'SPACE-DS-10893',
    name: '企业物流活跃度数据集',
    type: 'dataset',
    provider: '可信数据空间 · 平台自营',
    saleStatus: 'published',
    price: { model: 'quote', quoteNote: '按数据范围与更新周期报价' },
    currency: 'CNY',
    version: 5,
    spaceUpdatedAt: '2026-07-27T09:35:00.000Z',
    syncedAt: '2026-07-27T10:00:00.000Z',
    syncState: 'current'
  }
]

export const seedEnterpriseSpaceBindings: EnterpriseSpaceBinding[] = [
  {
    appEnterpriseId: 'ent-wanlian-logistics',
    spaceEnterpriseId: 'space-ent-wanlian',
    status: 'active',
    syncedAt: '2026-07-27T10:00:00.000Z'
  }
]

export type SeedSpaceOrderRecord = SpaceOrderEvent & { operatorMemberId: string }

export const seedSpaceOrderRecords: SeedSpaceOrderRecord[] = [
  {
    eventId: 'space-event-qualification-001',
    idempotencyKey: 'space-order-qualification-001',
    eventVersion: 3,
    signatureValid: true,
    spaceOrderId: 'space-order-qualification-001',
    purchaseIntentId: 'intent-qualification-001',
    spaceEnterpriseId: 'space-ent-wanlian',
    spaceProductNo: 'SPACE-API-20415',
    rawStatus: 'DELIVERED',
    amount: 1280,
    currency: 'CNY',
    occurredAt: '2026-07-26T15:30:00.000Z',
    deliverySummary: '已开通资格核验 API 凭证',
    detailUrl: 'https://trusted-space.mock/orders/space-order-qualification-001',
    operatorMemberId: 'mem-1'
  },
  {
    eventId: 'space-event-activity-001',
    idempotencyKey: 'space-order-activity-001',
    eventVersion: 2,
    signatureValid: true,
    spaceOrderId: 'space-order-activity-001',
    purchaseIntentId: 'intent-activity-001',
    spaceEnterpriseId: 'space-ent-wanlian',
    spaceProductNo: 'SPACE-DS-10893',
    rawStatus: 'PAID',
    amount: 6800,
    currency: 'CNY',
    occurredAt: '2026-07-27T08:10:00.000Z',
    deliverySummary: '数据集交付处理中',
    detailUrl: 'https://trusted-space.mock/orders/space-order-activity-001',
    operatorMemberId: 'mem-2'
  }
]

export const seedApiUsageBills: ApiUsageBillMirror[] = [
  {
    spaceBillId: 'space-bill-wanlian-2026-07',
    appEnterpriseId: 'ent-wanlian-logistics',
    spaceEnterpriseId: 'space-ent-wanlian',
    billingMonth: '2026-07',
    currency: 'CNY',
    rawStatus: 'ISSUED',
    totalCalls: 1840,
    successCalls: 1812,
    totalAmount: 1840,
    lines: [
      {
        id: 'space-bill-line-mem-1',
        date: '2026-07-26',
        apiName: '道路运输从业人员资格核验 API',
        appCredentialId: 'credential-mem-1',
        ownerMemberId: 'mem-1',
        calls: 1120,
        successCalls: 1108,
        dataVolume: '9.4 MB',
        amount: 1120
      },
      {
        id: 'space-bill-line-mem-2',
        date: '2026-07-27',
        apiName: '企业资质隐私核验 API',
        appCredentialId: 'credential-mem-2',
        ownerMemberId: 'mem-2',
        calls: 720,
        successCalls: 704,
        dataVolume: '6.1 MB',
        amount: 720
      }
    ],
    version: 4,
    spaceUpdatedAt: '2026-07-27T09:50:00.000Z',
    syncedAt: '2026-07-27T10:00:00.000Z',
    downloadLocator: 'space-bill-wanlian-2026-07/download',
    supportLocator: 'space-bill-wanlian-2026-07/support'
  }
]
