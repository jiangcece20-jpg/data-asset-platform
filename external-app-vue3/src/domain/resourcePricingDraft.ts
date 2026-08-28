import type {
  AcquisitionOption,
  DashboardPaywallModule,
  DashboardPaywallSelection,
  MemberBenefit,
  ProductPrice
} from '@/types/domain'
import type { Resource, ResourcePricingDraft } from '@/types/resource'

export type { ResourcePricingDraft } from '@/types/resource'

export function emptyResourcePricingDraft(): ResourcePricingDraft {
  return {
    isFree: false,
    salePeriodMonths: 12,
    personalOffer: {
      enabled: false,
      originalPrice: 0,
      discountZhe: 10,
      price: 0,
      allowDownload: false
    },
    enterpriseOffer: {
      enabled: false,
      originalPrice: 0,
      discountZhe: 10,
      price: 0,
      allowDownload: false
    },
    standardMemberMode: 'none',
    standardMemberZhe: 6,
    standardMemberOriginalPrice: 0,
    premiumMemberMode: 'none',
    premiumMemberZhe: 6,
    premiumMemberOriginalPrice: 0
  }
}

export function paywallFromResource(resource: Resource | undefined): DashboardPaywallSelection | undefined {
  return resource?.typeDetail.dashboard?.paywall
    ? {
        maskedModuleIds: [...resource.typeDetail.dashboard.paywall.maskedModuleIds],
        maskedFieldKeys: [...resource.typeDetail.dashboard.paywall.maskedFieldKeys],
        maskedButtons: resource.typeDetail.dashboard.paywall.maskedButtons.map((item) => ({ ...item }))
      }
    : undefined
}

export function paywallCatalogFromResource(resource: Resource | undefined): DashboardPaywallModule[] | undefined {
  return resource?.typeDetail.dashboard?.paywallCatalog?.map((module) => ({
    ...module,
    fields: module.fields.map((field) => ({ ...field })),
    buttons: module.buttons.map((button) => ({ ...button }))
  }))
}

export interface ResourcePricingDraftInput {
  isFree: boolean
  salePeriodMonths: number
  personalOffer: ResourcePricingDraft['personalOffer']
  enterpriseOffer: ResourcePricingDraft['enterpriseOffer']
  standardMemberMode: ResourcePricingDraft['standardMemberMode']
  standardMemberZhe: number
  standardMemberOriginalPrice: number
  premiumMemberMode: ResourcePricingDraft['premiumMemberMode']
  premiumMemberZhe: number
  premiumMemberOriginalPrice: number
  memberBenefits: MemberBenefit[]
  acquisitions: AcquisitionOption[]
  price: ProductPrice
  paywall?: DashboardPaywallSelection
  paywallCatalog?: DashboardPaywallModule[]
}

export function buildResourcePricingDraft(input: ResourcePricingDraftInput): ResourcePricingDraft {
  return {
    isFree: input.isFree,
    salePeriodMonths: input.salePeriodMonths,
    personalOffer: { ...input.personalOffer },
    enterpriseOffer: { ...input.enterpriseOffer },
    standardMemberMode: input.standardMemberMode,
    standardMemberZhe: input.standardMemberZhe,
    standardMemberOriginalPrice: input.standardMemberOriginalPrice,
    premiumMemberMode: input.premiumMemberMode,
    premiumMemberZhe: input.premiumMemberZhe,
    premiumMemberOriginalPrice: input.premiumMemberOriginalPrice,
    paywall: input.paywall
      ? {
          maskedModuleIds: [...input.paywall.maskedModuleIds],
          maskedFieldKeys: [...input.paywall.maskedFieldKeys],
          maskedButtons: input.paywall.maskedButtons.map((item) => ({ ...item }))
        }
      : undefined,
    paywallCatalog: input.paywallCatalog?.map((module) => ({
      ...module,
      fields: module.fields.map((field) => ({ ...field })),
      buttons: module.buttons.map((button) => ({ ...button }))
    }))
  }
}

export function applyResourcePricingDraftToForms(
  draft: ResourcePricingDraft | undefined,
  target: {
    isFree: boolean
    salePeriodMonths: number
    personalOffer: NonNullable<ResourcePricingDraft['personalOffer']>
    enterpriseOffer: NonNullable<ResourcePricingDraft['enterpriseOffer']>
    standardMemberMode: ResourcePricingDraft['standardMemberMode']
    standardMemberZhe: number
    standardMemberOriginalPrice: number
    premiumMemberMode: ResourcePricingDraft['premiumMemberMode']
    premiumMemberZhe: number
    premiumMemberOriginalPrice: number
  }
) {
  const base = draft ?? emptyResourcePricingDraft()
  target.isFree = base.isFree ?? false
  target.salePeriodMonths = base.salePeriodMonths ?? 12
  Object.assign(target.personalOffer, base.personalOffer ?? emptyResourcePricingDraft().personalOffer!)
  Object.assign(target.enterpriseOffer, base.enterpriseOffer ?? emptyResourcePricingDraft().enterpriseOffer!)
  target.standardMemberMode = base.standardMemberMode ?? 'none'
  target.standardMemberZhe = base.standardMemberZhe ?? 6
  target.standardMemberOriginalPrice = base.standardMemberOriginalPrice ?? 0
  target.premiumMemberMode = base.premiumMemberMode ?? 'none'
  target.premiumMemberZhe = base.premiumMemberZhe ?? 6
  target.premiumMemberOriginalPrice = base.premiumMemberOriginalPrice ?? 0
}
