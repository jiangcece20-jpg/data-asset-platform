import type { QueryResult } from '../types/queries';

export const mockOrderQueryResult: QueryResult = {
  columns: [
    { key: 'stat_date', title: '日期', type: 'date' },
    { key: 'channel', title: '渠道', type: 'string' },
    { key: 'gmv', title: 'GMV', type: 'number' },
  ],
  rows: [
    { stat_date: '2026-05-14', channel: 'APP', gmv: 328900 },
    { stat_date: '2026-05-14', channel: '小程序', gmv: 198600 },
  ],
  rowCount: 2,
  durationMs: 286,
  truncated: false,
  source: {
    mode: 'white_list_sql',
    tables: ['dwd_trade_order'],
    fields: ['stat_date', 'channel', 'gmv'],
    timeCondition: 'stat_date = 2026-05-14',
    permissionChecked: true,
  },
};
