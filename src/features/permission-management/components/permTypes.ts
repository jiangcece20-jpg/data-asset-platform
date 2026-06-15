export type PermSubOrder = {
  assetName: string;
  assetDisplay?: string;
  status: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  rejectReason?: string;
  timeline: Array<{ label: string; time: string; status: 'done' | 'rejected' | 'waiting' }>;
};
