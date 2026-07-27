import { defineStore } from 'pinia'
import { trustedSpaceAdapter, type TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import type { EnterpriseAuthStatus } from '@/types/domain'
import type { EnterpriseSpaceBinding, SpacePurchaseIntent } from '@/types/trustedSpace'
import { genId } from '@/utils/id'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useUserStore } from './user'

const INTENT_TTL_MS = 30 * 60 * 1000
type PurchaseClock = Date | (() => Date)

interface AuthorizedPurchaseContext {
  appEnterpriseId: string
  operatorMemberId: string
  enterpriseContextGeneration: number
}

interface PurchaseAuthorizationState {
  authorizationGeneration: number
  bindings: EnterpriseSpaceBinding[]
}

export interface PrepareSpacePurchaseInput {
  appEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  enterpriseAuthStatus: EnterpriseAuthStatus
  returnUrl: string
}

export const useTrustedSpacePurchaseStore = defineStore('trusted-space-purchase', {
  state: () => ({
    intents: [] as SpacePurchaseIntent[],
    bindings: [] as EnterpriseSpaceBinding[],
    authorizationGeneration: 0,
    linkRequestTokens: {} as Record<string, number>
  }),
  getters: {
    byId(state) {
      return (intentId: string) => state.intents.find((intent) => intent.id === intentId)
    },
    bindingForEnterprise(state) {
      return (appEnterpriseId: string) => state.bindings.find((binding) => binding.appEnterpriseId === appEnterpriseId)
    }
  },
  actions: {
    async preparePurchase(
      input: PrepareSpacePurchaseInput,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter
    ): Promise<SpacePurchaseIntent> {
      const authorization = requireInputAuthorization(input)
      const authorizationGeneration = this.authorizationGeneration
      const binding = await adapter.ensureEnterpriseBinding(input.appEnterpriseId)
      if (!sameAuthorization(authorization, authorizationGeneration, this.authorizationGeneration)) {
        throw new Error('企业购买上下文已失效')
      }
      const bindingMatchesEnterprise = binding.appEnterpriseId === input.appEnterpriseId

      const catalog = useTrustedSpaceCatalogStore()
      const check = catalog.purchaseCheck(
        input.appProductId,
        'authenticated',
        bindingMatchesEnterprise ? binding.status : 'failed'
      )
      if (!check.allowed) throw new Error(purchaseBlockMessage(check.reason))

      const snapshot = catalog.byProductId(input.appProductId)
      if (!snapshot || !binding.spaceEnterpriseId) throw new Error('可信空间商品或企业映射不可用')
      if (
        !sameAuthorization(authorization, authorizationGeneration, this.authorizationGeneration)
        || catalog.byProductId(input.appProductId)?.spaceProductNo !== snapshot.spaceProductNo
        || !catalog.purchaseCheck(input.appProductId, 'authenticated', binding.status).allowed
      ) throw new Error('企业购买上下文已失效')

      const createdAt = new Date().toISOString()
      const intent: SpacePurchaseIntent = {
        id: genId('intent'),
        appEnterpriseId: input.appEnterpriseId,
        spaceEnterpriseId: binding.spaceEnterpriseId,
        operatorMemberId: input.operatorMemberId,
        appProductId: input.appProductId,
        spaceProductNo: snapshot.spaceProductNo,
        productSnapshotVersion: snapshot.version,
        returnUrl: input.returnUrl,
        idempotencyKey: genId('idem'),
        correlationId: genId('corr'),
        authorizationGeneration,
        enterpriseContextGeneration: authorization.enterpriseContextGeneration,
        status: 'ready',
        createdAt,
        expiresAt: new Date(new Date(createdAt).getTime() + INTENT_TTL_MS).toISOString()
      }
      this.upsertBinding(binding)
      this.intents.push(intent)
      return intent
    },
    async createLink(
      intentId: string,
      adapter: TrustedSpaceAdapter = trustedSpaceAdapter,
      clock: PurchaseClock = () => new Date()
    ): Promise<string> {
      const requestedAt = readClock(clock)
      const intent = this.byId(intentId)
      if (!intent) throw new Error('购买意图不存在')
      if (!['ready', 'failed'].includes(intent.status)) throw new Error('购买意图当前不可重新连接')
      if (!intentAuthorizationMatches(this, intent)) throw new Error('企业购买上下文已失效')
      if (isExpired(intent.expiresAt, requestedAt)) {
        clearPurchaseLink(intent)
        intent.status = 'expired'
        throw new Error('购买意图已过期')
      }
      const requestToken = (this.linkRequestTokens[intentId] ?? 0) + 1
      this.linkRequestTokens[intentId] = requestToken

      const cachedBinding = this.bindingForEnterprise(intent.appEnterpriseId)
      let binding: EnterpriseSpaceBinding
      try {
        binding = await adapter.ensureEnterpriseBinding(intent.appEnterpriseId)
      } catch (error) {
        assertCurrentLinkRequest(this, intent, requestToken)
        const reason = error instanceof Error ? error.message : '可信空间企业绑定校验失败'
        failPurchaseLink(intent, reason)
        throw error
      }
      assertCurrentLinkRequest(this, intent, requestToken)
      if (
        cachedBinding?.status === 'active'
        && cachedBinding.spaceEnterpriseId !== intent.spaceEnterpriseId
      ) {
        failPurchaseLink(intent, '可信空间企业绑定已变化')
        throw new Error('企业购买上下文已失效')
      }
      if (binding.appEnterpriseId === intent.appEnterpriseId) this.upsertBinding(binding)
      const bindingCheckedAt = readClock(clock)
      const beforeCheck = validateIntentFacts(this, intent, bindingCheckedAt, binding)
      if (!beforeCheck.allowed) {
        failPurchaseLink(intent, beforeCheck.reason)
        throw new Error(beforeCheck.reason)
      }
      if (isExpired(intent.expiresAt, bindingCheckedAt)) {
        clearPurchaseLink(intent)
        intent.status = 'expired'
        throw new Error('购买意图已过期')
      }

      let link: Awaited<ReturnType<TrustedSpaceAdapter['createPurchaseLink']>>
      try {
        link = await adapter.createPurchaseLink({
          intentId: intent.id,
          spaceEnterpriseId: intent.spaceEnterpriseId,
          operatorMemberId: intent.operatorMemberId,
          spaceProductNo: intent.spaceProductNo,
          returnUrl: intent.returnUrl
        })
      } catch (error) {
        assertCurrentLinkRequest(this, intent, requestToken)
        const completedAt = readClock(clock)
        if (isExpired(intent.expiresAt, completedAt)) {
          clearPurchaseLink(intent)
          intent.status = 'expired'
          throw new Error('购买意图已过期')
        }
        failPurchaseLink(intent, error instanceof Error ? error.message : '可信空间连接失败')
        throw error
      }

      const completedAt = readClock(clock)
      assertCurrentLinkRequest(this, intent, requestToken)
      if (isExpired(intent.expiresAt, completedAt)) {
        clearPurchaseLink(intent)
        intent.status = 'expired'
        throw new Error('购买意图已过期')
      }
      if (isExpired(link.expiresAt, completedAt)) {
        failPurchaseLink(intent, '可信空间短链已过期')
        throw new Error('可信空间短链已过期')
      }

      let finalBinding: EnterpriseSpaceBinding
      try {
        finalBinding = await adapter.ensureEnterpriseBinding(intent.appEnterpriseId)
      } catch (error) {
        assertCurrentLinkRequest(this, intent, requestToken)
        const reason = error instanceof Error ? error.message : '可信空间企业绑定校验失败'
        failPurchaseLink(intent, reason)
        throw error
      }
      assertCurrentLinkRequest(this, intent, requestToken)
      if (finalBinding.appEnterpriseId === intent.appEnterpriseId) this.upsertBinding(finalBinding)
      const finalCheckedAt = readClock(clock)
      const finalCheck = validateIntentFacts(this, intent, finalCheckedAt, finalBinding)
      if (!finalCheck.allowed) {
        failPurchaseLink(intent, finalCheck.reason)
        throw new Error(finalCheck.reason)
      }
      if (isExpired(intent.expiresAt, finalCheckedAt)) {
        clearPurchaseLink(intent)
        intent.status = 'expired'
        throw new Error('购买意图已过期')
      }
      if (isExpired(link.expiresAt, finalCheckedAt)) {
        failPurchaseLink(intent, '可信空间短链已过期')
        throw new Error('可信空间短链已过期')
      }

      intent.purchaseUrl = link.url
      intent.purchaseLinkExpiresAt = link.expiresAt
      intent.failureReason = undefined
      intent.status = 'ready'
      return link.url
    },
    markRedirected(intentId: string, at = new Date()) {
      const intent = this.byId(intentId)
      if (!intent || intent.status !== 'ready') return
      const check = validateIntentFacts(this, intent, at)
      if (!check.allowed) {
        failPurchaseLink(intent, check.reason)
        return
      }
      if (hasLiveLink(intent, at)) intent.status = 'redirected'
    },
    markReturned(intentId: string, at = new Date()) {
      const intent = this.byId(intentId)
      if (!intent || intent.status !== 'redirected') return
      const check = validateIntentFacts(this, intent, at)
      if (!check.allowed) {
        failPurchaseLink(intent, check.reason)
        return
      }
      intent.status = 'returned_pending_sync'
      intent.returnedAt = at.toISOString()
    },
    linkOrder(intentId: string) {
      const intent = this.byId(intentId)
      if (intent && intent.status === 'returned_pending_sync') intent.status = 'linked'
    },
    hasActivePurchaseLink(intentId: string, at = new Date()): boolean {
      const intent = this.byId(intentId)
      if (!intent) return false
      const check = validateIntentFacts(this, intent, at)
      if (!check.allowed) {
        failPurchaseLink(intent, check.reason)
        return false
      }
      return hasLiveLink(intent, at)
    },
    isIntentExpired(intentId: string, at = new Date()): boolean {
      const intent = this.byId(intentId)
      return Boolean(intent && isExpired(intent.expiresAt, at))
    },
    clearIntents() {
      this.invalidateAuthorization()
    },
    invalidateAuthorization() {
      this.authorizationGeneration += 1
      this.intents = []
      this.bindings = []
      this.linkRequestTokens = {}
    },
    upsertBinding(binding: EnterpriseSpaceBinding) {
      const index = this.bindings.findIndex((item) => item.appEnterpriseId === binding.appEnterpriseId)
      if (index >= 0) this.bindings[index] = { ...binding }
      else this.bindings.push({ ...binding })
    }
  }
})

function requireInputAuthorization(input: PrepareSpacePurchaseInput): AuthorizedPurchaseContext {
  const user = useUserStore()
  const context = user.context
  if (
    context.enterpriseAuthStatus !== 'authenticated'
    || !context.currentEnterpriseId
    || context.currentEnterpriseId !== user.enterprise.id
  ) throw new Error('可信空间购买仅限认证企业')
  if (
    context.currentEnterpriseId !== input.appEnterpriseId
    || context.currentMemberId !== input.operatorMemberId
  ) throw new Error('企业购买上下文不匹配')
  if (!user.enterpriseMemberFor(context.currentEnterpriseId, context.currentMemberId)) {
    throw new Error('当前企业经办人无效')
  }
  return {
    appEnterpriseId: context.currentEnterpriseId,
    operatorMemberId: context.currentMemberId,
    enterpriseContextGeneration: user.enterpriseContextGeneration
  }
}

function currentAuthorization(): AuthorizedPurchaseContext | undefined {
  const user = useUserStore()
  const context = user.context
  if (
    context.enterpriseAuthStatus !== 'authenticated'
    || !context.currentEnterpriseId
    || context.currentEnterpriseId !== user.enterprise.id
    || !user.enterpriseMemberFor(context.currentEnterpriseId, context.currentMemberId)
  ) return undefined
  return {
    appEnterpriseId: context.currentEnterpriseId,
    operatorMemberId: context.currentMemberId,
    enterpriseContextGeneration: user.enterpriseContextGeneration
  }
}

function sameAuthorization(
  expected: AuthorizedPurchaseContext,
  expectedPurchaseGeneration: number,
  currentPurchaseGeneration: number
): boolean {
  const current = currentAuthorization()
  return Boolean(
    current
    && expectedPurchaseGeneration === currentPurchaseGeneration
    && current.appEnterpriseId === expected.appEnterpriseId
    && current.operatorMemberId === expected.operatorMemberId
    && current.enterpriseContextGeneration === expected.enterpriseContextGeneration
  )
}

function intentAuthorizationMatches(state: PurchaseAuthorizationState, intent: SpacePurchaseIntent): boolean {
  const current = currentAuthorization()
  return Boolean(
    current
    && intent.authorizationGeneration === state.authorizationGeneration
    && intent.enterpriseContextGeneration === current.enterpriseContextGeneration
    && intent.appEnterpriseId === current.appEnterpriseId
    && intent.operatorMemberId === current.operatorMemberId
  )
}

type IntentFactsCheck = { allowed: true } | { allowed: false; reason: string }

function validateIntentFacts(
  state: PurchaseAuthorizationState,
  intent: SpacePurchaseIntent,
  at: Date,
  binding = state.bindings.find((item) => item.appEnterpriseId === intent.appEnterpriseId)
): IntentFactsCheck {
  if (!intentAuthorizationMatches(state, intent)) {
    return { allowed: false, reason: '企业购买上下文已失效' }
  }
  if (
    !binding
    || binding.appEnterpriseId !== intent.appEnterpriseId
    || binding.status !== 'active'
    || !binding.spaceEnterpriseId
  ) {
    return { allowed: false, reason: '企业尚未完成可信空间绑定' }
  }
  if (binding.spaceEnterpriseId !== intent.spaceEnterpriseId) {
    return { allowed: false, reason: '可信空间企业绑定已变化' }
  }

  const catalog = useTrustedSpaceCatalogStore()
  const snapshot = catalog.byProductId(intent.appProductId)
  if (!snapshot) return { allowed: false, reason: '可信空间商品不可用' }
  if (snapshot.spaceProductNo !== intent.spaceProductNo) {
    return { allowed: false, reason: '可信空间商品映射已变化' }
  }
  if (snapshot.version !== intent.productSnapshotVersion) {
    return { allowed: false, reason: '可信空间商品版本已变化' }
  }
  const purchaseCheck = catalog.purchaseCheck(
    intent.appProductId,
    'authenticated',
    binding.status,
    at.toISOString()
  )
  return purchaseCheck.allowed
    ? { allowed: true }
    : { allowed: false, reason: purchaseBlockMessage(purchaseCheck.reason) }
}

function assertCurrentLinkRequest(
  state: PurchaseAuthorizationState & {
    intents: SpacePurchaseIntent[]
    linkRequestTokens: Record<string, number>
  },
  intent: SpacePurchaseIntent,
  requestToken: number
) {
  if (
    state.intents.find((item) => item.id === intent.id) !== intent
    || !['ready', 'failed'].includes(intent.status)
    || !intentAuthorizationMatches(state, intent)
  ) {
    throw new Error('企业购买上下文已失效')
  }
  if (state.linkRequestTokens[intent.id] !== requestToken) {
    throw new Error('购买链接请求已失效')
  }
}

function clearPurchaseLink(intent: SpacePurchaseIntent) {
  intent.purchaseUrl = undefined
  intent.purchaseLinkExpiresAt = undefined
}

function failPurchaseLink(intent: SpacePurchaseIntent, reason: string) {
  clearPurchaseLink(intent)
  intent.failureReason = reason
  if (['ready', 'failed'].includes(intent.status)) intent.status = 'failed'
}

function hasLiveLink(intent: SpacePurchaseIntent, at: Date): boolean {
  return Boolean(
    intent.purchaseUrl
    && intent.purchaseLinkExpiresAt
    && !isExpired(intent.expiresAt, at)
    && !isExpired(intent.purchaseLinkExpiresAt, at)
  )
}

function readClock(clock: PurchaseClock): Date {
  return typeof clock === 'function' ? clock() : clock
}

function isExpired(expiresAt: string, at: Date): boolean {
  return new Date(expiresAt).getTime() <= at.getTime()
}

function purchaseBlockMessage(reason: string): string {
  switch (reason) {
    case 'enterprise_required': return '可信空间购买仅限认证企业'
    case 'binding_required': return '企业尚未完成可信空间绑定'
    case 'product_unavailable': return '可信空间商品不可用'
    case 'product_stale': return '可信空间商品信息同步中'
    case 'product_not_for_sale': return '可信空间商品暂不可购买'
    default: return '可信空间购买暂不可用'
  }
}
