import type { PublishedStandard } from '../../types/tableBuilder';
import type { EngineType } from './ddlTemplates';

/**
 * 原型演示：按引擎类型模拟目标库列表（ods/dwd/dim 风格分层库），不连接真实数据源。
 */
export const DEMO_DATABASES: Record<EngineType, string[]> = {
  Hive: ['ods', 'dwd', 'dim'],
  MaxCompute: ['ods_mc', 'dwd_mc', 'dim_mc'],
  MySQL: ['ods_mysql', 'dwd_mysql', 'dim_mysql'],
};

export const PUBLISHED_STANDARDS: PublishedStandard[] = [
  {
    code: 'CLT_CUS_001',
    nameZh: '客户编号',
    nameEn: 'customer_code',
    setName: '客户主题标准集',
    dataType: 'VARCHAR',
    length: 32,
    nullable: false,
    primaryKey: true,
    classificationPath: '客户/基础信息/标识',
    grade: 'L1',
    keywords: ['客户编号', '客户号', 'customer_code', 'cust_id'],
  },
  {
    code: 'CLT_CUS_002',
    nameZh: '客户性别',
    nameEn: 'customer_gender',
    setName: '客户主题标准集',
    dataType: 'CHAR',
    length: 1,
    nullable: true,
    codeTable: '性别码表',
    classificationPath: '客户/基础信息/属性',
    grade: 'L2',
    keywords: ['客户性别', '性别', 'customer_gender', 'gender'],
  },
  {
    code: 'CLT_CUS_003',
    nameZh: '客户名称',
    nameEn: 'customer_name',
    setName: '客户主题标准集',
    dataType: 'VARCHAR',
    length: 128,
    nullable: false,
    classificationPath: '客户/基础信息/属性',
    grade: 'L1',
    keywords: ['客户名称', '客户名', 'customer_name', 'cust_name'],
  },
  {
    code: 'CLT_CUS_004',
    nameZh: '客户类型',
    nameEn: 'customer_type',
    setName: '客户主题标准集',
    dataType: 'VARCHAR',
    length: 16,
    nullable: true,
    codeTable: '客户类型码表',
    classificationPath: '客户/基础信息/分类',
    grade: 'L2',
    keywords: ['客户类型', 'customer_type', 'cust_type'],
  },
  {
    code: 'CLT_CUS_005',
    nameZh: '联系电话',
    nameEn: 'contact_phone',
    setName: '客户主题标准集',
    dataType: 'VARCHAR',
    length: 20,
    nullable: true,
    classificationPath: '客户/联系信息/电话',
    grade: 'L2',
    keywords: ['联系电话', '手机号', 'contact_phone', 'mobile'],
  },
];
