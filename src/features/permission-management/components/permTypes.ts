export type PermSubOrder = {
  assetName: string;
  assetDisplay?: string;
  assetTypeTag?: string;
  status: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  rejectReason?: string;
  timeline: Array<{ label: string; time: string; status: 'done' | 'rejected' | 'waiting' }>;
  /** Full asset info card shown on approver side — hidden when absent */
  assetDetail?: {
    assetType: string;
    securityLevel: string;
    securityLevelTone: 'warning' | 'danger' | 'success' | 'gray';
    source: string;
    updateFrequency: string;
  };
};
