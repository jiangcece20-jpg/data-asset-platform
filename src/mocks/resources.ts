import type { ResourceSummary } from '../types/resources';

export const mockResources: ResourceSummary[] = [
  {
    id: 'resource-table-order-detail',
    type: 'table',
    name: 'dwd_trade_order',
    displayName: '订单明细表',
    description: '保留订单粒度的交易明细，包含渠道、城市、金额、状态等字段。',
    sourceSystem: 'MaxCompute',
    sourceType: 'warehouse_engine',
    owner: '李四',
    status: 'published',
    permissionStatus: 'granted',
    tags: ['交易域', 'DWD'],
  },
  {
    id: 'resource-report-gmv-daily',
    type: 'report',
    name: 'rpt_gmv_daily',
    displayName: 'GMV 日报',
    description: '按天展示 GMV、订单量、退款金额等核心交易指标。',
    sourceSystem: 'BI 平台',
    sourceType: 'report_system',
    owner: '王五',
    status: 'published',
    permissionStatus: 'none',
    tags: ['报表', 'GMV'],
  },
];
