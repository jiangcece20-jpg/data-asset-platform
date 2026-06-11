import type { EvidenceSource } from './ai';

export type QueryResultColumn = {
  key: string;
  title: string;
  type?: string;
};

export type QueryResult = {
  columns: QueryResultColumn[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  durationMs?: number;
  truncated?: boolean;
  source?: EvidenceSource;
};
