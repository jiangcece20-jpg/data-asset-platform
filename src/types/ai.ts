import type { QueryResult } from './queries';
import type { ResourceSummary } from './resources';

export type EvidenceSource = {
  mode: 'metadata' | 'metric_service' | 'white_list_sql' | 'manual';
  tables?: string[];
  fields?: string[];
  timeCondition?: string;
  permissionChecked?: boolean;
  note?: string;
};

export type AiProtocolEvent =
  | { type: 'step'; content: { label: string; status: 'pending' | 'running' | 'done' | 'failed' } }
  | { type: 'resource'; content: { resources: ResourceSummary[]; evidence?: EvidenceSource } }
  | { type: 'sql'; content: { sql: string; evidence?: EvidenceSource } }
  | { type: 'chart'; content: { result: QueryResult; evidence?: EvidenceSource } }
  | { type: 'evidence'; content: EvidenceSource }
  | { type: 'done'; content: { message: string } }
  | { type: 'error'; content: { message: string } };
