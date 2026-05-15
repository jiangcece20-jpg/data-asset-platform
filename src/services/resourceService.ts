import { mockResources } from '../mocks/resources';
import type { ResourceSummary } from '../types/resources';

export const resourceService = {
  async searchResources(keyword: string): Promise<ResourceSummary[]> {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized) return mockResources;

    return mockResources.filter((resource) =>
      [resource.name, resource.displayName, resource.description, resource.sourceSystem, ...(resource.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  },
};
