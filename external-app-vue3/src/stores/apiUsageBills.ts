import { defineStore } from 'pinia'
import {
  trustedSpaceAdapter,
  type BillVisibilityScope,
  type TrustedSpaceAdapter
} from '@/services/trusted-space/TrustedSpaceAdapter'
import type {
  ApiUsageBillLine,
  ApiUsageBillMirror,
  EnterpriseSpaceBinding
} from '@/types/trustedSpace'
import { useUserStore } from './user'

export interface ApiUsageBillView {
  spaceBillId: string
  billingMonth: string
  currency: string
  rawStatus: string
  totalAmount?: number
  visibleCalls: number
  successCalls: number
  lines: ApiUsageBillLine[]
  syncedAt: string
  stale: boolean
}

type EnterpriseRole = 'admin' | 'member'

interface AuthorizedBillViewer {
  appEnterpriseId: string
  memberId: string
  role: EnterpriseRole
}

interface CachedBillSupportLink {
  spaceBillId: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  returnUrl: string
  operatorMemberId: string
  role: EnterpriseRole
  visibilityScope: BillVisibilityScope
  url: string
  expiresAt: string
  authorizationGeneration: number
  bindingGeneration: number
}

interface VerifiedBillBinding {
  appEnterpriseId: string
  spaceEnterpriseId: string
  generation: number
  verifiedAt: string
}

interface BillPartitionState {
  rawBills: ApiUsageBillMirror[]
  stale: boolean
  currentAppEnterpriseId?: string
  currentSpaceEnterpriseId?: string
  bindingGeneration: number
  verifiedBinding?: VerifiedBillBinding
}

export const useApiUsageBillsStore = defineStore('api-usage-bills', {
  state: () => ({
    rawBills: [] as ApiUsageBillMirror[],
    syncing: false,
    stale: false,
    lastSuccessAt: undefined as string | undefined,
    error: '',
    currentAppEnterpriseId: undefined as string | undefined,
    currentSpaceEnterpriseId: undefined as string | undefined,
    syncToken: 0,
    authorizationGeneration: 0,
    bindingGeneration: 0,
    verifiedBinding: undefined as VerifiedBillBinding | undefined,
    supportLinks: [] as CachedBillSupportLink[]
  }),
  getters: {
    visibleBills(state) {
      return (): ApiUsageBillView[] => {
        const viewer = authorizedViewer()
        if (!viewer || !hasVerifiedPartition(state, viewer)) return []
        return state.rawBills
          .filter((bill) => belongsToViewerPartition(bill, state, viewer))
          .map((bill) => toBillView(bill, viewer, state.stale))
          .filter((bill) => viewer.role === 'admin' || bill.lines.length > 0)
      }
    },
    billDetail(state) {
      return (spaceBillId: string): ApiUsageBillView | undefined => {
        const viewer = authorizedViewer()
        return viewer ? authorizedBillView(state, spaceBillId, viewer) : undefined
      }
    },
    supportLinkForBill(state) {
      return (spaceBillId: string, returnUrl: string, at = new Date()): string | undefined => {
        const viewer = authorizedViewer()
        const bill = viewer ? authorizedBillView(state, spaceBillId, viewer) : undefined
        if (!viewer || !bill || !state.currentSpaceEnterpriseId) return undefined
        const scope = visibilityScope(viewer, bill)
        const normalizedReturnUrl = normalizeReturnUrl(returnUrl)
        return state.supportLinks.find((link) => (
          link.spaceBillId === spaceBillId
          && link.appEnterpriseId === viewer.appEnterpriseId
          && link.spaceEnterpriseId === state.currentSpaceEnterpriseId
          && link.returnUrl === normalizedReturnUrl
          && link.operatorMemberId === viewer.memberId
          && link.role === viewer.role
          && link.authorizationGeneration === state.authorizationGeneration
          && link.bindingGeneration === state.bindingGeneration
          && sameScope(link.visibilityScope, scope)
          && !isExpired(link.expiresAt, at)
        ))?.url
      }
    }
  },
  actions: {
    async syncBills(
      appEnterpriseId: string,
      spaceEnterpriseId: string | undefined,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter,
      now: () => string = () => new Date().toISOString()
    ): Promise<void> {
      const initialViewer = authorizedViewer()
      if (!initialViewer || initialViewer.appEnterpriseId !== appEnterpriseId) {
        throw new Error('当前企业账单不可访问')
      }
      const authorizationGeneration = this.authorizationGeneration
      let binding: EnterpriseSpaceBinding
      try {
        binding = await adapter.ensureEnterpriseBinding(appEnterpriseId)
      } catch (error) {
        if (
          this.sameAuthorization(initialViewer, authorizationGeneration)
          && this.verifiedBinding
          && this.verifiedBinding.appEnterpriseId === appEnterpriseId
          && (!spaceEnterpriseId || this.verifiedBinding.spaceEnterpriseId === spaceEnterpriseId)
          && hasVerifiedPartition(this, initialViewer)
        ) {
          this.stale = true
          this.error = error instanceof Error ? error.message : '可信空间企业绑定验证失败'
        }
        throw error
      }
      if (!this.sameAuthorization(initialViewer, authorizationGeneration)) return
      const resolvedSpaceEnterpriseId = binding.spaceEnterpriseId
      if (
        binding.status !== 'active'
        || binding.appEnterpriseId !== appEnterpriseId
        || !resolvedSpaceEnterpriseId
        || (spaceEnterpriseId !== undefined && resolvedSpaceEnterpriseId !== spaceEnterpriseId)
      ) {
        this.revokeBinding('可信空间企业绑定不匹配')
        throw new Error('可信空间企业绑定不匹配')
      }

      if (
        this.verifiedBinding
        && (
          this.verifiedBinding.appEnterpriseId !== appEnterpriseId
          || this.verifiedBinding.spaceEnterpriseId !== resolvedSpaceEnterpriseId
        )
      ) {
        this.revokeBinding('可信空间企业绑定已变更')
        throw new Error('可信空间企业绑定已变更')
      }

      if (
        this.currentAppEnterpriseId !== appEnterpriseId
        || this.currentSpaceEnterpriseId !== resolvedSpaceEnterpriseId
        || !this.verifiedBinding
      ) {
        this.clearBills()
        this.currentAppEnterpriseId = appEnterpriseId
        this.currentSpaceEnterpriseId = resolvedSpaceEnterpriseId
        this.verifiedBinding = {
          appEnterpriseId,
          spaceEnterpriseId: resolvedSpaceEnterpriseId,
          generation: this.bindingGeneration,
          verifiedAt: now()
        }
      } else {
        this.verifiedBinding.verifiedAt = now()
      }

      const viewer = authorizedViewer()
      if (!viewer || viewer.appEnterpriseId !== appEnterpriseId) return
      const currentAuthorizationGeneration = this.authorizationGeneration
      const bindingGeneration = this.bindingGeneration
      const syncToken = ++this.syncToken
      this.syncing = true
      this.error = ''

      try {
        const bills = await adapter.listUsageBills(resolvedSpaceEnterpriseId)
        if (
          syncToken !== this.syncToken
          || !this.sameAuthorization(viewer, currentAuthorizationGeneration)
          || !this.sameVerifiedBinding(appEnterpriseId, resolvedSpaceEnterpriseId, bindingGeneration)
          || this.currentAppEnterpriseId !== appEnterpriseId
          || this.currentSpaceEnterpriseId !== resolvedSpaceEnterpriseId
        ) return
        this.rawBills = bills
          .filter((bill) => (
            bill.appEnterpriseId === appEnterpriseId
            && bill.spaceEnterpriseId === resolvedSpaceEnterpriseId
          ))
          .map(cloneBill)
        this.lastSuccessAt = now()
        this.stale = false
        this.pruneSupportLinks(new Date(this.lastSuccessAt))
      } catch (error) {
        if (
          syncToken === this.syncToken
          && this.sameAuthorization(viewer, currentAuthorizationGeneration)
          && this.sameVerifiedBinding(appEnterpriseId, resolvedSpaceEnterpriseId, bindingGeneration)
          && this.currentAppEnterpriseId === appEnterpriseId
          && this.currentSpaceEnterpriseId === resolvedSpaceEnterpriseId
        ) {
          this.stale = true
          this.error = error instanceof Error ? error.message : '空间账单同步失败'
        }
        throw error
      } finally {
        if (syncToken === this.syncToken) this.syncing = false
      }
    },
    async download(
      spaceBillId: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<string | undefined> {
      const viewer = authorizedViewer()
      if (!viewer || viewer.role !== 'admin' || !authorizedBillView(this, spaceBillId, viewer)) return undefined
      const authorizationGeneration = this.authorizationGeneration
      const bindingGeneration = this.bindingGeneration
      const syncToken = this.syncToken
      const appEnterpriseId = this.currentAppEnterpriseId
      const spaceEnterpriseId = this.currentSpaceEnterpriseId
      if (!appEnterpriseId || !spaceEnterpriseId) return undefined

      let binding: EnterpriseSpaceBinding
      try {
        binding = await adapter.ensureEnterpriseBinding(appEnterpriseId)
      } catch (error) {
        if (
          this.sameAuthorization(viewer, authorizationGeneration)
          && this.sameVerifiedBinding(appEnterpriseId, spaceEnterpriseId, bindingGeneration)
        ) {
          this.stale = true
          this.error = error instanceof Error ? error.message : '可信空间企业绑定验证失败'
        }
        return undefined
      }
      if (
        !this.sameAuthorization(viewer, authorizationGeneration)
        || !this.sameVerifiedBinding(appEnterpriseId, spaceEnterpriseId, bindingGeneration)
      ) return undefined
      if (!isActiveBinding(binding, appEnterpriseId, spaceEnterpriseId)) {
        this.revokeBinding('可信空间企业绑定不匹配')
        return undefined
      }
      this.verifiedBinding!.verifiedAt = new Date().toISOString()

      const url = await adapter.createBillDownloadLink(spaceBillId)
      if (
        authorizationGeneration !== this.authorizationGeneration
        || bindingGeneration !== this.bindingGeneration
        || syncToken !== this.syncToken
        || appEnterpriseId !== this.currentAppEnterpriseId
        || spaceEnterpriseId !== this.currentSpaceEnterpriseId
        || !this.sameAuthorization(viewer, authorizationGeneration)
        || !this.sameVerifiedBinding(appEnterpriseId, spaceEnterpriseId, bindingGeneration)
        || !authorizedBillView(this, spaceBillId, viewer)
      ) return undefined
      return url
    },
    async support(
      spaceBillId: string,
      returnUrl: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter,
      now: () => Date = () => new Date()
    ): Promise<string | undefined> {
      const requestedAt = now()
      this.pruneSupportLinks(requestedAt)

      const viewer = authorizedViewer()
      const bill = viewer ? authorizedBillView(this, spaceBillId, viewer) : undefined
      const appEnterpriseId = this.currentAppEnterpriseId
      const spaceEnterpriseId = this.currentSpaceEnterpriseId
      if (!viewer || !bill || !appEnterpriseId || !spaceEnterpriseId) return undefined
      const scope = visibilityScope(viewer, bill)
      const authorizationGeneration = this.authorizationGeneration
      const bindingGeneration = this.bindingGeneration
      const syncToken = this.syncToken
      let binding: EnterpriseSpaceBinding
      try {
        binding = await adapter.ensureEnterpriseBinding(appEnterpriseId)
      } catch (error) {
        if (
          this.sameAuthorization(viewer, authorizationGeneration)
          && this.sameVerifiedBinding(appEnterpriseId, spaceEnterpriseId, bindingGeneration)
        ) {
          this.stale = true
          this.error = error instanceof Error ? error.message : '可信空间企业绑定验证失败'
        }
        return undefined
      }
      if (
        !this.sameAuthorization(viewer, authorizationGeneration)
        || !this.sameVerifiedBinding(appEnterpriseId, spaceEnterpriseId, bindingGeneration)
      ) return undefined
      if (!isActiveBinding(binding, appEnterpriseId, spaceEnterpriseId)) {
        this.revokeBinding('可信空间企业绑定不匹配')
        return undefined
      }
      this.verifiedBinding!.verifiedAt = requestedAt.toISOString()

      const normalizedReturnUrl = normalizeReturnUrl(returnUrl)
      const cached = this.supportLinkForBill(spaceBillId, normalizedReturnUrl, requestedAt)
      if (cached) return cached

      const result = await adapter.createBillSupportLink({
        spaceEnterpriseId,
        operatorMemberId: viewer.memberId,
        spaceBillId,
        returnUrl: normalizedReturnUrl,
        visibilityScope: scope
      })

      const completedAt = now()
      const currentViewer = authorizedViewer()
      const currentBill = currentViewer ? authorizedBillView(this, spaceBillId, currentViewer) : undefined
      if (
        authorizationGeneration !== this.authorizationGeneration
        || bindingGeneration !== this.bindingGeneration
        || syncToken !== this.syncToken
        || !currentViewer
        || !currentBill
        || !sameViewer(viewer, currentViewer)
        || this.currentSpaceEnterpriseId !== spaceEnterpriseId
        || !this.sameVerifiedBinding(appEnterpriseId, spaceEnterpriseId, bindingGeneration)
        || !sameScope(scope, visibilityScope(currentViewer, currentBill))
        || isExpired(result.expiresAt, completedAt)
      ) return undefined

      this.supportLinks.push({
        spaceBillId,
        appEnterpriseId: viewer.appEnterpriseId,
        spaceEnterpriseId,
        returnUrl: normalizedReturnUrl,
        operatorMemberId: viewer.memberId,
        role: viewer.role,
        visibilityScope: cloneScope(scope),
        url: result.url,
        expiresAt: result.expiresAt,
        authorizationGeneration,
        bindingGeneration
      })
      return result.url
    },
    pruneSupportLinks(at = new Date()) {
      const viewer = authorizedViewer()
      this.supportLinks = this.supportLinks.filter((link) => {
        if (
          !viewer
          || link.authorizationGeneration !== this.authorizationGeneration
          || link.bindingGeneration !== this.bindingGeneration
          || link.appEnterpriseId !== viewer.appEnterpriseId
          || link.operatorMemberId !== viewer.memberId
          || link.role !== viewer.role
          || link.spaceEnterpriseId !== this.currentSpaceEnterpriseId
          || isExpired(link.expiresAt, at)
        ) return false
        const bill = authorizedBillView(this, link.spaceBillId, viewer)
        return Boolean(bill && sameScope(link.visibilityScope, visibilityScope(viewer, bill)))
      })
    },
    sameAuthorization(viewer: AuthorizedBillViewer, generation: number) {
      const current = authorizedViewer()
      return generation === this.authorizationGeneration && Boolean(current && sameViewer(viewer, current))
    },
    sameVerifiedBinding(appEnterpriseId: string, spaceEnterpriseId: string, generation: number) {
      return (
        generation === this.bindingGeneration
        && this.verifiedBinding?.generation === generation
        && this.verifiedBinding.appEnterpriseId === appEnterpriseId
        && this.verifiedBinding.spaceEnterpriseId === spaceEnterpriseId
        && this.currentAppEnterpriseId === appEnterpriseId
        && this.currentSpaceEnterpriseId === spaceEnterpriseId
      )
    },
    invalidateAuthorization() {
      this.authorizationGeneration += 1
      this.syncToken += 1
      this.syncing = false
      this.supportLinks = []
    },
    revokeBinding(message = '') {
      this.clearBills()
      this.error = message
    },
    clearBills() {
      this.invalidateAuthorization()
      this.bindingGeneration += 1
      this.verifiedBinding = undefined
      this.rawBills = []
      this.stale = false
      this.lastSuccessAt = undefined
      this.error = ''
      this.currentAppEnterpriseId = undefined
      this.currentSpaceEnterpriseId = undefined
    }
  }
})

function authorizedViewer(): AuthorizedBillViewer | undefined {
  const user = useUserStore()
  const context = user.context
  if (
    context.enterpriseAuthStatus !== 'authenticated'
    || !context.currentEnterpriseId
    || context.currentEnterpriseId !== user.enterprise.id
  ) return undefined
  const member = user.enterpriseMemberFor(context.currentEnterpriseId, context.currentMemberId)
  return member ? {
    appEnterpriseId: context.currentEnterpriseId,
    memberId: member.id,
    role: member.role
  } : undefined
}

function authorizedBillView(
  state: BillPartitionState,
  spaceBillId: string,
  viewer: AuthorizedBillViewer
): ApiUsageBillView | undefined {
  if (!hasVerifiedPartition(state, viewer)) return undefined
  const bill = state.rawBills.find((item) => (
    item.spaceBillId === spaceBillId && belongsToViewerPartition(item, state, viewer)
  ))
  const view = bill ? toBillView(bill, viewer, state.stale) : undefined
  return view && (viewer.role === 'admin' || view.lines.length > 0) ? view : undefined
}

function hasVerifiedPartition(
  state: BillPartitionState,
  viewer: AuthorizedBillViewer
) {
  return (
    state.currentAppEnterpriseId === viewer.appEnterpriseId
    && state.verifiedBinding?.appEnterpriseId === viewer.appEnterpriseId
    && state.verifiedBinding.spaceEnterpriseId === state.currentSpaceEnterpriseId
    && state.verifiedBinding.generation === state.bindingGeneration
  )
}

function belongsToViewerPartition(
  bill: ApiUsageBillMirror,
  state: BillPartitionState,
  viewer: AuthorizedBillViewer
) {
  return (
    bill.appEnterpriseId === viewer.appEnterpriseId
    && bill.appEnterpriseId === state.currentAppEnterpriseId
    && bill.spaceEnterpriseId === state.currentSpaceEnterpriseId
  )
}

function isActiveBinding(
  binding: EnterpriseSpaceBinding,
  appEnterpriseId: string,
  spaceEnterpriseId: string
) {
  return (
    binding.status === 'active'
    && binding.appEnterpriseId === appEnterpriseId
    && binding.spaceEnterpriseId === spaceEnterpriseId
  )
}

function normalizeReturnUrl(returnUrl: string) {
  const fallbackOrigin = 'https://trusted-space-return.local'
  const normalized = new URL(returnUrl, fallbackOrigin)
  normalized.searchParams.sort()
  return `${normalized.pathname}${normalized.search}${normalized.hash}`
}

function toBillView(
  bill: ApiUsageBillMirror,
  viewer: AuthorizedBillViewer,
  stale: boolean
): ApiUsageBillView {
  const lines = viewer.role === 'admin'
    ? bill.lines.map((line) => ({ ...line }))
    : bill.lines.filter((line) => line.ownerMemberId === viewer.memberId).map((line) => ({ ...line }))

  return {
    spaceBillId: bill.spaceBillId,
    billingMonth: bill.billingMonth,
    currency: bill.currency,
    rawStatus: bill.rawStatus,
    ...(viewer.role === 'admin' ? { totalAmount: bill.totalAmount } : {}),
    visibleCalls: viewer.role === 'admin' ? bill.totalCalls : sum(lines, 'calls'),
    successCalls: viewer.role === 'admin' ? bill.successCalls : sum(lines, 'successCalls'),
    lines,
    syncedAt: bill.syncedAt,
    stale
  }
}

function visibilityScope(viewer: AuthorizedBillViewer, bill: ApiUsageBillView): BillVisibilityScope {
  if (viewer.role === 'admin') return { kind: 'enterprise_statement' }
  return {
    kind: 'member_credentials',
    credentialLocators: uniqueSorted(bill.lines.map((line) => line.appCredentialId)),
    apiLocators: uniqueSorted(bill.lines.map((line) => line.apiName))
  }
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort()
}

function sameViewer(left: AuthorizedBillViewer, right: AuthorizedBillViewer) {
  return (
    left.appEnterpriseId === right.appEnterpriseId
    && left.memberId === right.memberId
    && left.role === right.role
  )
}

function sameScope(left: BillVisibilityScope, right: BillVisibilityScope) {
  if (left.kind !== right.kind) return false
  if (left.kind === 'enterprise_statement' || right.kind === 'enterprise_statement') return true
  return (
    left.credentialLocators.join('\u0000') === right.credentialLocators.join('\u0000')
    && left.apiLocators.join('\u0000') === right.apiLocators.join('\u0000')
  )
}

function cloneScope(scope: BillVisibilityScope): BillVisibilityScope {
  return scope.kind === 'enterprise_statement'
    ? { kind: scope.kind }
    : {
        kind: scope.kind,
        credentialLocators: [...scope.credentialLocators],
        apiLocators: [...scope.apiLocators]
      }
}

function isExpired(expiresAt: string, at: Date) {
  return new Date(expiresAt).getTime() <= at.getTime()
}

function sum(lines: ApiUsageBillLine[], key: 'calls' | 'successCalls') {
  return lines.reduce((total, line) => total + line[key], 0)
}

function cloneBill(bill: ApiUsageBillMirror): ApiUsageBillMirror {
  return { ...bill, lines: bill.lines.map((line) => ({ ...line })) }
}
