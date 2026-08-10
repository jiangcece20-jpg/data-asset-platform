/**
 * 原型演示：模拟建表平台管理的全部表列表。
 * createdByBuilder 标识是否通过建表平台（标准建表向导）创建。
 */
export type TableListItem = {
  id: string;
  nameZh: string;
  nameEn: string;
  database: string;
  engine: string;
  fieldCount: number;
  createdByBuilder: boolean;
  createdAt: string;
  description: string;
};

export const MOCK_TABLES: TableListItem[] = [
  {
    id: 't1',
    nameZh: '客户维表',
    nameEn: 'dim_customer',
    database: 'dwd',
    engine: 'Hive',
    fieldCount: 12,
    createdByBuilder: true,
    createdAt: '2026-07-15 10:30:00',
    description: '客户主体维度表',
  },
  {
    id: 't2',
    nameZh: '订单明细表',
    nameEn: 'dwd_order_detail',
    database: 'dwd',
    engine: 'Hive',
    fieldCount: 25,
    createdByBuilder: false,
    createdAt: '2026-06-20 14:00:00',
    description: '历史遗留表，通过 DDL 导入',
  },
  {
    id: 't3',
    nameZh: '商品维表',
    nameEn: 'dim_product',
    database: 'dim',
    engine: 'Hive',
    fieldCount: 18,
    createdByBuilder: true,
    createdAt: '2026-07-18 09:15:00',
    description: '商品主体维度表',
  },
  {
    id: 't4',
    nameZh: '用户行为日志',
    nameEn: 'ods_user_log',
    database: 'ods',
    engine: 'Hive',
    fieldCount: 8,
    createdByBuilder: false,
    createdAt: '2026-05-10 08:00:00',
    description: '原始日志表，采集同步',
  },
  {
    id: 't5',
    nameZh: '客户汇总表',
    nameEn: 'dws_customer_summary',
    database: 'dwd',
    engine: 'Hive',
    fieldCount: 15,
    createdByBuilder: true,
    createdAt: '2026-07-20 16:45:00',
    description: '客户粒度汇总指标',
  },
  {
    id: 't6',
    nameZh: '门店信息表',
    nameEn: 'dim_store',
    database: 'dim_mysql',
    engine: 'MySQL',
    fieldCount: 10,
    createdByBuilder: false,
    createdAt: '2026-04-05 11:20:00',
    description: '业务系统同步表',
  },
  {
    id: 't7',
    nameZh: '优惠券明细表',
    nameEn: 'dwd_coupon_detail',
    database: 'dwd',
    engine: 'Hive',
    fieldCount: 20,
    createdByBuilder: true,
    createdAt: '2026-07-22 13:10:00',
    description: '优惠券发券与核销明细',
  },
];
