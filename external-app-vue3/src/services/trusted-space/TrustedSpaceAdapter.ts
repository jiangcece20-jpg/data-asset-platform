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

export interface TrustedSpaceAdapter {
  syncProducts(cursor?: string): Promise<{ items: TrustedProductSnapshot[]; nextCursor?: string }>
  getProduct(spaceProductNo: string): Promise<TrustedProductSnapshot | undefined>
  ensureEnterpriseBinding(appEnterpriseId: string): Promise<EnterpriseSpaceBinding>
  createPurchaseLink(input: PurchaseLinkInput): Promise<{ url: string; expiresAt: string }>
  findOrderByIntent(intentId: string): Promise<SpaceOrderEvent | undefined>
  listUsageBills(spaceEnterpriseId: string): Promise<ApiUsageBillMirror[]>
  createBillDownloadLink(spaceBillId: string): Promise<string>
  createBillSupportLink(spaceBillId: string, returnUrl: string): Promise<string>
}

export const trustedSpaceAdapter: TrustedSpaceAdapter =
  new MockTrustedSpaceAdapter(() => new Date().toISOString())
