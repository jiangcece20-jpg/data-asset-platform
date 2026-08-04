import type { BiProvisionInput, BiProvisionResult } from '@/types/datasetCommerce'

export interface BiDeliveryAdapter {
  provision(input: BiProvisionInput): BiProvisionResult
}
