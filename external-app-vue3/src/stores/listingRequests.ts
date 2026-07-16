import { defineStore } from 'pinia'
import type { ListingRequest, ListingRequestPayload, ListingRequestStatus } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'

const OPEN_STATUSES: ListingRequestStatus[] = ['submitted', 'evaluating', 'preparing']

export const useListingRequestStore = defineStore('listingRequests', {
  state: () => ({
    list: [] as ListingRequest[]
  }),
  getters: {
    byProduct(state) {
      return (productId: string, userId?: string): ListingRequest | undefined => {
        const filtered = state.list.filter(
          (r) => r.productId === productId && (!userId || r.userId === userId)
        )
        return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      }
    },
    byUser(state) {
      return (userId: string): ListingRequest[] =>
        state.list.filter((r) => r.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
  },
  actions: {
    submit(payload: ListingRequestPayload): ListingRequest {
      const existing = this.list.find(
        (r) =>
          r.productId === payload.productId &&
          r.userId === payload.userId &&
          OPEN_STATUSES.includes(r.status)
      )
      if (existing) return existing

      const request: ListingRequest = {
        id: genId('listing'),
        ...payload,
        status: 'submitted',
        feedbackMessage: '',
        alternativeProductIds: [],
        createdAt: now(),
        updatedAt: now()
      }
      this.list.push(request)
      return request
    },
    advance(
      id: string,
      status: ListingRequestStatus,
      feedbackMessage: string,
      alternativeProductIds: string[] = []
    ): void {
      const request = this.list.find((r) => r.id === id)
      if (!request) return
      request.status = status
      request.feedbackMessage = feedbackMessage
      request.alternativeProductIds = alternativeProductIds
      request.updatedAt = now()

      const catalog = useCatalogStore()
      if (status === 'published') {
        catalog.updateAvailability(request.productId, 'published')
      } else if (status === 'preparing') {
        catalog.updateAvailability(request.productId, 'preparing')
      }
    }
  }
})
