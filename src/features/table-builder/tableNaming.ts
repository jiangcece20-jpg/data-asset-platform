import type { ModelingLayer, PartitionType, TableNamingConfig } from '../../types/tableBuilder';

/** 建模分层选项 */
export const MODELING_LAYERS: { key: ModelingLayer; label: string }[] = [
  { key: 'ODS', label: 'ODS' },
  { key: 'DWD', label: 'DWD' },
  { key: 'DWS', label: 'DWS' },
  { key: 'DM', label: 'DM' },
  { key: 'ADS', label: 'ADS' },
  { key: 'DIM', label: 'DIM' },
];

/** 分区类型选项 */
export const PARTITION_TYPES: { key: PartitionType; label: string }[] = [
  { key: 'di', label: 'di (天增量)' },
  { key: 'df', label: 'df (天全量)' },
  { key: 'none', label: '无' },
];

export type DomainOption = { code: string; nameZh: string };

/** 业务大类（含联动业务域/主题域） */
export type BusinessCategory = {
  code: string;
  nameZh: string;
  domains: DomainOption[];
  subjectDomains: DomainOption[];
};

/** 业务大类字典（从数据中台开发规范文档提取） */
export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    code: 'vlsp', nameZh: '整车物流服务平台',
    domains: [
      { code: 'bt', nameZh: '商机转化' }, { code: 'em', nameZh: '实体管理' },
      { code: 'trade', nameZh: '交易签约' }, { code: 'transport', nameZh: '运输履约' },
      { code: 'settle', nameZh: '结算开票' }, { code: 'compliance', nameZh: '合规监管' },
      { code: 'operate', nameZh: '运营营销' }, { code: 'mb', nameZh: '跨业务域' },
      { code: 'tracking', nameZh: '埋点' }, { code: 'match', nameZh: '撮合履约' },
      { code: 'stmt', nameZh: '财务对账' },
    ],
    subjectDomains: [
      { code: 'order', nameZh: '订单分析' }, { code: 'waybill', nameZh: '运单分析' },
      { code: 'saler', nameZh: '销售分析' }, { code: 'driver', nameZh: '司机分析' },
      { code: 'car', nameZh: '车辆分析' }, { code: 'goods_owner', nameZh: '货主分析' },
      { code: 'goods', nameZh: '货物分析' }, { code: 'customer_service', nameZh: '客服分析' },
      { code: 'line', nameZh: '线路分析' }, { code: 'station', nameZh: '场站分析' },
      { code: 'company', nameZh: '企业分析' }, { code: 'storage', nameZh: '仓储分析' },
      { code: 'shipper', nameZh: '托运人分析' }, { code: 'carrier', nameZh: '承运人分析' },
      { code: 'customer', nameZh: '客户分析' }, { code: 'company_customer', nameZh: '企业与客户分析' },
    ],
  },
  {
    code: 'difp', nameZh: '数智金融平台',
    domains: [
      { code: 'credit', nameZh: '信贷' }, { code: 'pay', nameZh: '支付' },
      { code: 'invoice', nameZh: '票据' }, { code: 'bf', nameZh: '业财' },
    ],
    subjectDomains: [
      { code: 'customer', nameZh: '客户' }, { code: 'product', nameZh: '产品' },
      { code: 'platform', nameZh: '平台' }, { code: 'company', nameZh: '企业' },
      { code: 'account', nameZh: '账户' }, { code: 'order', nameZh: '订单' },
    ],
  },
  {
    code: 'ctsp', nameZh: '商品交易平台',
    domains: [
      { code: 'trade', nameZh: '交易' }, { code: 'behavior', nameZh: '行为' },
      { code: 'cim', nameZh: '客户信息管理' }, { code: 'logistics', nameZh: '物流' },
      { code: 'info', nameZh: '资讯' },
    ],
    subjectDomains: [
      { code: 'user', nameZh: '用户' }, { code: 'commodity', nameZh: '商品' },
      { code: 'campaign', nameZh: '营销活动' }, { code: 'trade', nameZh: '交易' },
    ],
  },
  { code: 'aira', nameZh: '人工智能研究应用平台', domains: [], subjectDomains: [] },
  { code: 'gtsp', nameZh: '通用技术服务平台', domains: [], subjectDomains: [] },
  {
    code: 'beeh', nameZh: '生态营销平台',
    domains: [
      { code: 'cmpgn', nameZh: '广告投放' }, { code: 'behavior', nameZh: '行为' },
    ],
    subjectDomains: [
      { code: 'advertiser', nameZh: '广告主分析' }, { code: 'audience', nameZh: '用户与受众分析' },
      { code: 'media', nameZh: '媒体分析' },
    ],
  },
  { code: 'imp', nameZh: '产业图谱平台', domains: [], subjectDomains: [] },
];

/** 数据应用系统字典 */
export const DATA_SYSTEMS: DomainOption[] = [
  { code: 'bi', nameZh: 'BI报表系统' },
  { code: 'wlt_driver_client', nameZh: '万联通司机端' },
  { code: 'wlt_cargo_owner_client', nameZh: '万联通货主端' },
];

/** 各层级需要展示的配置字段（顺序即表单顺序） */
export const LAYER_FIELDS: Record<ModelingLayer, string[]> = {
  ODS: ['databaseName', 'rawTableName', 'partitionType'],
  DWD: ['businessCategory', 'businessDomain', 'entityObject', 'businessProcess', 'customPart', 'partitionType'],
  DWS: ['businessCategory', 'businessDomain', 'customPart', 'partitionType'],
  DM: ['businessCategory', 'subjectDomain', 'customPart', 'partitionType'],
  ADS: ['businessCategory', 'dataSystemName', 'functionModule', 'customPart', 'partitionType'],
  DIM: ['businessCategory', 'customPart', 'partitionType'],
};

/** 字段渲染元信息 */
export const FIELD_META: Record<string, { label: string; type: 'select' | 'input' | 'radio'; placeholder?: string }> = {
  businessCategory: { label: '业务大类', type: 'select' },
  businessDomain: { label: '业务域', type: 'select' },
  subjectDomain: { label: '主题域', type: 'select' },
  entityObject: { label: '实体对象', type: 'input', placeholder: '如：waybill' },
  businessProcess: { label: '业务过程', type: 'input', placeholder: '如：transport_business_process' },
  dataSystemName: { label: '数据系统', type: 'select' },
  functionModule: { label: '功能模块', type: 'input', placeholder: '如：car_monitor' },
  customPart: { label: '自定义部分', type: 'input', placeholder: '如：aggregate_info' },
  partitionType: { label: '分区类型', type: 'radio' },
  databaseName: { label: '数据库名', type: 'input', placeholder: '如：logistics' },
  rawTableName: { label: '原始表名', type: 'input', placeholder: '如：cm_goods_category' },
};

/** 默认命名配置 */
export function getDefaultNamingConfig(): TableNamingConfig {
  return {
    layer: 'DWD',
    businessCategory: '',
    businessDomain: '',
    subjectDomain: '',
    entityObject: '',
    businessProcess: '',
    dataSystemName: '',
    functionModule: '',
    customPart: '',
    partitionType: 'df',
    databaseName: '',
    rawTableName: '',
  };
}

/**
 * 根据命名配置按层级规则拼接英文表名。
 * 空字段自动跳过，不会产生连续下划线。
 */
export function generateTableName(config: TableNamingConfig): string {
  const parts: string[] = [config.layer.toLowerCase()];

  switch (config.layer) {
    case 'ODS':
      if (config.databaseName) parts.push(config.databaseName);
      if (config.rawTableName) parts.push(config.rawTableName);
      break;
    case 'DWD':
      if (config.businessCategory) parts.push(config.businessCategory);
      if (config.businessDomain) parts.push(config.businessDomain);
      if (config.entityObject) parts.push(config.entityObject);
      if (config.businessProcess) parts.push(config.businessProcess);
      if (config.customPart) parts.push(config.customPart);
      break;
    case 'DWS':
      if (config.businessCategory) parts.push(config.businessCategory);
      if (config.businessDomain) parts.push(config.businessDomain);
      if (config.customPart) parts.push(config.customPart);
      break;
    case 'DM':
      if (config.businessCategory) parts.push(config.businessCategory);
      if (config.subjectDomain) parts.push(config.subjectDomain);
      if (config.customPart) parts.push(config.customPart);
      break;
    case 'ADS':
      if (config.businessCategory) parts.push(config.businessCategory);
      if (config.dataSystemName) parts.push(config.dataSystemName);
      if (config.functionModule) parts.push(config.functionModule);
      if (config.customPart) parts.push(config.customPart);
      break;
    case 'DIM':
      if (config.businessCategory) parts.push(config.businessCategory);
      if (config.customPart) parts.push(config.customPart);
      break;
  }

  if (config.partitionType !== 'none') parts.push(config.partitionType);

  return parts.join('_');
}

/**
 * 校验自由输入字段：仅允许小写字母、数字和下划线，以字母开头，
 * 不能有连续下划线或末尾下划线。
 * @returns 错误提示文案，null 表示通过
 */
export function validateSnakeCase(value: string): string | null {
  if (!value) return null;
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    return '仅允许小写字母、数字和下划线，且以字母开头';
  }
  if (value.includes('__')) return '不能包含连续下划线';
  if (value.endsWith('_')) return '不能以下划线结尾';
  return null;
}
