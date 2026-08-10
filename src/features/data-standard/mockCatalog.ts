/** 数据标准壳 — 标准集目录（原型演示数据） */

export type StandardSet = {
  id: string;
  name: string;
  domain: string;
  standardCount: number;
  publishedCount: number;
  draftCount: number;
  owner: string;
  updatedAt: string;
};

export const STANDARD_SETS: StandardSet[] = [
  {
    id: 'set-customer',
    name: '客户主题标准集',
    domain: '客户域',
    standardCount: 12,
    publishedCount: 5,
    draftCount: 1,
    owner: '数据治理组',
    updatedAt: '2026-07-28',
  },
  {
    id: 'set-order',
    name: '交易主题标准集',
    domain: '交易域',
    standardCount: 18,
    publishedCount: 15,
    draftCount: 0,
    owner: '数据治理组',
    updatedAt: '2026-07-15',
  },
  {
    id: 'set-marketing',
    name: '营销主题标准集',
    domain: '营销域',
    standardCount: 6,
    publishedCount: 2,
    draftCount: 2,
    owner: '营销数据组',
    updatedAt: '2026-08-02',
  },
];
