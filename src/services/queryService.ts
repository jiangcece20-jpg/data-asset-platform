import { mockOrderQueryResult } from '../mocks/queries';
import type { QueryResult } from '../types/queries';

export const queryService = {
  async previewSql(sql: string): Promise<QueryResult> {
    if (!sql.trim()) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        durationMs: 0,
        truncated: false,
      };
    }

    return mockOrderQueryResult;
  },
};
