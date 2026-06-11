import type { AiProtocolEvent } from '../types/ai';
import { mockResources } from './resources';

export function createMockAiRecommendationEvents(keyword: string): AiProtocolEvent[] {
  const resources = mockResources.filter((resource) => `${resource.name}${resource.displayName ?? ''}${resource.description ?? ''}`.includes(keyword));

  return [
    { type: 'step', content: { label: '解析问题', status: 'done' } },
    { type: 'step', content: { label: '检索元数据', status: 'done' } },
    {
      type: 'resource',
      content: {
        resources,
        evidence: {
          mode: 'metadata',
          tables: resources.map((item) => item.name),
          permissionChecked: true,
          note: 'AI 协议 mock，仅用于组件边界验证。',
        },
      },
    },
    { type: 'done', content: { message: 'mock recommendation completed' } },
  ];
}
