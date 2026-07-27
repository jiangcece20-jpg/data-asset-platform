import type {
  ApiUsageBillMirror,
  EnterpriseSpaceBinding,
  SpaceOrderEvent,
  TrustedProductSnapshot
} from '@/types/trustedSpace'
import { MockTrustedSpaceAdapter } from './mockTrustedSpaceAdapter'

export interface PurchaseLinkInput {
  intentId: string
  spaceEnterpriseId: string
  operatorMemberId: string
  spaceProductNo: string
  returnUrl: string
}

export type BillVisibilityScope =
  | { kind: 'enterprise_statement' }
  | {
      kind: 'member_credentials'
      credentialLocators: string[]
      apiLocators: string[]
    }

export interface BillSupportLinkInput {
  spaceEnterpriseId: string
  operatorMemberId: string
  spaceBillId: string
  returnUrl: string
  visibilityScope: BillVisibilityScope
}

export interface BillSupportLinkResult {
  url: string
  expiresAt: string
}

export interface TrustedSpaceAdapter {
  syncProducts(cursor?: string): Promise<{ items: TrustedProductSnapshot[]; nextCursor?: string }>
  getProduct(spaceProductNo: string): Promise<TrustedProductSnapshot | undefined>
  ensureEnterpriseBinding(appEnterpriseId: string): Promise<EnterpriseSpaceBinding>
  createPurchaseLink(input: PurchaseLinkInput): Promise<{ url: string; expiresAt: string }>
  findOrderByIntent(intentId: string): Promise<SpaceOrderEvent | undefined>
  listUsageBills(spaceEnterpriseId: string): Promise<ApiUsageBillMirror[]>
  createBillDownloadLink(spaceBillId: string): Promise<string>
  createBillSupportLink(input: BillSupportLinkInput): Promise<BillSupportLinkResult>
}

export const trustedSpaceAdapter: TrustedSpaceAdapter =
  new MockTrustedSpaceAdapter(() => new Date().toISOString())
