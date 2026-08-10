/** 标准驱动建表向导 — 领域类型 */

/** 建模分层 */
export type ModelingLayer = 'ODS' | 'DWD' | 'DWS' | 'DM' | 'ADS' | 'DIM';

/** 分区类型 */
export type PartitionType = 'di' | 'df' | 'none';

/** 表名命名配置：根据建模分层的命名规范组装英文表名 */
export type TableNamingConfig = {
  layer: ModelingLayer;
  businessCategory: string;
  businessDomain: string;
  subjectDomain: string;
  entityObject: string;
  businessProcess: string;
  dataSystemName: string;
  functionModule: string;
  customPart: string;
  partitionType: PartitionType;
  databaseName: string;
  rawTableName: string;
};


/** 词根：企业级命名规范库中的最小命名单元 */
export type WordRoot = {
  name: string;         // 词根名称，如 "金额"
  fullName: string;     // 全称，如 "amount"
  abbreviation: string; // 缩写，如 "amt"
  description: string;  // 含义描述
};

/** 词根匹配结果：对中文名分词后命中的词根序列及推荐英文名 */
export type RootMatch = {
  roots: WordRoot[];     // 按出现位置排序的命中词根
  suggestedName: string; // 由缩写拼接而成的推荐英文名，如 "sale_amt"
};

export type FieldRecommendStatus =
  | 'adopted'
  | 'reselected'
  | 'ignored'
  | 'missing'
  | 'draft_started';

export type PublishedStandard = {
  code: string;
  nameZh: string;
  nameEn: string;
  setName: string;
  dataType: string;
  length?: number;
  precision?: number;
  nullable: boolean;
  primaryKey?: boolean;
  codeTable?: string;
  classificationPath: string;
  grade: string;
  keywords: string[];
};

export type TableRecommendResult = {
  nameZh: string;
  nameEn: string;
  rationale: string;
};

export type FieldRecommendResult = {
  id: string;
  nameZh: string;
  nameEn: string;
  comment: string;
  status: FieldRecommendStatus;
  standard?: PublishedStandard;
  confidence: 'high' | 'medium' | 'low';
  dataType: string;
  length?: number;
  precision?: number;
  nullable: boolean;
  primaryKey?: boolean;
  codeTable?: string;
  classificationPath: string;
  grade: string;
  rationale: string;
  suggestedNameEn?: string;
  rootMatch?: RootMatch;
};

export type FieldInput = {
  id: string;
  nameZh: string;
  nameEn: string;
  comment: string;
};

export type TableInput = {
  nameZh: string;
  nameEn: string;
  description: string;
  namingConfig?: TableNamingConfig;
};
