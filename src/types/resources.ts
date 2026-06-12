export type ResourceType = 'table' | 'metric' | 'report' | 'api' | 'label' | 'view';

export type SourceSystem = 'MaxCompute' | 'Hive' | 'SelectDB' | 'MySQL' | 'Oracle' | '万联灵析' | 'API网关' | 'Kafka' | 'OSS' | '指标平台' | '画像标签系统' | '内部微服务';

export const sourceSystemLabels: Record<SourceSystem, string> = {
  MaxCompute: 'MaxCompute',
  Hive: 'Hive',
  SelectDB: 'SelectDB',
  MySQL: 'MySQL',
  Oracle: 'Oracle',
  万联灵析: '万联灵析',
  API网关: 'API网关',
  Kafka: 'Kafka',
  OSS: 'OSS',
  指标平台: '指标平台',
  画像标签系统: '画像标签系统',
  内部微服务: '内部微服务',
};

export type SourceType = 'warehouse_engine' | 'analytic_db' | 'business_db' | 'report_system' | 'api_service' | 'message_stream' | 'file_storage' | 'metric_platform';

export type ResourceSummary = {
  id: string;
  type: ResourceType;
  name: string;
  displayName?: string;
  description?: string;
  sourceSystem?: SourceSystem;
  sourceType?: SourceType;
  sourceInstance?: string;
  sourcePath?: string;
  owner?: string;
  businessOwner?: string;
  status?: 'published' | 'draft' | 'deprecated';
  permissionStatus?: 'granted' | 'none' | 'pending' | 'unknown';
  tags?: string[];
  domain?: string;
  catalogPath?: string;
  createdAt?: string;
  updatedAt?: string;
  usageCount?: number;
  viewCount?: number;
  qualityScore?: number;
  /** Detail page fields */
  databaseName?: string;
  isPartitioned?: boolean;
  storageFormat?: string;
  lifecycle?: string;
  isCore?: boolean;
  dataLevel?: string;
  infoCompleteness?: number;
};

/* ── Detail page: field-level data ────────────────────── */

export type SecurityLevel = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export type FieldInfo = {
  name: string;
  type: string;
  comment: string;
  description?: string;
  securityLevel: SecurityLevel;
};

/* ── Detail page: partition data ──────────────────────── */

export type PartitionInfo = {
  keys: string[];
  value: string;
  rowCount: number;
  storageSize: string;
  createdAt: string;
  updatedAt: string;
};

/* ── Detail page: DDL change ──────────────────────────── */

export type DDLChangeType = 'add_field' | 'remove_field' | 'modify_type' | 'modify_comment' | 'modify_property' | 'other';

export type DDLChange = {
  time: string;
  type: DDLChangeType;
  description: string;
  operator: string;
  sql: string;
};

/* ── Detail page: operation log ────────────────────────── */

export type OperationLog = {
  time: string;
  category: string;
  action: string;
  operator: string;
  detail: string;
};

/* ── Detail page: metric definition ───────────────────── */

export type MetricDefinition = {
  statisticsObject: string;
  statisticsGranularity: string;
  statisticsPeriod: string;
  updateFrequency: string;
  dataDelay: string;
  formula: string;
  caliberDescription: string;
  dimensions: string[];
  scenarios: string[];
  notes: string[];
};

/* ── Detail page: label definition ────────────────────── */

export type LabelDefinition = {
  code: string;
  labelType: string;
  valueType: string;
  targetObject: string;
  updateMethod: string;
  updateFrequency: string;
  valueRanges: Array<{ value: string; meaning: string }>;
  coverageRate: number;
  scenarios: string[];
  notes: string[];
  sampleData: Array<{ userId: string; labelValue: string }>;
};

/* ── Detail page: API definition ──────────────────────── */

export type APIParam = {
  name: string;
  type: string;
  position: 'Path' | 'Query' | 'Body' | 'Header';
  required: boolean;
  description: string;
  example?: string;
};

export type APIResponseField = {
  name: string;
  type: string;
  description: string;
  example?: string;
};

export type APIDefinition = {
  httpMethod: string;
  summary: string;
  serviceName: string;
  requestPath: string;
  authMethod: string;
  requestParams: APIParam[];
  responseFields: APIResponseField[];
  notes: string[];
};

/* ── Detail page: report definition ───────────────────── */

export type ReportDefinition = {
  description: string;
  sourceSystem: string;
  reportCatalog: string;
  accessLink: string;
  coreMetrics: string[];
  analysisDimensions: string[];
};

/* ── Detail page: sample data ─────────────────────────── */

export type SampleDataRow = Record<string, string>;

/* ── Detail page: full detail ─────────────────────────── */

export type ResourceDetail = ResourceSummary & {
  fields?: FieldInfo[];
  partitions?: PartitionInfo[];
  sampleData?: SampleDataRow[];
  ddlChanges?: DDLChange[];
  operationLogs?: OperationLog[];
  metricDefinition?: MetricDefinition;
  labelDefinition?: LabelDefinition;
  apiDefinition?: APIDefinition;
  reportDefinition?: ReportDefinition;
  usageNotes?: string;
  maintenanceNote?: string;

  /* V2.1.1: 审批状态 */
  resourceStatus?: 'draft' | 'maintain' | 'published' | 'no-list' | 'reviewing' | 'unlisting' | 'catalog_reviewing' | 'handover_reviewing';
  pendingCatalog?: string;
  handoverReceiver?: string;
  handoverType?: 'tech' | 'biz' | 'both';
};
