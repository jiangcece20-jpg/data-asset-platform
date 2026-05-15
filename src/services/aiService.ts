import { createMockAiRecommendationEvents } from '../mocks/ai';
import type { AiProtocolEvent } from '../types/ai';

export const aiService = {
  async createMockRecommendation(keyword: string): Promise<AiProtocolEvent[]> {
    return createMockAiRecommendationEvents(keyword);
  },
};
