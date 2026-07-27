import {
  seedApiUsageBills,
  seedEnterpriseSpaceBindings,
  seedSpaceOrderRecords,
  seedTrustedProductSnapshots
} from '@/data/trustedSpace'
import type {
  ApiUsageBillMirror,
  EnterpriseSpaceBinding,
  SpaceOrderEvent,
  TrustedProductSnapshot
} from '@/types/trustedSpace'
import type {
  BillSupportLinkInput,
  BillSupportLinkResult,
  PurchaseLinkInput,
  TrustedSpaceAdapter
} from './TrustedSpaceAdapter'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export class MockTrustedSpaceAdapter implements TrustedSpaceAdapter {
  readonly billSupportLinkRecords: Array<{
    token: string
    input: BillSupportLinkInput
    expiresAt: string
  }> = []
  private billSupportLinkSequence = 0

  constructor(private readonly now: () => string) {}

  async syncProducts(cursor?: string): Promise<{ items: TrustedProductSnapshot[]; nextCursor?: string }> {
    const start = cursor ? Number.parseInt(cursor, 10) : 0
    const items = seedTrustedProductSnapshots.slice(Number.isNaN(start) ? 0 : start)

    return { items: items.map((product) => this.receivedSnapshot(product)) }
  }

  async getProduct(spaceProductNo: string): Promise<TrustedProductSnapshot | undefined> {
    const product = seedTrustedProductSnapshots.find((item) => item.spaceProductNo === spaceProductNo)
    return product ? this.receivedSnapshot(product) : undefined
  }

  async ensureEnterpriseBinding(appEnterpriseId: string): Promise<EnterpriseSpaceBinding> {
    const binding = seedEnterpriseSpaceBindings.find((item) => item.appEnterpriseId === appEnterpriseId)

    return clone(binding ?? { appEnterpriseId, status: 'unbound' })
  }

  async createPurchaseLink(input: PurchaseLinkInput): Promise<{ url: string; expiresAt: string }> {
    const params = new URLSearchParams({
      intent: input.intentId,
      enterprise: input.spaceEnterpriseId,
      product: input.spaceProductNo,
      returnUrl: input.returnUrl
    })
    const expiresAt = new Date(new Date(this.now()).getTime() + 5 * 60 * 1000).toISOString()

    return {
      url: `https://trusted-space.mock/purchase?${params.toString()}`,
      expiresAt
    }
  }

  async findOrderByIntent(intentId: string): Promise<SpaceOrderEvent | undefined> {
    const record = seedSpaceOrderRecords.find((item) => item.purchaseIntentId === intentId)

    if (!record) return undefined

    const { operatorMemberId: _operatorMemberId, ...event } = record
    return clone(event)
  }

  async listUsageBills(spaceEnterpriseId: string): Promise<ApiUsageBillMirror[]> {
    return clone(seedApiUsageBills.filter((bill) => bill.spaceEnterpriseId === spaceEnterpriseId))
  }

  async createBillDownloadLink(spaceBillId: string): Promise<string> {
    return `https://trusted-space.mock/bills/${encodeURIComponent(spaceBillId)}/download`
  }

  async createBillSupportLink(input: BillSupportLinkInput): Promise<BillSupportLinkResult> {
    const token = `bill-support-${String(++this.billSupportLinkSequence).padStart(4, '0')}`
    const expiresAt = new Date(new Date(this.now()).getTime() + 5 * 60 * 1000).toISOString()
    this.billSupportLinkRecords.push({ token, input: clone(input), expiresAt })

    return {
      url: `https://trusted-space.mock/bills/support?token=${encodeURIComponent(token)}`,
      expiresAt
    }
  }

  private receivedSnapshot(product: TrustedProductSnapshot): TrustedProductSnapshot {
    return { ...clone(product), syncedAt: this.now(), syncState: 'current' }
  }
}
