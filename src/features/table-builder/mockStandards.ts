import type { PublishedStandard, WordRoot } from '../../types/tableBuilder';
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

/**
 * 原型演示：模拟企业级词根库，供建表时分词匹配推荐字段英文名。
 * 词根由专人管理，包含名称（中文）、全称（英文）、缩写三要素。
 */
export const WORD_ROOTS: WordRoot[] = [
  { name: '客户', fullName: 'customer', abbreviation: 'cust', description: '客户主体' },
  { name: '用户', fullName: 'user', abbreviation: 'user', description: '用户主体' },
  { name: '商品', fullName: 'product', abbreviation: 'prd', description: '商品' },
  { name: '订单', fullName: 'order', abbreviation: 'order', description: '订单' },
  { name: '门店', fullName: 'store', abbreviation: 'store', description: '门店' },
  { name: '编号', fullName: 'code', abbreviation: 'code', description: '编码标识' },
  { name: '编码', fullName: 'code', abbreviation: 'code', description: '编码' },
  { name: '名称', fullName: 'name', abbreviation: 'name', description: '名称' },
  { name: '性别', fullName: 'gender', abbreviation: 'gender', description: '性别' },
  { name: '类型', fullName: 'type', abbreviation: 'type', description: '类型分类' },
  { name: '状态', fullName: 'status', abbreviation: 'status', description: '状态' },
  { name: '金额', fullName: 'amount', abbreviation: 'amt', description: '金额' },
  { name: '数量', fullName: 'quantity', abbreviation: 'qty', description: '数量' },
  { name: '价格', fullName: 'price', abbreviation: 'price', description: '价格' },
  { name: '折扣', fullName: 'discount', abbreviation: 'disc', description: '折扣' },
  { name: '电话', fullName: 'phone', abbreviation: 'phone', description: '联系电话' },
  { name: '手机', fullName: 'mobile', abbreviation: 'mobile', description: '手机号' },
  { name: '地址', fullName: 'address', abbreviation: 'addr', description: '地址' },
  { name: '邮箱', fullName: 'email', abbreviation: 'email', description: '邮箱' },
  { name: '时间', fullName: 'time', abbreviation: 'time', description: '时间' },
  { name: '日期', fullName: 'date', abbreviation: 'date', description: '日期' },
  { name: '年龄', fullName: 'age', abbreviation: 'age', description: '年龄' },
  { name: '密码', fullName: 'password', abbreviation: 'pwd', description: '密码' },
  { name: '优惠券', fullName: 'coupon', abbreviation: 'coupon', description: '优惠券' },
  { name: '国家', fullName: 'country', abbreviation: 'country', description: '国家' },
  { name: '省份', fullName: 'province', abbreviation: 'prov', description: '省份' },
  { name: '城市', fullName: 'city', abbreviation: 'city', description: '城市' },
  { name: '区县', fullName: 'district', abbreviation: 'dist', description: '区县' },
  { name: '创建', fullName: 'create', abbreviation: 'crt', description: '创建' },
  { name: '更新', fullName: 'update', abbreviation: 'upd', description: '更新' },
];
