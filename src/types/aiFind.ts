/** AI 找数（v3 还原）类型定义。对应 PRD：docs/product/2026-07-13-AI找数-模块PRD.md */

/* ── 资产 ─────────────────────────────────────────────── */

export type SchemaField = {
  col: string;
  type: string;
  comment: string;
};

export type TableAsset = {
  name: string;
  cnName: string;
  source: string;
  layer: string;
  domain: string;
  owner: string;
  heat: string;
  perm: 'ok' | 'apply' | 'pending';
  freq: string;
  tip: string;
  schema: SchemaField[];
};

export type AssetCardType = 'report' | 'dashboard' | 'table';

export type AssetCard = {
  type: AssetCardType;
  typeLabel: string;
  name: string;
  enName?: string;
  tableKey?: string;
  source: string;
  owner?: string;
  heat?: string;
  perm: 'ok' | 'apply' | 'pending';
  layer?: string;
  domain?: string;
  freq?: string;
  caliber?: string;
  desc: string;
  reason: string;
};

export type FindResult = {
  ctxLabel: string;
  isMapping?: boolean;
  intent: string;
  results: AssetCard[];
  guides: string[];
};

/* ── 查数（Chat BI）─────────────────────────────────────── */

export type ChatbiContent =
  | 'metric'
  | 'dimension'
  | 'trend'
  | 'comparison'
  | 'rank'
  | 'share'
  | 'insight';

export type SummaryMetric = { label: string; value: string; change: string; dir: 'up' | 'down' | 'neutral' };

export type ChatbiSource = { table: string; field: string; time: string; via: string };

export type ChatbiResult = {
  key: string;
  summaryLabel: string;
  summaryMetrics: SummaryMetric[];
  rightTitle: string;
  rightContent: ChatbiContent;
  metrics?: Array<{ label: string; value: string; change: string; dir: string; period: string; primary?: boolean }>;
  dimRows?: Array<{ rank: number; city: string; gmv: string; pct: string; wow: string; dir: string }>;
  compareRows?: Array<{ day: string; cur: string; prev: string; diff: string; dir: string }>;
  shareRows?: Array<{ name: string; value: string; pct: number; wow: string; dir: string }>;
  insight?: {
    conclusion: string;
    drivers: Array<{ name: string; diff: string; pct: number }>;
    anomalies: Array<{ level: 'info' | 'warn'; text: string }>;
    nextSteps: string[];
  };
  source: ChatbiSource;
  caliber: string;
};

/* ── 意图管道 ───────────────────────────────────────────── */

export type AnalysisType =
  | 'value'
  | 'dimension'
  | 'trend'
  | 'comparison'
  | 'rank'
  | 'share'
  | 'insight'
  | 'detail'
  | 'definition'
  | 'forecast';

export type Slots = {
  metric: string | null;
  metricText: string | null;
  ambTerm: string | null;
  analysis: AnalysisType | null;
  dimension: string | null;
  time: 'day' | 'range' | null;
  assetWord: boolean;
};

export type MetricDef = {
  alias: string[];
  find: string;
  detailTable?: string;
  caliber: string;
  chatbi: Partial<Record<'value' | 'dimension' | 'trend' | 'comparison' | 'rank' | 'share' | 'insight', string>> | null;
};

export type QueryCtx = { metric: string | null } | null;

export type RouteAction =
  | { kind: 'chatbi'; chatbiKey: string; fromCtx: boolean }
  | { kind: 'find'; findKey: string; note?: string }
  | { kind: 'confirmMetric'; term: string; candidates: string[] }
  | { kind: 'definition'; metric: string; fromCtx: boolean }
  | { kind: 'forecast' }
  | { kind: 'detailTable'; tableKey: string }
  | { kind: 'mappingNotFound' }
  | { kind: 'ask'; askKey: string }
  | { kind: 'notFound' };

/* ── 对话流 ────────────────────────────────────────────── */

export type ChatEntry =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'ai'; kind: 'welcome' }
  | { id: number; role: 'ai'; kind: 'cards'; findKey: string; note?: string }
  | { id: number; role: 'ai'; kind: 'chatbiSummary'; result: ChatbiResult; fromCtx: boolean }
  | { id: number; role: 'ai'; kind: 'ask'; askKey: string }
  | { id: number; role: 'ai'; kind: 'confirmMetric'; term: string; candidates: string[]; rawText: string }
  | { id: number; role: 'ai'; kind: 'definition'; metric: string; fromCtx: boolean }
  | { id: number; role: 'ai'; kind: 'forecast' }
  | { id: number; role: 'ai'; kind: 'detailTable'; tableKey: string }
  | { id: number; role: 'ai'; kind: 'mappingNotFound'; text: string }
  | { id: number; role: 'ai'; kind: 'notFound'; text: string };

/* ── 右侧工作区 ─────────────────────────────────────────── */

export type RightPanel =
  | { view: 'empty' }
  | { view: 'chatbi'; data: ChatbiResult }
  | { view: 'preview'; asset: AssetCard }
  | { view: 'table'; table: TableAsset };
