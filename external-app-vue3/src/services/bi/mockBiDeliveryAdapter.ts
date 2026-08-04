import type { BiDeliveryAdapter } from './BiDeliveryAdapter'
import type { BiProvisionInput, BiProvisionResult } from '@/types/datasetCommerce'

class MockBiDeliveryAdapter implements BiDeliveryAdapter {
  private failNextRequest = false

  failNext() {
    this.failNextRequest = true
  }

  reset() {
    this.failNextRequest = false
  }

  provision(input: BiProvisionInput): BiProvisionResult {
    if (this.failNextRequest) {
      this.failNextRequest = false
      throw new Error('BI 模拟网关暂时不可用')
    }
    const suffix = `${input.productId}-${input.ownerId}`.replace(/[^a-zA-Z0-9-]/g, '')
    const deliveredAt = new Date().toISOString()
    return {
      datasetInstanceId: `bi-dataset-${suffix}`,
      biEntryUrl: `/bi/workbench/dataset/bi-dataset-${suffix}`,
      deliveredAt,
      lastSuccessfulRefreshAt: deliveredAt
    }
  }
}

export const mockBiDeliveryAdapter = new MockBiDeliveryAdapter()
