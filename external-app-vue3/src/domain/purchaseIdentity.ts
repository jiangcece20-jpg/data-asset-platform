import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'

export type PurchaseIdentitySubject = 'personal' | 'enterprise'

export interface PurchaseIdentity {
  subject: PurchaseIdentitySubject
  typeLabel: '个人' | '企业'
  name: string
}

type UserLike = {
  isEnterpriseAuthenticated: boolean
  context: { currentEnterpriseId?: string; name: string }
  currentEnterpriseMember?: unknown
  enterprise: { name: string }
}

export function hasEnterprisePurchaseIdentity(user: UserLike): boolean {
  return user.isEnterpriseAuthenticated
    && Boolean(user.context.currentEnterpriseId)
    && Boolean(user.currentEnterpriseMember)
}

export function currentPurchaseSubject(user: UserLike, options?: { forcePersonal?: boolean }): PurchaseIdentitySubject {
  if (options?.forcePersonal) return 'personal'
  return hasEnterprisePurchaseIdentity(user) ? 'enterprise' : 'personal'
}

export function currentPurchaseIdentity(user: UserLike, options?: { forcePersonal?: boolean }): PurchaseIdentity {
  const subject = currentPurchaseSubject(user, options)
  if (subject === 'enterprise') {
    return { subject, typeLabel: '企业', name: user.enterprise.name }
  }
  return { subject, typeLabel: '个人', name: user.context.name }
}

export function datasetPaymentPath(orderId: string, portal: boolean): string {
  return portal ? `/portal/payment/dataset/${orderId}` : `/app/payment/dataset/${orderId}`
}

/** 按当前登录身份创建数据集订单，并返回支付页路径。 */
export function startDatasetPayment(productId: string, portal: boolean) {
  const user = useUserStore()
  const commerce = useDatasetCommerceStore()
  const { order, approvalRequest } = commerce.createOrder(productId, currentPurchaseSubject(user))
  return {
    order,
    approvalRequest,
    path: datasetPaymentPath(order.id, portal)
  }
}
