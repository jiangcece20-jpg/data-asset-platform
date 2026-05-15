export type ResourceType = 'table' | 'metric' | 'report' | 'dashboard' | 'api' | 'label' | 'view';

export type ResourceSummary = {
  id: string;
  type: ResourceType;
  name: string;
  displayName?: string;
  description?: string;
  sourceSystem?: string;
  sourceType?: string;
  owner?: string;
  status?: string;
  permissionStatus?: 'granted' | 'none' | 'pending' | 'unknown';
  tags?: string[];
  domain?: string;
  updatedAt?: string;
  usageCount?: number;
  qualityScore?: number;
};
