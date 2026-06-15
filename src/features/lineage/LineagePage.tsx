import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Tag } from '../../components/base/Tag';
import { Button } from '../../components/base/Button';
import {
  approveLineageApproval,
  getActiveLineageApproval,
  lineageApprovalSummary,
  lineageApprovalSummaryText,
  rejectLineageApproval,
  submitLineageApproval,
  useLineageApprovals,
  withdrawLineageApproval,
} from './lineageApprovalStore';
import type { LineageChangeSetItem, LineageFieldMappingChange, LineageRelationChange } from './lineageApprovalStore';
import './lineage.css';

/* ─── Types ───────────────────────────────────── */

type LineageNodeType = 'table' | 'view' | 'api' | 'report' | 'metric' | 'label';

type LineageField = {
  name: string;
  type: string;
  comment: string;
};

type LineageNodeData = {
  id: string;
  name: string;
  display: string;
  type: LineageNodeType;
  platform: string;
  db: string;
  tech_owner: string;
  biz_owner: string;
  catalog: string;
  updated: string;
  storage: string;
  partitioned: boolean;
  fields: LineageField[];
  upstream: string[];
  downstream: string[];
};

type LineageEdge = {
  from: string;
  to: string;
  type: 'table';
};

type FieldEdge = {
  from: string;
  fromField: string;
  to: string;
  toField: string;
};

type LineageScope = 'all' | 'upstream' | 'downstream';

type ActiveField = {
  nodeId: string;
  fieldName: string;
};

type LineageChangeType = 'add' | 'delete';

type LineageChange = {
  id: string;
  type: LineageChangeType;
  sourceId: string;
  targetId: string;
  description: string;
};

type Transform = {
  x: number;
  y: number;
  scale: number;
};

/* ─── Constants ───────────────────────────────── */

const NODE_W = 220;
const NODE_FIELD_H = 22;
const COL_GAP = 320;
const ROW_GAP = 28;
const FIELDS_PER_PAGE = 5;
const NODE_HEAD_H = 62;
const FIELD_AREA_TOP = 87;
const FIELDS_PAGE_H = 28;

/* ─── Mock Data ───────────────────────────────── */

const NODES_DB: Record<string, LineageNodeData> = {
  dwd_order_detail: {
    id: 'dwd_order_detail', name: 'dwd_order_detail', display: '订单明细宽表',
    type: 'table', platform: 'Hive', db: 'dwd_db',
    tech_owner: '李四', biz_owner: '王五', catalog: '交易域/订单/订单明细',
    updated: '2026-03-20', storage: '12.4 MB', partitioned: true,
    fields: [
      { name: 'order_id', type: 'STRING', comment: '订单唯一标识' },
      { name: 'user_id', type: 'STRING', comment: '用户唯一标识' },
      { name: 'sku_id', type: 'STRING', comment: '商品SKU标识' },
      { name: 'order_amount', type: 'DECIMAL(18,2)', comment: '订单金额' },
      { name: 'order_status', type: 'STRING', comment: '订单状态' },
      { name: 'create_time', type: 'TIMESTAMP', comment: '创建时间' },
      { name: 'dt', type: 'STRING', comment: '分区日期' },
    ],
    upstream: ['ods_order_raw', 'ods_user_info', 'dim_sku_info', 'dim_product_info'],
    downstream: ['ads_order_summary', 'rpt_sales_daily', 'metric_gmv_daily'],
  },
  ods_order_raw: {
    id: 'ods_order_raw', name: 'ods_order_raw', display: '订单原始数据',
    type: 'table', platform: 'Hive', db: 'ods_db',
    tech_owner: '张三', biz_owner: '赵六', catalog: '交易域/订单/原始数据',
    updated: '2026-03-21', storage: '45.2 MB', partitioned: true,
    fields: [
      { name: 'order_id', type: 'STRING', comment: '订单标识' },
      { name: 'raw_data', type: 'STRING', comment: '原始 JSON 数据' },
      { name: 'create_time', type: 'TIMESTAMP', comment: '创建时间' },
      { name: 'source_system', type: 'STRING', comment: '来源系统' },
      { name: 'dt', type: 'STRING', comment: '分区日期' },
    ],
    upstream: ['kafka_order_topic'],
    downstream: ['dwd_order_detail'],
  },
  ods_user_info: {
    id: 'ods_user_info', name: 'ods_user_info', display: '用户信息原始表',
    type: 'table', platform: 'MySQL', db: 'user_db',
    tech_owner: '李四', biz_owner: '王五', catalog: '用户域/基础信息',
    updated: '2026-03-20', storage: '8.1 MB', partitioned: false,
    fields: [
      { name: 'user_id', type: 'STRING', comment: '用户标识' },
      { name: 'user_name', type: 'STRING', comment: '用户名称' },
      { name: 'phone', type: 'STRING', comment: '手机号' },
      { name: 'register_time', type: 'TIMESTAMP', comment: '注册时间' },
    ],
    upstream: [],
    downstream: ['dwd_order_detail', 'ads_user_profile'],
  },
  dim_sku_info: {
    id: 'dim_sku_info', name: 'dim_sku_info', display: 'SKU维度表',
    type: 'table', platform: 'Hive', db: 'dim_db',
    tech_owner: '张三', biz_owner: '赵六', catalog: '供应链/商品/SKU信息',
    updated: '2026-03-19', storage: '2.3 MB', partitioned: false,
    fields: [
      { name: 'sku_id', type: 'STRING', comment: 'SKU标识' },
      { name: 'sku_name', type: 'STRING', comment: 'SKU名称' },
      { name: 'category', type: 'STRING', comment: '商品类目' },
      { name: 'price', type: 'DECIMAL(10,2)', comment: '定价' },
    ],
    upstream: [],
    downstream: ['dwd_order_detail'],
  },
  dim_product_info: {
    id: 'dim_product_info', name: 'dim_product_info', display: '商品维度表',
    type: 'table', platform: 'Hive', db: 'dim_db',
    tech_owner: '李四', biz_owner: '王五', catalog: '供应链/商品/商品信息',
    updated: '2026-03-18', storage: '1.8 MB', partitioned: false,
    fields: [
      { name: 'product_id', type: 'STRING', comment: '商品标识' },
      { name: 'product_name', type: 'STRING', comment: '商品名称' },
      { name: 'brand', type: 'STRING', comment: '品牌' },
    ],
    upstream: [],
    downstream: ['dwd_order_detail'],
  },
  ads_order_summary: {
    id: 'ads_order_summary', name: 'ads_order_summary', display: '订单汇总表',
    type: 'table', platform: 'Hive', db: 'ads_db',
    tech_owner: '李四', biz_owner: '王五', catalog: '交易域/订单/订单汇总',
    updated: '2026-03-21', storage: '3.2 MB', partitioned: true,
    fields: [
      { name: 'order_id', type: 'STRING', comment: '订单标识' },
      { name: 'summary_amt', type: 'DECIMAL(18,2)', comment: '汇总金额' },
      { name: 'order_cnt', type: 'BIGINT', comment: '订单数量' },
      { name: 'dt', type: 'STRING', comment: '分区日期' },
    ],
    upstream: ['dwd_order_detail'],
    downstream: ['rpt_sales_daily'],
  },
  dws_order_subject_view: {
    id: 'dws_order_subject_view', name: 'dws_order_subject_view', display: '订单主题视图',
    type: 'view', platform: 'Hive', db: 'dws_db',
    tech_owner: '李四', biz_owner: '王五', catalog: '交易域/订单/主题视图',
    updated: '2026-03-22', storage: '-', partitioned: true,
    fields: [
      { name: 'order_id', type: 'STRING', comment: '订单唯一标识' },
      { name: 'user_id', type: 'STRING', comment: '用户唯一标识' },
      { name: 'order_amount', type: 'DECIMAL(18,2)', comment: '订单金额' },
      { name: 'dt', type: 'STRING', comment: '分区日期' },
    ],
    upstream: [],
    downstream: [],
  },
  rpt_sales_daily: {
    id: 'rpt_sales_daily', name: 'rpt_sales_daily', display: '销售日报',
    type: 'report', platform: 'BI', db: 'Tableau',
    tech_owner: '张三', biz_owner: '赵六', catalog: '交易域/报表/销售报表',
    updated: '2026-03-21', storage: '-', partitioned: false,
    fields: [
      { name: 'dt', type: 'DATE', comment: '日期' },
      { name: 'total_gmv', type: 'DECIMAL', comment: '总成交金额' },
      { name: 'order_cnt', type: 'BIGINT', comment: '订单数' },
    ],
    upstream: ['dwd_order_detail', 'ads_order_summary'],
    downstream: [],
  },
  metric_gmv_daily: {
    id: 'metric_gmv_daily', name: 'metric_gmv_daily', display: 'GMV日指标',
    type: 'metric', platform: '指标平台', db: '-',
    tech_owner: '李四', biz_owner: '王五', catalog: '交易域/指标/核心指标',
    updated: '2026-03-21', storage: '-', partitioned: false,
    fields: [
      { name: 'dt', type: 'DATE', comment: '日期' },
      { name: 'gmv_value', type: 'DECIMAL', comment: 'GMV金额' },
    ],
    upstream: ['dwd_order_detail'],
    downstream: [],
  },
  label_user_value_tier: {
    id: 'label_user_value_tier', name: 'label_user_value_tier', display: '用户价值等级标签',
    type: 'label', platform: '标签画像平台', db: '-',
    tech_owner: '王五', biz_owner: '赵六', catalog: '用户域/标签/用户价值',
    updated: '2026-03-22', storage: '-', partitioned: false,
    fields: [
      { name: 'user_id', type: 'STRING', comment: '用户唯一标识' },
      { name: 'value_tier', type: 'STRING', comment: '价值等级结果' },
      { name: 'updated_at', type: 'DATETIME', comment: '标签更新时间' },
    ],
    upstream: ['ads_user_profile'],
    downstream: [],
  },
  kafka_order_topic: {
    id: 'kafka_order_topic', name: 'kafka_order_topic', display: '订单消息队列',
    type: 'api', platform: 'Kafka', db: '消息集群B',
    tech_owner: '张三', biz_owner: '赵六', catalog: '交易域/消息/订单消息',
    updated: '2026-03-21', storage: '-', partitioned: false,
    fields: [
      { name: 'order_id', type: 'STRING', comment: '订单ID' },
      { name: 'event_type', type: 'STRING', comment: '事件类型' },
      { name: 'payload', type: 'JSON', comment: '消息体' },
    ],
    upstream: [],
    downstream: ['ods_order_raw'],
  },
  ads_user_profile: {
    id: 'ads_user_profile', name: 'ads_user_profile', display: '用户画像宽表',
    type: 'table', platform: 'Hive', db: 'ads_db',
    tech_owner: '李四', biz_owner: '王五', catalog: '用户域/用户/用户画像',
    updated: '2026-03-22', storage: '5.8 MB', partitioned: true,
    fields: [
      { name: 'user_id', type: 'STRING', comment: '用户标识' },
      { name: 'profile_type', type: 'STRING', comment: '画像类型' },
      { name: 'value', type: 'STRING', comment: '画像值' },
    ],
    upstream: ['ods_user_info'],
    downstream: ['label_user_value_tier'],
  },
};

const FIELD_EDGES: FieldEdge[] = [
  { from: 'ods_order_raw', fromField: 'order_id', to: 'dwd_order_detail', toField: 'order_id' },
  { from: 'ods_order_raw', fromField: 'create_time', to: 'dwd_order_detail', toField: 'create_time' },
  { from: 'ods_user_info', fromField: 'user_id', to: 'dwd_order_detail', toField: 'user_id' },
  { from: 'dim_sku_info', fromField: 'sku_id', to: 'dwd_order_detail', toField: 'sku_id' },
  { from: 'dwd_order_detail', fromField: 'order_id', to: 'ads_order_summary', toField: 'order_id' },
  { from: 'dwd_order_detail', fromField: 'order_amount', to: 'ads_order_summary', toField: 'summary_amt' },
  { from: 'dwd_order_detail', fromField: 'dt', to: 'ads_order_summary', toField: 'dt' },
  { from: 'dwd_order_detail', fromField: 'order_amount', to: 'metric_gmv_daily', toField: 'gmv_value' },
  { from: 'dwd_order_detail', fromField: 'dt', to: 'metric_gmv_daily', toField: 'dt' },
  { from: 'ads_order_summary', fromField: 'summary_amt', to: 'rpt_sales_daily', toField: 'total_gmv' },
  { from: 'ads_order_summary', fromField: 'dt', to: 'rpt_sales_daily', toField: 'dt' },
  { from: 'ads_user_profile', fromField: 'user_id', to: 'label_user_value_tier', toField: 'user_id' },
];

/* ─── Helpers ─────────────────────────────────── */

function typeShortLabel(type: LineageNodeType): string {
  return { table: '表', view: '视', api: 'API', report: '报', metric: '指', label: '标' }[type] ?? '表';
}

function typeFullLabel(type: LineageNodeType): string {
  return { table: '表', view: '视图', api: 'API', report: '报表', metric: '指标', label: '标签' }[type] ?? '表';
}

function isTableLikeType(type: LineageNodeType) {
  return type === 'table' || type === 'view' || type === 'api';
}

function isEntityType(type: LineageNodeType) {
  return type === 'metric' || type === 'label';
}

function mappingUnitLabel(type: LineageNodeType) {
  return type === 'api' ? '参数' : '字段';
}

function typeIconClass(type: LineageNodeType): string {
  return { table: '', view: 'icon-view', api: 'icon-api', report: 'icon-report', metric: 'icon-metric', label: 'icon-label' }[type] ?? '';
}

function nodeHasFieldSection(node: LineageNodeData | undefined): boolean {
  if (!node) return false;
  return (node.type !== 'metric' && node.type !== 'label') || node.fields.length > 0;
}

function getVisibleFieldCount(node: LineageNodeData, fieldPage: number): number {
  if (!nodeHasFieldSection(node)) return 0;
  const start = fieldPage * FIELDS_PER_PAGE;
  return Math.max(0, Math.min(FIELDS_PER_PAGE, node.fields.length - start));
}

function getNodeRenderHeight(node: LineageNodeData, isExpanded: boolean, fieldPage: number): number {
  if (!node) return 0;
  if (!nodeHasFieldSection(node)) return NODE_HEAD_H;
  let height = FIELD_AREA_TOP;
  if (isExpanded) {
    height += getVisibleFieldCount(node, fieldPage) * NODE_FIELD_H;
    if (node.fields.length > FIELDS_PER_PAGE) height += FIELDS_PAGE_H;
  }
  return height;
}

function isUpstreamOf(nodeId: string, targetId: string, visited = new Set<string>(), db: Record<string, LineageNodeData> = NODES_DB): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);
  const node = db[nodeId];
  if (!node) return false;
  if (node.downstream.includes(targetId)) return true;
  return node.downstream.some((d) => isUpstreamOf(d, targetId, visited, db));
}

function getDrawerTabs(node: LineageNodeData): Array<{ key: string; label: string }> {
  const tabs: Array<{ key: string; label: string }> = [{ key: 'info', label: '基本信息' }];
  if (node.type === 'table' || node.type === 'view') {
    tabs.push({ key: 'fields', label: '字段信息' });
  }
  if (node.type === 'api') {
    tabs.push({ key: 'params', label: '参数信息' });
  }
  tabs.push({ key: 'lineage', label: '血缘关系' });
  return tabs;
}

/* ─── Build visible node set ──────────────────── */

function buildVisibleNodes(
  centerNodeId: string,
  scope: LineageScope,
  depth: number,
  expandedNodes: Set<string>,
  db: Record<string, LineageNodeData> = NODES_DB,
): { nodes: LineageNodeData[]; edges: LineageEdge[] } {
  const center = db[centerNodeId];
  if (!center) return { nodes: [], edges: [] };

  const visibleIds = new Set<string>([centerNodeId]);
  const edges: LineageEdge[] = [];

  function expand(nodeId: string, dir: 'up' | 'down', d: number) {
    if (d <= 0) return;
    const node = db[nodeId];
    if (!node) return;
    const neighbors = dir === 'up' ? node.upstream : node.downstream;
    neighbors.forEach((nid) => {
      if (!db[nid]) return;
      visibleIds.add(nid);
      if (dir === 'up') edges.push({ from: nid, to: nodeId, type: 'table' });
      else edges.push({ from: nodeId, to: nid, type: 'table' });
      if (nodeId !== centerNodeId) {
        if (expandedNodes.has(nodeId)) expand(nid, dir, d - 1);
      } else {
        expand(nid, dir, d - 1);
      }
    });
  }

  if (scope !== 'downstream') expand(centerNodeId, 'up', depth);
  if (scope !== 'upstream') expand(centerNodeId, 'down', depth);

  // Expand manually expanded non-center nodes
  expandedNodes.forEach((nid) => {
    if (nid === centerNodeId) return;
    const node = db[nid];
    if (!node) return;
    const up = isUpstreamOf(nid, centerNodeId, new Set(), db);
    if (up && scope !== 'downstream') {
      node.upstream.forEach((uid) => {
        if (!db[uid]) return;
        visibleIds.add(uid);
        edges.push({ from: uid, to: nid, type: 'table' });
      });
    } else if (!up && scope !== 'upstream') {
      node.downstream.forEach((did) => {
        if (!db[did]) return;
        visibleIds.add(did);
        edges.push({ from: nid, to: did, type: 'table' });
      });
    }
  });

  // Deduplicate edges
  const edgeSet = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.from}>${e.to}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  return {
    nodes: [...visibleIds].map((id) => db[id]).filter(Boolean),
    edges: uniqueEdges,
  };
}

/* ─── Layout ──────────────────────────────────── */

type NodePosition = { x: number; y: number };

function layoutNodes(
  nodes: LineageNodeData[],
  centerNodeId: string,
  expandedNodes: Set<string>,
  fieldPageMap: Record<string, number>,
  canvasW: number,
  canvasH: number,
  db: Record<string, LineageNodeData> = NODES_DB,
  fixedCol?: number,
): { positions: Record<string, NodePosition>; colMap: Record<string, number> } {
  const colMap: Record<string, number> = {};
  colMap[centerNodeId] = fixedCol !== undefined ? fixedCol : 0;

  const nodeSet = new Set(nodes.map((n) => n.id));

  function assignCol(nodeId: string, col: number, dir: 'up' | 'down' | 'all', visited = new Set<string>()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    colMap[nodeId] = col;
    const node = db[nodeId];
    if (!node) return;
    if (dir === 'up' || dir === 'all') {
      node.upstream.forEach((uid) => {
        if (nodeSet.has(uid) && colMap[uid] === undefined) {
          assignCol(uid, col - 1, 'up', visited);
        }
      });
    }
    if (dir === 'down' || dir === 'all') {
      node.downstream.forEach((did) => {
        if (nodeSet.has(did) && colMap[did] === undefined) {
          assignCol(did, col + 1, 'down', visited);
        }
      });
    }
  }
  assignCol(centerNodeId, 0, 'all');

  // Group by column
  const cols: Record<number, string[]> = {};
  nodes.forEach((n) => {
    const c = colMap[n.id] !== undefined ? colMap[n.id] : 0;
    if (!cols[c]) cols[c] = [];
    cols[c].push(n.id);
  });

  // Assign positions
  const positions: Record<string, NodePosition> = {};
  const colNums = Object.keys(cols).map(Number).sort((a, b) => a - b);

  const centerColX = canvasW / 2 - NODE_W / 2;
  const colXMap: Record<number, number> = {};
  colNums.forEach((c) => {
    colXMap[c] = centerColX + c * (NODE_W + COL_GAP);
  });

  colNums.forEach((c) => {
    const colNodeIds = cols[c];
    const totalH =
      colNodeIds.reduce((sum, nid) => {
        const node = db[nid];
        return sum + getNodeRenderHeight(node!, expandedNodes.has(nid), fieldPageMap[nid] ?? 0);
      }, 0) +
      Math.max(0, colNodeIds.length - 1) * ROW_GAP;
    const startY = canvasH / 2 - totalH / 2;
    let currentY = startY;
    colNodeIds.forEach((nid) => {
      const node = db[nid]!;
      const nodeHeight = getNodeRenderHeight(node, expandedNodes.has(nid), fieldPageMap[nid] ?? 0);
      positions[nid] = { x: colXMap[c], y: currentY };
      currentY += nodeHeight + ROW_GAP;
    });
  });

  return { positions, colMap };
}

/* ─── SVG Icons ────────────────────────────────── */

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12 7A5 5 0 1 1 7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 2h2.5a.5.5 0 0 1 .5.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2l2.5 2.5-8 8H1.5v-2.5l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M11.5 3.5l-.8 7.5a1 1 0 0 1-1 .9H4.3a1 1 0 0 1-1-.9L2.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── LineageNodeCard Component ───────────────── */

function LineageNodeCard({
  node,
  pos,
  isCenter,
  isSelected,
  isFieldActive,
  isExpanded,
  fieldPage,
  linkedFields,
  activeField,
  scope,
  colNum,
  correctMode,
  connectionSource,
  onSelectNode,
  onToggleExpand,
  onToggleFields,
  onFieldPage,
  onActivateField,
  onCorrectModeClick,
  onCorrectModeContextMenu,
  db,
}: {
  node: LineageNodeData;
  pos: NodePosition;
  isCenter: boolean;
  isSelected: boolean;
  isFieldActive: boolean;
  isExpanded: boolean;
  fieldPage: number;
  linkedFields: Set<string>;
  activeField: ActiveField | null;
  scope: LineageScope;
  colNum: number;
  correctMode: boolean;
  connectionSource: string | null;
  onSelectNode: (id: string) => void;
  onToggleExpand: (id: string, dir: 'up' | 'down') => void;
  onToggleFields: (id: string) => void;
  onFieldPage: (id: string, delta: number) => void;
  onActivateField: (nodeId: string, fieldName: string) => void;
  onCorrectModeClick?: (id: string) => void;
  onCorrectModeContextMenu?: (e: React.MouseEvent, id: string) => void;
  db: Record<string, LineageNodeData>;
}) {
  const totalFields = node.fields.length;
  const totalPages = Math.ceil(totalFields / FIELDS_PER_PAGE);
  const visibleFields = node.fields.slice(fieldPage * FIELDS_PER_PAGE, (fieldPage + 1) * FIELDS_PER_PAGE);
  const hasFields = nodeHasFieldSection(node);

  const upCount = node.upstream.filter((uid) => db[uid]).length;
  const downCount = node.downstream.filter((did) => db[did]).length;
  const showUpBadge = isCenter ? upCount > 0 && scope !== 'downstream' : upCount > 0 && colNum <= 0 && scope !== 'downstream';
  const showDownBadge = isCenter ? downCount > 0 && scope !== 'upstream' : downCount > 0 && colNum >= 0 && scope !== 'upstream';

  const linkedLabel = activeField && linkedFields.size > 0 && node.id !== activeField.nodeId
    ? <span className="ln-linked-label">关联字段 ({linkedFields.size})</span>
    : null;

  const isSource = correctMode && connectionSource === node.id;

  return (
    <div
      className={`ln-node${isCenter ? ' center-node' : ''}${isSelected ? ' selected' : ''}${isFieldActive ? ' field-active' : ''}${isSource ? ' node-source' : ''}${correctMode ? ' correct-mode-node' : ''}`}
      style={{ left: pos.x, top: pos.y, width: NODE_W }}
      data-node-id={node.id}
      onClick={(e) => {
        e.stopPropagation();
        if (correctMode) {
          onCorrectModeClick?.(node.id);
        } else {
          onSelectNode(node.id);
        }
      }}
      onContextMenu={(e) => { onCorrectModeContextMenu?.(e, node.id); }}
    >
      {/* Expand badges */}
      {showUpBadge && (
        <div
          className="ln-expand-badge left"
          title="展开上游"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id, 'up'); }}
        >
          {upCount}
        </div>
      )}
      {showDownBadge && (
        <div
          className="ln-expand-badge right"
          title="展开下游"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id, 'down'); }}
        >
          {downCount}
        </div>
      )}

      {/* Node header */}
      <div className="ln-node-head">
        <div className={`ln-node-icon ${typeIconClass(node.type)}`}>{typeShortLabel(node.type)}</div>
        <div className="ln-node-info">
          <div className="ln-node-name">{node.name}</div>
          <div className="ln-node-desc">{node.display}</div>
        </div>
        {isCenter && <div className="ln-center-badge">中心节点</div>}
      </div>

      {/* Fields section */}
      {hasFields && (
        <div className="ln-fields-section">
          <div
            className={`ln-fields-toggle${isExpanded ? ' open' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFields(node.id); }}
          >
            <span>字段 ({totalFields}) {linkedLabel}</span>
            <span className="toggle-arrow">▼</span>
          </div>
          {isExpanded && (
            <div className="ln-fields-list open">
              {visibleFields.map((f) => {
                const isLinked = linkedFields.has(f.name);
                return (
                  <div
                    key={f.name}
                    className={`ln-field-row${isLinked ? ' field-linked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onActivateField(node.id, f.name); }}
                  >
                    <span className="ln-field-name" title={f.name}>{f.name}</span>
                    <span className="ln-field-type">{f.type}</span>
                  </div>
                );
              })}
              {totalPages > 1 && (
                <div className="ln-fields-page">
                  <span
                    className={`ln-fields-page-btn${fieldPage <= 0 ? ' disabled' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onFieldPage(node.id, -1); }}
                  >&lt;</span>
                  <span>{fieldPage + 1} / {totalPages}</span>
                  <span
                    className={`ln-fields-page-btn${fieldPage >= totalPages - 1 ? ' disabled' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onFieldPage(node.id, 1); }}
                  >&gt;</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SVG Edges Component ─────────────────────── */

function LineageEdges({
  edges,
  positions,
  activeField,
  expandedNodes,
  fieldPageMap,
  db,
  fieldEdges,
}: {
  edges: LineageEdge[];
  positions: Record<string, NodePosition>;
  activeField: ActiveField | null;
  expandedNodes: Set<string>;
  fieldPageMap: Record<string, number>;
  db: Record<string, LineageNodeData>;
  fieldEdges: FieldEdge[];
}) {
  const activeFieldEdges = useMemo(() => {
    if (!activeField) return [];
    return fieldEdges.filter(
      (fe) =>
        (fe.from === activeField.nodeId && fe.fromField === activeField.fieldName) ||
        (fe.to === activeField.nodeId && fe.toField === activeField.fieldName),
    );
  }, [activeField, fieldEdges]);

  const hasFieldEdges = activeFieldEdges.length > 0;

  function getVisibleFieldIndex(nodeId: string, fieldName: string): number {
    const node = db[nodeId];
    if (!node) return -1;
    const page = fieldPageMap[nodeId] ?? 0;
    const start = page * FIELDS_PER_PAGE;
    const visible = node.fields.slice(start, start + FIELDS_PER_PAGE);
    return visible.findIndex((f) => f.name === fieldName);
  }

  return (
    <svg className="lineage-svg" style={{ overflow: 'visible' }}>
      <defs>
        <marker id="ln-arrow-table" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#d0d7e5" />
        </marker>
        <marker id="ln-arrow-field" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#1677ff" />
        </marker>
      </defs>

      {/* Table-level edges */}
      {edges.map((e) => {
        const fromPos = positions[e.from];
        const toPos = positions[e.to];
        if (!fromPos || !toPos) return null;
        const x1 = fromPos.x + NODE_W;
        const y1 = fromPos.y + NODE_HEAD_H / 2;
        const x2 = toPos.x;
        const y2 = toPos.y + NODE_HEAD_H / 2;
        const mx = (x1 + x2) / 2;
        const fromNode = db[e.from];
        const edgeLabel = typeFullLabel(fromNode?.type ?? 'table');

        return (
          <g key={`${e.from}>${e.to}`}>
            <path
              d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
              className={hasFieldEdges ? 'ln-line-table-dimmed' : 'ln-line-table'}
              markerEnd={hasFieldEdges ? undefined : 'url(#ln-arrow-table)'}
            />
            <text x={mx} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize="10" fill="#aab4c8">
              {edgeLabel}
            </text>
          </g>
        );
      })}

      {/* Field-level edges */}
      {activeFieldEdges.map((fe, i) => {
        const fromPos = positions[fe.from];
        const toPos = positions[fe.to];
        if (!fromPos || !toPos) return null;
        if (!expandedNodes.has(fe.from) || !expandedNodes.has(fe.to)) return null;
        const fromFieldIdx = getVisibleFieldIndex(fe.from, fe.fromField);
        const toFieldIdx = getVisibleFieldIndex(fe.to, fe.toField);
        if (fromFieldIdx < 0 || toFieldIdx < 0) return null;
        const x1 = fromPos.x + NODE_W;
        const y1 = fromPos.y + FIELD_AREA_TOP + fromFieldIdx * NODE_FIELD_H + NODE_FIELD_H / 2;
        const x2 = toPos.x;
        const y2 = toPos.y + FIELD_AREA_TOP + toFieldIdx * NODE_FIELD_H + NODE_FIELD_H / 2;
        const mx = (x1 + x2) / 2;

        return (
          <path
            key={`field-${fe.from}-${fe.fromField}-${fe.to}-${fe.toField}-${i}`}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            className="ln-line-field"
            markerEnd="url(#ln-arrow-field)"
          />
        );
      })}
    </svg>
  );
}

/* ─── Column Headers ──────────────────────────── */

function ColumnHeaders({
  nodes,
  positions,
  colMap,
}: {
  nodes: LineageNodeData[];
  positions: Record<string, NodePosition>;
  colMap: Record<string, number>;
}) {
  const colGroups: Record<number, string[]> = {};
  nodes.forEach((n) => {
    const c = colMap[n.id] !== undefined ? colMap[n.id] : 0;
    if (!colGroups[c]) colGroups[c] = [];
    colGroups[c].push(n.id);
  });

  return (
    <>
      {Object.entries(colGroups).map(([c, ids]) => {
        const cNum = Number(c);
        const pos = positions[ids[0]];
        if (!pos) return null;
        const label = cNum < 0 ? `上游 (${ids.length})` : cNum > 0 ? `下游 (${ids.length})` : '';
        if (!label) return null;
        return (
          <div
            key={c}
            className="lineage-col-header"
            style={{ left: pos.x, top: pos.y - 28 }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
}

/* ─── Drawer Component ────────────────────────── */

function LineageDrawer({
  node,
  activeField,
  activeTab,
  onSwitchTab,
  onClose,
  onActivateField,
  onJumpToNode,
  db,
}: {
  node: LineageNodeData | null;
  activeField: ActiveField | null;
  activeTab: string;
  onSwitchTab: (tab: string) => void;
  onClose: () => void;
  onActivateField: (nodeId: string, fieldName: string) => void;
  onJumpToNode: (id: string) => void;
  db: Record<string, LineageNodeData>;
}) {
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldPage, setFieldPage] = useState(0);

  if (!node) return null;

  const tabs = getDrawerTabs(node);
  const validTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0].key;

  return (
    <div className="lineage-drawer open">
      <div className="lineage-drawer-inner">
        <div className="lineage-drawer-header">
          <div className="lineage-drawer-title">{node.name}</div>
          <span className="lineage-drawer-close" onClick={onClose}>×</span>
        </div>
        <div className="lineage-drawer-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`lineage-drawer-tab${tab.key === validTab ? ' active' : ''}`}
              onClick={() => onSwitchTab(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>
        <div className="lineage-drawer-body">
          {validTab === 'info' && <DrawerInfoTab node={node} onJumpToNode={onJumpToNode} />}
          {validTab === 'fields' && (
            <DrawerFieldsTab
              node={node}
              activeField={activeField}
              fieldSearch={fieldSearch}
              fieldPage={fieldPage}
              onSearchChange={setFieldSearch}
              onPageChange={setFieldPage}
              onActivateField={onActivateField}
            />
          )}
          {validTab === 'params' && <DrawerParamsTab node={node} />}
          {validTab === 'lineage' && <DrawerLineageTab node={node} onJumpToNode={onJumpToNode} db={db} />}
        </div>
      </div>
    </div>
  );
}

function DrawerInfoTab({ node, onJumpToNode }: { node: LineageNodeData; onJumpToNode: (id: string) => void }) {
  const sections = [
    {
      title: '基本信息',
      items: [
        ['名称', node.name],
        ['中文名', node.display],
        ['类型', typeFullLabel(node.type)],
        ['平台', node.platform],
        ['所属库', node.db],
        ['目录', node.catalog],
      ],
    },
    {
      title: '管理信息',
      items: [
        ['技术负责人', node.tech_owner],
        ['业务负责人', node.biz_owner],
        ['更新时间', node.updated],
        ['存储大小', node.storage],
        ['是否分区', node.partitioned ? '是' : '否'],
      ],
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <div key={section.title} className="detail-lineage-panel-section">
          <div className="detail-lineage-panel-title">{section.title}</div>
          {section.items.map(([label, value]) => (
            <div key={label} className="drawer-info-row">
              <span className="drawer-info-label">{label}</span>
              <span className={`drawer-info-value${!value || value === '-' ? ' muted' : ''}`}>{value || '-'}</span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="default" size="sm" onClick={() => { window.location.hash = `detail?id=${node.id}`; }}>
          查看资产详情
        </Button>
        <Button variant="default" size="sm">修正血缘</Button>
      </div>
    </>
  );
}

function DrawerFieldsTab({
  node,
  activeField,
  fieldSearch,
  fieldPage,
  onSearchChange,
  onPageChange,
  onActivateField,
}: {
  node: LineageNodeData;
  activeField: ActiveField | null;
  fieldSearch: string;
  fieldPage: number;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onActivateField: (nodeId: string, fieldName: string) => void;
}) {
  const perPage = 8;
  const filtered = node.fields.filter(
    (f) => !fieldSearch || f.name.includes(fieldSearch) || f.comment.includes(fieldSearch),
  );
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const curPage = Math.max(0, Math.min(totalPages - 1, fieldPage));
  const paged = filtered.slice(curPage * perPage, (curPage + 1) * perPage);
  const activeFieldName = activeField?.nodeId === node.id ? activeField.fieldName : null;

  return (
    <>
      <input
        className="drawer-field-search"
        placeholder="请输入字段关键字"
        value={fieldSearch}
        onChange={(e) => { onSearchChange(e.target.value); onPageChange(0); }}
      />
      {paged.map((f) => (
        <div
          key={f.name}
          className={`drawer-field-row${f.name === activeFieldName ? ' active' : ''}`}
          onClick={() => onActivateField(node.id, f.name)}
        >
          <span className="drawer-field-name">{f.name}</span>
          <span className="drawer-field-comment">{f.comment}</span>
          <span className="drawer-field-type">{f.type}</span>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="drawer-page-nav">
          <span
            className={`drawer-page-btn${curPage <= 0 ? ' disabled' : ''}`}
            onClick={() => curPage > 0 && onPageChange(curPage - 1)}
          >&lt;</span>
          <span>{curPage + 1} / {totalPages}</span>
          <span
            className={`drawer-page-btn${curPage >= totalPages - 1 ? ' disabled' : ''}`}
            onClick={() => curPage < totalPages - 1 && onPageChange(curPage + 1)}
          >&gt;</span>
        </div>
      )}
    </>
  );
}

function DrawerParamsTab({ node }: { node: LineageNodeData }) {
  return (
    <div className="detail-lineage-panel-section">
      <div className="detail-lineage-panel-title">参数信息</div>
      <table className="drawer-param-table">
        <thead>
          <tr><th>参数名</th><th>说明</th><th>类型</th></tr>
        </thead>
        <tbody>
          {node.fields.map((f) => (
            <tr key={f.name}>
              <td><code>{f.name}</code></td>
              <td>{f.comment || '-'}</td>
              <td>{f.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrawerLineageTab({
  node,
  onJumpToNode,
  db,
}: {
  node: LineageNodeData;
  onJumpToNode: (id: string) => void;
  db: Record<string, LineageNodeData>;
}) {
  const upList = node.upstream.filter((id) => db[id]);
  const downList = node.downstream.filter((id) => db[id]);

  return (
    <>
      <div className="detail-lineage-panel-section">
        <div className="detail-lineage-panel-title">上游 ({upList.length})</div>
        {upList.length > 0 ? (
          upList.map((id) => {
            const related = db[id];
            return (
              <div key={id} className="drawer-lineage-item" onClick={() => onJumpToNode(id)}>
                <span className="drawer-lineage-name">{related?.name}</span>
                <span className="drawer-lineage-type">{typeFullLabel(related?.type ?? 'table')}</span>
              </div>
            );
          })
        ) : (
          <div className="drawer-lineage-empty">无上游节点</div>
        )}
      </div>
      <div className="detail-lineage-panel-section">
        <div className="detail-lineage-panel-title">下游 ({downList.length})</div>
        {downList.length > 0 ? (
          downList.map((id) => {
            const related = db[id];
            return (
              <div key={id} className="drawer-lineage-item" onClick={() => onJumpToNode(id)}>
                <span className="drawer-lineage-name">{related?.name}</span>
                <span className="drawer-lineage-type">{typeFullLabel(related?.type ?? 'table')}</span>
              </div>
            );
          })
        ) : (
          <div className="drawer-lineage-empty">无下游节点</div>
        )}
      </div>
    </>
  );
}

/* ─── Props ────────────────────────────────── */

interface LineagePageProps {
  centerNodeId?: string;  // defaults to 'dwd_order_detail' for backward compat
  isEmbedded?: boolean;   // when true, hides the "返回" button and adjusts layout for embedded use
}

/* ─── Main Component ──────────────────────────── */

export function LineagePage({ centerNodeId: propCenterNodeId, isEmbedded = false }: LineagePageProps = {}) {
  const [centerNodeId, setCenterNodeId] = useState(propCenterNodeId ?? 'dwd_order_detail');
  const [scope, setScope] = useState<LineageScope>('all');
  const [depth, setDepth] = useState(1);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [fieldPageMap, setFieldPageMap] = useState<Record<string, number>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState('info');
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [correctMode, setCorrectMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<LineageChange[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const approvals = useLineageApprovals();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'table' | 'field'>('table');
  const [draftChanges, setDraftChanges] = useState<LineageChangeSetItem[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDirection, setAddDirection] = useState<'' | 'upstream' | 'downstream'>('');
  const [addTargetType, setAddTargetType] = useState<'' | LineageNodeType>('');
  const [addTargetId, setAddTargetId] = useState('');
  const [addUpField, setAddUpField] = useState('');
  const [addDownField, setAddDownField] = useState('');
  const [addSelectedFields, setAddSelectedFields] = useState<string[]>([]);
  const [addReason, setAddReason] = useState('');
  const [addError, setAddError] = useState('');
  const [approvalDetailOpen, setApprovalDetailOpen] = useState(false);
  const [submitApprovalOpen, setSubmitApprovalOpen] = useState(false);
  const [submitReason, setSubmitReason] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [initApprovalOpen, setInitApprovalOpen] = useState(false);
  const [initReason, setInitReason] = useState('');
  const [initRiskConfirmed, setInitRiskConfirmed] = useState(false);
  const [initError, setInitError] = useState('');
  const subjectNodeColRef = useRef<number>(0);
  const addDialogOpenPrevRef = useRef(false);
  const submitReasonRef = useRef<HTMLTextAreaElement>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Effective nodes DB: if centerNodeId doesn't exist in NODES_DB,
  // dynamically create a mock lineage graph for it
  const effectiveNodes: Record<string, LineageNodeData> = useMemo(() => {
    const applyApprovedChanges = (base: Record<string, LineageNodeData>) => {
      const next: Record<string, LineageNodeData> = Object.fromEntries(
        Object.entries(base).map(([id, node]) => [id, { ...node, upstream: [...node.upstream], downstream: [...node.downstream] }]),
      );
      approvals
        .filter(approval => approval.status === 'approved')
        .flatMap(approval => approval.changes)
        .filter((change): change is LineageRelationChange => change.kind === 'relation')
        .forEach(change => {
          const source = next[change.sourceId];
          const target = next[change.targetId];
          if (!source || !target) return;
          if (change.action === 'add') {
            if (!source.downstream.includes(target.id)) source.downstream.push(target.id);
            if (!target.upstream.includes(source.id)) target.upstream.push(source.id);
          } else {
            source.downstream = source.downstream.filter(id => id !== target.id);
            target.upstream = target.upstream.filter(id => id !== source.id);
          }
        });
      return next;
    };

    if (NODES_DB[centerNodeId]) return applyApprovedChanges(NODES_DB);

    const srcId1 = `source_${centerNodeId}_1`;
    const srcId2 = `source_${centerNodeId}_2`;
    const tgtId1 = `target_${centerNodeId}_1`;

    const dynamicNodes: Record<string, LineageNodeData> = {
      [centerNodeId]: {
        id: centerNodeId,
        name: centerNodeId,
        display: '当前资产',
        type: 'table',
        platform: '-',
        db: '-',
        tech_owner: '-',
        biz_owner: '-',
        catalog: '-',
        updated: '-',
        storage: '-',
        partitioned: false,
        fields: [
          { name: 'id', type: 'BIGINT', comment: '主键' },
          { name: 'name', type: 'STRING', comment: '名称' },
          { name: 'created_at', type: 'TIMESTAMP', comment: '创建时间' },
        ],
        upstream: [srcId1, srcId2],
        downstream: [tgtId1],
      },
      [srcId1]: {
        id: srcId1,
        name: srcId1,
        display: '上游数据源1',
        type: 'table',
        platform: '-',
        db: '-',
        tech_owner: '-',
        biz_owner: '-',
        catalog: '-',
        updated: '-',
        storage: '-',
        partitioned: false,
        fields: [
          { name: 'id', type: 'BIGINT', comment: '主键' },
          { name: 'name', type: 'STRING', comment: '名称' },
          { name: 'created_at', type: 'TIMESTAMP', comment: '创建时间' },
        ],
        upstream: [],
        downstream: [centerNodeId],
      },
      [srcId2]: {
        id: srcId2,
        name: srcId2,
        display: '上游数据源2',
        type: 'api',
        platform: '-',
        db: '-',
        tech_owner: '-',
        biz_owner: '-',
        catalog: '-',
        updated: '-',
        storage: '-',
        partitioned: false,
        fields: [
          { name: 'id', type: 'BIGINT', comment: '主键' },
          { name: 'name', type: 'STRING', comment: '名称' },
          { name: 'created_at', type: 'TIMESTAMP', comment: '创建时间' },
        ],
        upstream: [],
        downstream: [centerNodeId],
      },
      [tgtId1]: {
        id: tgtId1,
        name: tgtId1,
        display: '下游应用1',
        type: 'table',
        platform: '-',
        db: '-',
        tech_owner: '-',
        biz_owner: '-',
        catalog: '-',
        updated: '-',
        storage: '-',
        partitioned: false,
        fields: [
          { name: 'id', type: 'BIGINT', comment: '主键' },
          { name: 'derived_value', type: 'STRING', comment: '衍生值' },
          { name: 'dt', type: 'STRING', comment: '分区日期' },
        ],
        upstream: [centerNodeId],
        downstream: [],
      },
    };

    return applyApprovedChanges({ ...NODES_DB, ...dynamicNodes });
  }, [centerNodeId, approvals]);

  // Effective field edges: use static FIELD_EDGES for known nodes, generate dynamic ones otherwise
  const effectiveFieldEdges: FieldEdge[] = useMemo(() => {
    const approvedFieldEdges = approvals
      .filter(approval => approval.status === 'approved')
      .flatMap(approval => approval.changes)
      .filter((change): change is LineageFieldMappingChange => change.kind === 'field')
      .map(change => ({
        from: change.sourceId,
        fromField: change.sourceField,
        to: change.targetId,
        toField: change.targetField,
      }));

    if (NODES_DB[centerNodeId]) return [...FIELD_EDGES, ...approvedFieldEdges];

    const srcId1 = `source_${centerNodeId}_1`;
    const tgtId1 = `target_${centerNodeId}_1`;

    return [
      { from: srcId1, fromField: 'id', to: centerNodeId, toField: 'id' },
      { from: srcId1, fromField: 'name', to: centerNodeId, toField: 'name' },
      { from: srcId1, fromField: 'created_at', to: centerNodeId, toField: 'created_at' },
      { from: centerNodeId, fromField: 'id', to: tgtId1, toField: 'id' },
      { from: centerNodeId, fromField: 'name', to: tgtId1, toField: 'name' },
      ...approvedFieldEdges,
    ];
  }, [centerNodeId, approvals]);

  // Build visible nodes and edges
  const { nodes, edges } = useMemo(
    () => buildVisibleNodes(centerNodeId, scope, depth, expandedNodes, effectiveNodes),
    [centerNodeId, scope, depth, expandedNodes, effectiveNodes],
  );

  // Canvas dimensions (will be updated on resize)
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 600 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Layout
  const { positions, colMap } = useMemo(
    () => layoutNodes(nodes, centerNodeId, expandedNodes, fieldPageMap, canvasSize.w, canvasSize.h, effectiveNodes, subjectNodeColRef.current),
    [nodes, centerNodeId, expandedNodes, fieldPageMap, canvasSize, effectiveNodes],
  );

  // Keep colMapRef in sync for cross-closure reads
  const colMapRef = useRef<Record<string, number>>({});
  colMapRef.current = colMap;

  // Capture subject node column when add dialog opens
  useEffect(() => {
    if (addDialogOpen && !addDialogOpenPrevRef.current) {
      subjectNodeColRef.current = colMapRef.current[centerNodeId] ?? 0;
    }
    addDialogOpenPrevRef.current = addDialogOpen;
  }, [addDialogOpen]);

  // Compute linked fields per node for highlighting
  const linkedFieldsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    nodes.forEach((n) => {
      map[n.id] = new Set<string>();
    });
    if (activeField) {
      effectiveFieldEdges.forEach((fe) => {
        if (fe.from === activeField.nodeId && fe.fromField === activeField.fieldName) {
          map[fe.to]?.add(fe.toField);
          map[fe.from]?.add(fe.fromField);
        }
        if (fe.to === activeField.nodeId && fe.toField === activeField.fieldName) {
          map[fe.from]?.add(fe.fromField);
          map[fe.to]?.add(fe.toField);
        }
      });
      map[activeField.nodeId]?.add(activeField.fieldName);
    }
    return map;
  }, [activeField, nodes, effectiveFieldEdges]);

  // Selected node data
  const selectedNode = selectedNodeId ? effectiveNodes[selectedNodeId] ?? null : null;

  // Apply transform
  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;
    }
  }, [transform]);

  // Center view
  const centerView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const CW = canvas.offsetWidth;
    const CH = canvas.offsetHeight;
    const centerPos = positions[centerNodeId];
    if (centerPos) {
      const nx = centerPos.x + NODE_W / 2;
      const ny = centerPos.y + 50;
      setTransform({ x: CW / 2 - nx, y: CH / 2 - ny, scale: 1 });
    } else {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [positions, centerNodeId]);

  // Auto-center on first render and when center node changes
  useEffect(() => {
    const timer = setTimeout(centerView, 50);
    return () => clearTimeout(timer);
  }, [centerView]);

  // Pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan from blank area, not from node
    if ((e.target as HTMLElement).closest('.ln-node')) return;
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  }, [transform]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTransform((prev) => ({ ...prev, x: dragStartRef.current.tx + dx, y: dragStartRef.current.ty + dy }));
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    draggingRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = '';
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      const newScale = Math.max(0.3, Math.min(3, prev.scale * delta));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, scale: newScale };
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
      const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  // Toggle expand
  const handleToggleExpand = useCallback((nodeId: string, _dir: 'up' | 'down') => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Toggle fields
  const handleToggleFields = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Field page
  const handleFieldPage = useCallback((nodeId: string, delta: number) => {
    setFieldPageMap((prev) => {
      const node = effectiveNodes[nodeId];
      if (!node) return prev;
      const totalPages = Math.ceil(node.fields.length / FIELDS_PER_PAGE);
      const cur = prev[nodeId] ?? 0;
      return { ...prev, [nodeId]: Math.max(0, Math.min(totalPages - 1, cur + delta)) };
    });
  }, []);

  // Activate field
  const handleActivateField = useCallback((nodeId: string, fieldName: string) => {
    setActiveField((prev) => {
      if (prev && prev.nodeId === nodeId && prev.fieldName === fieldName) return null;
      // Auto-expand connected nodes
      const newExpanded = new Set(expandedNodes);
      effectiveFieldEdges.forEach((fe) => {
        if (fe.from === nodeId && fe.fromField === fieldName) newExpanded.add(fe.to);
        if (fe.to === nodeId && fe.toField === fieldName) newExpanded.add(fe.from);
      });
      newExpanded.add(nodeId);
      setExpandedNodes(newExpanded);
      return { nodeId, fieldName };
    });
  }, [expandedNodes, effectiveFieldEdges]);

  // Select node -> open drawer
  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDrawerTab('info');
  }, []);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Switch drawer tab
  const handleSwitchDrawerTab = useCallback((tab: string) => {
    setDrawerTab(tab);
  }, []);

  // Jump to node
  const handleJumpToNode = useCallback((nodeId: string) => {
    if (!effectiveNodes[nodeId]) return;
    setCenterNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setActiveField(null);
    setExpandedNodes(new Set());
    setFieldPageMap({});
    setDrawerTab('lineage');
  }, [effectiveNodes]);

  // Reset
  const handleReset = useCallback(() => {
    setScope('all');
    setDepth(1);
    setActiveField(null);
    setExpandedNodes(new Set());
    setFieldPageMap({});
    setSelectedNodeId(null);
    setDrawerTab('info');
    setTransform({ x: 0, y: 0, scale: 1 });
    setCorrectMode(false);
    setPendingChanges([]);
    setConnectionSource(null);
    setTimeout(centerView, 50);
  }, [centerView]);

  // Fullscreen
  const handleFullscreen = useCallback(() => {
    const wrap = document.getElementById('page-lineage-wrap');
    if (!document.fullscreenElement) {
      wrap?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Back
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  // Correct mode: handle node click for establishing connections
  const handleCorrectModeClick = useCallback((nodeId: string) => {
    if (!correctMode) return;
    if (connectionSource === null) {
      // First click: select source node
      setConnectionSource(nodeId);
    } else if (connectionSource === nodeId) {
      // Clicked same node: deselect
      setConnectionSource(null);
    } else {
      // Second click: create connection (source -> target)
      const sourceNode = effectiveNodes[connectionSource];
      const targetNode = effectiveNodes[nodeId];
      if (sourceNode && targetNode) {
        const newChange: LineageChange = {
          id: `add-${connectionSource}-${nodeId}-${Date.now()}`,
          type: 'add',
          sourceId: connectionSource,
          targetId: nodeId,
          description: `新增连线：${sourceNode.display} → ${targetNode.display}`,
        };
        setPendingChanges((prev) => [...prev, newChange]);
      }
      setConnectionSource(null);
    }
  }, [correctMode, connectionSource, effectiveNodes]);

  // Correct mode: handle right-click for marking edge deletion
  const handleCorrectModeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    if (!correctMode) return;
    const sourceNode = effectiveNodes[nodeId];
    if (!sourceNode) return;
    // Find an upstream edge to mark for deletion
    const existingUpstream = sourceNode.upstream.find((uid) => effectiveNodes[uid]);
    if (existingUpstream) {
      const upstreamNode = effectiveNodes[existingUpstream];
      const newChange: LineageChange = {
        id: `delete-${existingUpstream}-${nodeId}-${Date.now()}`,
        type: 'delete',
        sourceId: existingUpstream,
        targetId: nodeId,
        description: `删除连线：${upstreamNode?.display} → ${sourceNode.display}`,
      };
      setPendingChanges((prev) => [...prev, newChange]);
    }
  }, [correctMode, effectiveNodes]);

  // Correct mode: remove a pending change
  const handleRemoveChange = useCallback((changeId: string) => {
    setPendingChanges((prev) => prev.filter((c) => c.id !== changeId));
  }, []);

  const subjectNode = effectiveNodes[centerNodeId] ?? NODES_DB.dwd_order_detail;
  const activeApproval = approvals.find(approval => approval.objectId === centerNodeId && approval.status === 'approving');
  const editorBlocked = !!activeApproval;
  const relationDraftChanges = draftChanges.filter((change): change is LineageRelationChange => change.kind === 'relation');
  const fieldDraftChanges = draftChanges.filter((change): change is LineageFieldMappingChange => change.kind === 'field');
  const draftChangeCount = draftChanges.length;
  const submitSummary = {
    total: draftChangeCount,
    addUpstream: relationDraftChanges.filter(change => change.action === 'add' && change.direction === 'upstream').length,
    addDownstream: relationDraftChanges.filter(change => change.action === 'add' && change.direction === 'downstream').length,
    deleteUpstream: relationDraftChanges.filter(change => change.action === 'delete' && change.direction === 'upstream').length,
    deleteDownstream: relationDraftChanges.filter(change => change.action === 'delete' && change.direction === 'downstream').length,
    fieldFix: fieldDraftChanges.length,
  };
  const targetOptions = useMemo(
    () => addTargetType ? Object.values(effectiveNodes).filter(node => node.id !== centerNodeId && node.type === addTargetType && node.type !== 'report') : [],
    [addTargetType, centerNodeId, effectiveNodes],
  );
  const selectedTargetNode = addTargetId ? (effectiveNodes[addTargetId] ?? null) : null;
  const sourceNodeForAdd = addDirection === 'upstream' ? selectedTargetNode : addDirection === 'downstream' ? subjectNode : null;
  const targetNodeForAdd = addDirection === 'upstream' ? subjectNode : addDirection === 'downstream' ? selectedTargetNode : null;
  const needsTableMapping = !!sourceNodeForAdd && !!targetNodeForAdd && isTableLikeType(sourceNodeForAdd.type) && isTableLikeType(targetNodeForAdd.type);
  const needsEntityFieldSelection = !!sourceNodeForAdd && !!targetNodeForAdd &&
    ((isEntityType(sourceNodeForAdd.type) && isTableLikeType(targetNodeForAdd.type)) || (isTableLikeType(sourceNodeForAdd.type) && isEntityType(targetNodeForAdd.type)));
  const isEntityToEntityAdd = !!sourceNodeForAdd && !!targetNodeForAdd && isEntityType(sourceNodeForAdd.type) && isEntityType(targetNodeForAdd.type);
  const sourceMappingLabel = sourceNodeForAdd
    ? `${sourceNodeForAdd.id === centerNodeId ? '当前节点' : '目标节点'}${mappingUnitLabel(sourceNodeForAdd.type)}`
    : '来源节点字段';
  const targetMappingLabel = targetNodeForAdd
    ? `${targetNodeForAdd.id === centerNodeId ? '当前节点' : '目标节点'}${mappingUnitLabel(targetNodeForAdd.type)}`
    : '去向节点字段';
  const carrierNodeForSelection = needsEntityFieldSelection
    ? (sourceNodeForAdd && isTableLikeType(sourceNodeForAdd.type) ? sourceNodeForAdd : targetNodeForAdd)
    : null;
  const carrierSelectionLabel = carrierNodeForSelection
    ? `${carrierNodeForSelection.id === centerNodeId ? '当前节点' : '目标节点'}${mappingUnitLabel(carrierNodeForSelection.type)}`
    : '承载字段';

  function resetAddForm() {
    setAddDirection('');
    setAddTargetType('');
    setAddTargetId('');
    setAddUpField('');
    setAddDownField('');
    setAddSelectedFields([]);
    setAddReason('');
    setAddError('');
  }

  function openAddDialog() {
    resetAddForm();
    setAddDialogOpen(true);
  }

  function openInitializeApproval() {
    setInitReason('');
    setInitRiskConfirmed(false);
    setInitError('');
    setAddDialogOpen(false);
    setSubmitApprovalOpen(false);
    setInitApprovalOpen(true);
  }

  function pendingKey(change: LineageRelationChange) {
    return `${change.action}:${change.sourceId}>${change.targetId}`;
  }

  function removeDraftByRelation(change: LineageRelationChange) {
    setDraftChanges(prev => prev.filter(item => {
      if (item.id === change.id) return false;
      if (item.kind === 'field' && item.action === change.action && item.sourceId === change.sourceId && item.targetId === change.targetId) return false;
      return true;
    }));
  }

  function markRelationDelete(sourceId: string, targetId: string, direction: 'upstream' | 'downstream') {
    if (editorBlocked) return;
    const sourceNode = effectiveNodes[sourceId];
    const targetNode = effectiveNodes[targetId];
    if (!sourceNode || !targetNode) return;
    const relationChange: LineageRelationChange = {
      id: `delete-relation-${sourceId}-${targetId}-${Date.now()}`,
      kind: 'relation',
      action: 'delete',
      direction,
      sourceId,
      sourceName: sourceNode.name,
      targetId,
      targetName: targetNode.name,
      reason: '人工删除关系',
    };
    setDraftChanges(prev => {
      if (prev.some(item => item.kind === 'relation' && pendingKey(item) === pendingKey(relationChange))) return prev;
      return [...prev, relationChange];
    });
  }

  function toggleSelectedField(fieldName: string, checked: boolean) {
    setAddSelectedFields(prev => checked ? Array.from(new Set([...prev, fieldName])) : prev.filter(item => item !== fieldName));
  }

  function entityField(node: LineageNodeData) {
    return node.fields[0]?.name ?? '(指标)';
  }

  function submitAddRelation() {
    setAddError('');
    const direction = addDirection;
    if (!direction) {
      setAddError('请选择方向');
      return;
    }
    if (!addTargetType) {
      setAddError('请选择目标类型');
      return;
    }
    if (!selectedTargetNode || !sourceNodeForAdd || !targetNodeForAdd) {
      setAddError('请选择目标资源');
      return;
    }
    if (!addReason.trim()) {
      setAddError('请填写单条修正原因');
      return;
    }
    if (!needsTableMapping && !needsEntityFieldSelection && !isEntityToEntityAdd) {
      setAddError(`${typeFullLabel(subjectNode.type)} 与 ${typeFullLabel(selectedTargetNode.type)} 暂不支持新增血缘`);
      return;
    }
    if (needsTableMapping && (!addUpField || !addDownField)) {
      setAddError('表级血缘必须配置字段映射');
      return;
    }
    if (needsEntityFieldSelection && addSelectedFields.length === 0) {
      setAddError('指标/标签与表级节点建立关系时必须选择表字段');
      return;
    }

    const changeSetId = `add-${sourceNodeForAdd.id}-${targetNodeForAdd.id}-${Date.now()}`;
    const relationChange: LineageRelationChange = {
      id: `${changeSetId}-relation`,
      kind: 'relation',
      action: 'add',
      direction,
      sourceId: sourceNodeForAdd.id,
      sourceName: sourceNodeForAdd.name,
      targetId: targetNodeForAdd.id,
      targetName: targetNodeForAdd.name,
      reason: addReason,
    };
    const fieldChanges: LineageFieldMappingChange[] = [];
    if (needsTableMapping) {
      fieldChanges.push({
        id: `${changeSetId}-field-1`,
        kind: 'field',
        action: 'add',
        direction,
        sourceId: sourceNodeForAdd.id,
        sourceName: sourceNodeForAdd.name,
        sourceField: addUpField,
        targetId: targetNodeForAdd.id,
        targetName: targetNodeForAdd.name,
        targetField: addDownField,
        reason: addReason,
      });
    }
    if (needsEntityFieldSelection) {
      const tableNode = isTableLikeType(sourceNodeForAdd.type) ? sourceNodeForAdd : targetNodeForAdd;
      addSelectedFields.forEach(fieldName => {
        fieldChanges.push({
          id: `${changeSetId}-field-${fieldName}`,
          kind: 'field',
          action: 'add',
          direction,
          sourceId: sourceNodeForAdd.id,
          sourceName: sourceNodeForAdd.name,
          sourceField: sourceNodeForAdd.id === tableNode.id ? fieldName : entityField(sourceNodeForAdd),
          targetId: targetNodeForAdd.id,
          targetName: targetNodeForAdd.name,
          targetField: targetNodeForAdd.id === tableNode.id ? fieldName : entityField(targetNodeForAdd),
          reason: addReason,
        });
      });
    }
    setDraftChanges(prev => [...prev, relationChange, ...fieldChanges]);
    setAddDialogOpen(false);
  }

  function initializationChanges(): LineageChangeSetItem[] {
    const firstUpstream = subjectNode.upstream.find(id => effectiveNodes[id]);
    const firstDownstream = subjectNode.downstream.find(id => effectiveNodes[id]);
    const relationChanges: LineageRelationChange[] = [];
    if (firstUpstream) {
      const source = effectiveNodes[firstUpstream];
      relationChanges.push({
        id: `init-delete-${firstUpstream}-${centerNodeId}`,
        kind: 'relation',
        action: 'delete',
        direction: 'upstream',
        sourceId: firstUpstream,
        sourceName: source?.name ?? firstUpstream,
        targetId: centerNodeId,
        targetName: subjectNode.name,
        reason: '初始化血缘全量重建前删除旧关系',
      });
    }
    if (firstDownstream) {
      const target = effectiveNodes[firstDownstream];
      relationChanges.push({
        id: `init-add-${centerNodeId}-${firstDownstream}`,
        kind: 'relation',
        action: 'add',
        direction: 'downstream',
        sourceId: centerNodeId,
        sourceName: subjectNode.name,
        targetId: firstDownstream,
        targetName: target?.name ?? firstDownstream,
        reason: '初始化血缘规则推断保留/新增关系',
      });
    }
    const firstField = subjectNode.fields[0]?.name ?? 'id';
    const fieldChange: LineageFieldMappingChange = {
      id: `init-field-${centerNodeId}-${firstField}`,
      kind: 'field',
      action: 'add',
      direction: 'downstream',
      sourceId: centerNodeId,
      sourceName: subjectNode.name,
      sourceField: firstField,
      targetId: firstDownstream ?? centerNodeId,
      targetName: firstDownstream ? (effectiveNodes[firstDownstream]?.name ?? firstDownstream) : subjectNode.name,
      targetField: firstField,
      reason: '初始化血缘推断字段级关系',
    };
    return [...relationChanges, fieldChange];
  }

  function submitInitializationApproval() {
    setInitError('');
    if (!initReason.trim()) {
      setInitError('请填写初始化原因');
      return;
    }
    if (!initRiskConfirmed) {
      setInitError('请确认审批通过后将覆盖当前资产已有血缘');
      return;
    }
    try {
      submitLineageApproval({
        objectId: centerNodeId,
        objectName: subjectNode.name,
        objectDisplay: subjectNode.display,
        catalog: subjectNode.catalog,
        securityLevel: 'S3',
        reason: initReason.trim(),
        correctionMode: 'initialize',
        effectMode: 'full_rebuild',
        riskConfirmed: true,
        initStats: { add: 1, delete: 1, keep: Math.max(0, subjectNode.upstream.length + subjectNode.downstream.length - 1) },
        changes: initializationChanges(),
      });
      setInitApprovalOpen(false);
      setEditorOpen(true);
    } catch (error) {
      setInitError(error instanceof Error ? error.message : '提交失败');
    }
  }

  function openSubmitApproval() {
    setSubmitReason('');
    setSubmitError('');
    setSubmitApprovalOpen(true);
  }

  function submitDraftForApproval() {
    if (!submitReason.trim()) {
      setSubmitError('请填写修正总原因');
      submitReasonRef.current?.focus();
      submitReasonRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      submitLineageApproval({
        objectId: centerNodeId,
        objectName: subjectNode.name,
        objectDisplay: subjectNode.display,
        catalog: subjectNode.catalog,
        securityLevel: 'S3',
        reason: submitReason.trim(),
        changes: draftChanges,
      });
      setDraftChanges([]);
      setSubmitApprovalOpen(false);
      setEditorOpen(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交失败');
    }
  }

  function approvalJudgment() {
    const hasDelete = submitSummary.deleteUpstream > 0 || submitSummary.deleteDownstream > 0;
    const parts = [hasDelete ? '包含删除生效关系，请重点核验影响' : '本次不删除当前生效关系'];
    if (submitSummary.addUpstream > 0 || submitSummary.addDownstream > 0) parts.push('新增关系审批通过后才会进入当前血缘图');
    if (submitSummary.fieldFix > 0) parts.push('字段映射需重点核验');
    if (parts.length === 1) parts.push('审批通过前不会改变当前血缘图');
    return `${parts.join('；')}。`;
  }

  function relationRows() {
    const rows: Array<{ key: string; direction: 'upstream' | 'downstream'; sourceId: string; targetId: string; label: string; status: 'active' | 'pending-add' | 'pending-delete'; change?: LineageRelationChange }> = [];
    subjectNode.upstream.forEach(sourceId => {
      const source = effectiveNodes[sourceId];
      if (!source) return;
      const deleteChange = relationDraftChanges.find(change => change.action === 'delete' && change.sourceId === sourceId && change.targetId === centerNodeId);
      rows.push({ key: `up-${sourceId}`, direction: 'upstream', sourceId, targetId: centerNodeId, label: `${source.name} → ${subjectNode.name}`, status: deleteChange ? 'pending-delete' : 'active', change: deleteChange });
    });
    subjectNode.downstream.forEach(targetId => {
      const target = effectiveNodes[targetId];
      if (!target) return;
      const deleteChange = relationDraftChanges.find(change => change.action === 'delete' && change.sourceId === centerNodeId && change.targetId === targetId);
      rows.push({ key: `down-${targetId}`, direction: 'downstream', sourceId: centerNodeId, targetId, label: `${subjectNode.name} → ${target.name}`, status: deleteChange ? 'pending-delete' : 'active', change: deleteChange });
    });
    relationDraftChanges.filter(change => change.action === 'add').forEach(change => {
      rows.push({ key: change.id, direction: change.direction, sourceId: change.sourceId, targetId: change.targetId, label: `${change.sourceName} → ${change.targetName}`, status: 'pending-add', change });
    });
    return rows;
  }

  function fieldRows() {
    const activeRows = effectiveFieldEdges
      .filter(edge => edge.from === centerNodeId || edge.to === centerNodeId || subjectNode.upstream.includes(edge.from) || subjectNode.downstream.includes(edge.to))
      .map(edge => ({
        key: `${edge.from}-${edge.fromField}-${edge.to}-${edge.toField}`,
        label: `${edge.from}.${edge.fromField} → ${edge.to}.${edge.toField}`,
        status: 'active' as const,
        change: undefined as LineageFieldMappingChange | undefined,
      }));
    const pendingRows = fieldDraftChanges.map(change => ({
      key: change.id,
      label: `${change.sourceName}.${change.sourceField} → ${change.targetName}.${change.targetField}`,
      status: change.action === 'add' ? 'pending-add' as const : 'pending-delete' as const,
      change,
    }));
    return [...activeRows, ...pendingRows];
  }

  function renderStatusTag(status: 'active' | 'pending-add' | 'pending-delete') {
    if (status === 'pending-add') return <Tag tone="success">待新增</Tag>;
    if (status === 'pending-delete') return <Tag tone="danger">待删除</Tag>;
    return <Tag tone="gray">当前生效</Tag>;
  }

  function renderRelationUndoButton(change?: LineageRelationChange | LineageFieldMappingChange) {
    if (!change || change.kind !== 'relation') return null;
    return <Button size="sm" onClick={() => removeDraftByRelation(change)}>撤销</Button>;
  }

  function renderEditorDrawer() {
    if (!editorOpen) return null;
    const rows = editorTab === 'table' ? relationRows() : fieldRows();
    return (
      <div className="lineage-editor-drawer open" aria-label="血缘关系管理">
        <div className="lineage-editor-drawer__inner">
          <header className="lineage-editor-drawer__header">
            <div>
              <h2>血缘关系管理</h2>
              <p>{subjectNode.display} · {subjectNode.name}</p>
            </div>
            <button type="button" onClick={() => setEditorOpen(false)}>×</button>
          </header>
          <div className="lineage-editor-drawer__body">
            {activeApproval ? (
              <div className="lineage-editor-block lineage-editor-block--warning">
                <strong>当前对象已有血缘修正审批中，请撤回或等待审批结束后再提交新的修正。</strong>
                <span>{activeApproval.approvalNo} · {lineageApprovalSummaryText(activeApproval)}</span>
                <div className="lineage-editor-actions">
                  <Button size="sm" onClick={() => setApprovalDetailOpen(true)}>查看审批详情</Button>
                  <Button size="sm" variant="danger" onClick={() => withdrawLineageApproval(activeApproval.id)}>撤回申请</Button>
                  <Button size="sm" variant="primary" onClick={() => approveLineageApproval(activeApproval.id)}>模拟审批通过</Button>
                  <Button size="sm" onClick={() => rejectLineageApproval(activeApproval.id, '审批人拒绝本次血缘修正')}>模拟审批拒绝</Button>
                </div>
              </div>
            ) : (
              <div className="lineage-editor-block lineage-editor-block--success">本次修正提交审批后生效，审批通过前不会改变当前血缘图。</div>
            )}
            <div className="lineage-editor-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={editorTab === 'table'} className={editorTab === 'table' ? 'active' : ''} onClick={() => setEditorTab('table')}>表级血缘</button>
              <button type="button" role="tab" aria-selected={editorTab === 'field'} className={editorTab === 'field' ? 'active' : ''} onClick={() => setEditorTab('field')}>字段级血缘</button>
            </div>
            <div className="lineage-editor-list">
              {rows.map(row => (
                <div key={row.key} className={`lineage-editor-row lineage-editor-row--${row.status}`}>
                  <div>
                    <strong>{row.label}</strong>
                    <span>{'direction' in row ? row.direction === 'upstream' ? '上游' : '下游' : '字段映射'}</span>
                  </div>
                  <div className="lineage-editor-row__actions">
                    {renderStatusTag(row.status)}
                    {row.status === 'active' && editorTab === 'table' && 'sourceId' in row ? (
                      <Button size="sm" disabled={editorBlocked} onClick={() => markRelationDelete(row.sourceId, row.targetId, row.direction)}>删除</Button>
                    ) : null}
                    {renderRelationUndoButton(row.change)}
                  </div>
                </div>
              ))}
              {rows.length === 0 ? <div className="lineage-editor-empty">暂无血缘关系</div> : null}
            </div>
          </div>
          <footer className="lineage-editor-drawer__footer">
            <div className="lineage-editor-drawer__footer-left">
              <Button onClick={openAddDialog} disabled={editorBlocked}>添加血缘关系</Button>
              <Button variant="danger" onClick={openInitializeApproval} disabled={editorBlocked}>重置血缘</Button>
            </div>
            <Button variant="primary" disabled={editorBlocked || draftChangeCount === 0} onClick={openSubmitApproval}>提交修正（{draftChangeCount} 项变更）</Button>
          </footer>
        </div>
      </div>
    );
  }

  function renderAddDialog() {
    if (!addDialogOpen) return null;
    const sourceFields = sourceNodeForAdd?.fields ?? [];
    const targetFields = targetNodeForAdd?.fields ?? [];
    return (
      <div className="lineage-modal-overlay" onClick={() => setAddDialogOpen(false)}>
        <div className="lineage-modal lineage-modal--wide" role="dialog" aria-label="添加血缘关系" onClick={(event) => event.stopPropagation()}>
          <div className="lineage-modal-header">添加血缘关系</div>
          <div className="lineage-modal-body lineage-form">
            {addError ? <div className="lineage-form__error">{addError}</div> : null}
            <div className="lineage-form__field">
              <label htmlFor="lineage-add-direction">方向</label>
              <select id="lineage-add-direction" value={addDirection} onChange={event => setAddDirection(event.target.value as '' | 'upstream' | 'downstream')}>
                <option value="">请选择方向</option>
                <option value="upstream">添加上游</option>
                <option value="downstream">添加下游</option>
              </select>
            </div>
            <div className="lineage-form__field">
              <label htmlFor="lineage-add-target-type">目标类型</label>
              <select id="lineage-add-target-type" value={addTargetType} onChange={event => {
                setAddTargetType(event.target.value as '' | LineageNodeType);
                setAddTargetId('');
                setAddUpField('');
                setAddDownField('');
                setAddSelectedFields([]);
              }}>
                <option value="">请选择目标类型</option>
                <option value="table">表</option>
                <option value="view">视图</option>
                <option value="api">API</option>
                <option value="metric">指标</option>
                <option value="label">标签</option>
              </select>
            </div>
            <div className="lineage-form__field">
              <label htmlFor="lineage-add-target">目标资源</label>
              <select id="lineage-add-target" value={addTargetId} disabled={!addTargetType || targetOptions.length === 0} onChange={event => {
                setAddTargetId(event.target.value);
                setAddUpField('');
                setAddDownField('');
                setAddSelectedFields([]);
              }}>
                {!addTargetType ? <option value="">请先选择目标类型</option> : <option value="">{targetOptions.length === 0 ? '当前类型暂无可选资产' : '请选择目标资源'}</option>}
                {targetOptions.map(node => <option key={node.id} value={node.id}>{node.display}（{node.name}）</option>)}
              </select>
            </div>
            {needsTableMapping ? (
              <div className="lineage-form__mapping">
                <div className="lineage-form__field">
                  <label htmlFor="lineage-add-up-field">{sourceMappingLabel}</label>
                  <select id="lineage-add-up-field" value={addUpField} onChange={event => setAddUpField(event.target.value)}>
                    <option value="">请选择</option>
                    {sourceFields.map(field => <option key={field.name} value={field.name}>{field.name}（{field.type}）</option>)}
                  </select>
                </div>
                <div className="lineage-form__field">
                  <label htmlFor="lineage-add-down-field">{targetMappingLabel}</label>
                  <select id="lineage-add-down-field" value={addDownField} onChange={event => setAddDownField(event.target.value)}>
                    <option value="">请选择</option>
                    {targetFields.map(field => <option key={field.name} value={field.name}>{field.name}（{field.type}）</option>)}
                  </select>
                </div>
              </div>
            ) : null}
            {needsEntityFieldSelection && carrierNodeForSelection ? (
              <fieldset className="lineage-form__fieldset lineage-form__fieldset--carrier">
                <legend>选择承载字段</legend>
                <p>指标/标签需要绑定到表、视图或 API 的一个或多个字段/参数。</p>
                <div className="lineage-form__section-label">{carrierSelectionLabel}</div>
                <div className="lineage-form__carrier-list">
                  {carrierNodeForSelection.fields.map(field => (
                    <label key={field.name} className="lineage-form__checkline">
                      <input type="checkbox" checked={addSelectedFields.includes(field.name)} onChange={event => toggleSelectedField(field.name, event.target.checked)} />
                      <span className="lineage-form__check-main">
                        <strong>{field.name}</strong>
                        <em>{field.type}</em>
                      </span>
                      <span className="lineage-form__check-desc">{field.comment}</span>
                    </label>
                ))}
                </div>
              </fieldset>
            ) : null}
            {isEntityToEntityAdd ? <div className="lineage-form__note">指标/标签之间将直接建立口径依赖关系，无需配置字段或参数映射。</div> : null}
            <label htmlFor="lineage-add-reason">单条修正原因</label>
            <textarea id="lineage-add-reason" value={addReason} onChange={event => setAddReason(event.target.value)} placeholder="必填，说明这条关系的修正依据" />
          </div>
          <div className="lineage-modal-footer">
            <Button size="sm" onClick={() => setAddDialogOpen(false)}>取消</Button>
            <Button size="sm" variant="primary" onClick={submitAddRelation}>确认添加</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderSubmitApprovalDialog() {
    if (!submitApprovalOpen) return null;
    return (
      <div className="lineage-modal-overlay" onClick={() => setSubmitApprovalOpen(false)}>
        <div className="lineage-modal lineage-modal--submit" role="dialog" aria-label="提交血缘修正审批" onClick={(event) => event.stopPropagation()}>
          <div className="lineage-modal-header">提交血缘修正审批</div>
          <div className="lineage-modal-body lineage-submit">
            <div className="lineage-submit__judgment">
              <strong>审批判断</strong>
              <span>{approvalJudgment()}</span>
            </div>
            <div className="lineage-submit__meta">
              <div className="lineage-submit__meta-row"><span>主体对象</span><strong>{subjectNode.display}</strong><em>{subjectNode.name} · {subjectNode.catalog} · S3</em></div>
              <div className="lineage-submit__meta-row"><span>审批链</span><strong>直接上级 → S4/S5 安全管理员 → S4/S5 数据管理员 → CTO</strong><em>审批流程：血缘修正_统一版</em></div>
            </div>
            <div className="lineage-submit__cards">
              <div><span>新增上游</span><strong>{submitSummary.addUpstream}</strong></div>
              <div><span>新增下游</span><strong>{submitSummary.addDownstream}</strong></div>
              <div><span>删除关系</span><strong>{submitSummary.deleteUpstream + submitSummary.deleteDownstream}</strong></div>
              <div><span>字段映射</span><strong>{submitSummary.fieldFix}</strong></div>
            </div>
            <div className="lineage-submit__details">
              <strong>变更明细核验</strong>
              {draftChanges.map(change => (
                <div key={change.id}>
                  <Tag tone={change.action === 'add' ? 'success' : 'danger'}>{change.action === 'add' ? '新增' : '删除'}</Tag>
                  <span>{change.kind === 'relation' ? `${change.sourceName} → ${change.targetName}` : `${change.sourceName}.${change.sourceField} → ${change.targetName}.${change.targetField}`}</span>
                  <em>{change.reason || '未填写'}</em>
                </div>
              ))}
            </div>
            <div className="lineage-submit__reason-wrap">
              <label htmlFor="lineage-submit-reason">修正总原因</label>
              <textarea ref={submitReasonRef} id="lineage-submit-reason" value={submitReason} onChange={event => { setSubmitReason(event.target.value); setSubmitError(''); }} placeholder="请说明本次血缘修正的整体原因" />
            </div>
            {submitError ? <div className="lineage-form__error">{submitError}</div> : null}
            <div className="lineage-submit__state">生成审批单；草稿冻结；审批通过后应用 change set；审批拒绝或撤回不应用；撤回后可重新提交。</div>
          </div>
          <div className="lineage-modal-footer">
            <Button size="sm" onClick={() => setSubmitApprovalOpen(false)}>取消</Button>
            <Button size="sm" variant="primary" onClick={submitDraftForApproval}>确认提交审批</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderInitializeApprovalDialog() {
    if (!initApprovalOpen) return null;
    const stats = { add: 1, delete: 1, keep: Math.max(0, subjectNode.upstream.length + subjectNode.downstream.length - 1) };
    const previewChanges = initializationChanges();
    return (
      <div className="lineage-modal-overlay" onClick={() => setInitApprovalOpen(false)}>
        <div className="lineage-modal lineage-modal--submit" role="dialog" aria-label="初始化血缘审批申请" onClick={(event) => event.stopPropagation()}>
          <div className="lineage-modal-header">初始化血缘审批申请</div>
          <div className="lineage-modal-body lineage-submit">
            <div className="lineage-submit__judgment">
              <strong>风险提示</strong>
              <span>审批通过后将以本次初始化结果覆盖当前资产已有血缘；审批拒绝或撤回不改变当前血缘。</span>
            </div>
            <div className="lineage-submit__meta">
              <div className="lineage-submit__meta-row"><span>修正动作</span><strong>初始化血缘</strong><em>生效方式：全量重建</em></div>
              <div className="lineage-submit__meta-row"><span>覆盖对象</span><strong>{subjectNode.display}</strong><em>{subjectNode.name} · {subjectNode.catalog}</em></div>
            </div>
            <div className="lineage-submit__cards">
              <div><span>预计新增</span><strong>{stats.add}</strong></div>
              <div><span>预计删除</span><strong>{stats.delete}</strong></div>
              <div><span>预计保留</span><strong>{stats.keep}</strong></div>
              <div><span>端点关系</span><strong>{previewChanges.filter(item => item.kind === 'field').length}</strong></div>
            </div>
            <div className="lineage-submit__details">
              <strong>本次提交变更数据</strong>
              {previewChanges.map(change => (
                <div key={change.id}>
                  <Tag tone={change.action === 'add' ? 'success' : 'danger'}>{change.action === 'add' ? '新增' : '删除'}</Tag>
                  <span>{change.kind === 'relation' ? `${change.sourceName} → ${change.targetName}` : `${change.sourceName}.${change.sourceField} → ${change.targetName}.${change.targetField}`}</span>
                  <em>{change.reason}</em>
                </div>
              ))}
            </div>
            <label htmlFor="lineage-init-reason">初始化原因</label>
            <textarea id="lineage-init-reason" value={initReason} onChange={event => { setInitReason(event.target.value); setInitError(''); }} placeholder="必填，请说明为什么需要全量重建血缘" />
            <label className="lineage-form__checkline lineage-form__checkline--risk">
              <input type="checkbox" checked={initRiskConfirmed} onChange={event => { setInitRiskConfirmed(event.target.checked); setInitError(''); }} />
              我确认审批通过后将覆盖当前资产已有血缘
            </label>
            {initError ? <div className="lineage-form__error">{initError}</div> : null}
          </div>
          <div className="lineage-modal-footer">
            <Button size="sm" onClick={() => setInitApprovalOpen(false)}>取消</Button>
            <Button size="sm" variant="primary" onClick={submitInitializationApproval}>确认提交审批</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderApprovalDetailDialog() {
    if (!approvalDetailOpen || !activeApproval) return null;
    const summary = lineageApprovalSummary(activeApproval);
    return (
      <div className="lineage-modal-overlay" onClick={() => setApprovalDetailOpen(false)}>
        <div className="lineage-modal lineage-modal--wide" role="dialog" aria-label="血缘审批详情" onClick={(event) => event.stopPropagation()}>
          <div className="lineage-modal-header">血缘审批详情</div>
          <div className="lineage-modal-body">
            <div className="lineage-submit__meta single">
              <div><span>审批单号</span><strong>{activeApproval.approvalNo}</strong><em>{activeApproval.currentNode} · {activeApproval.matchedFlow}</em></div>
              <div><span>变更数量</span><strong>{summary.total} 项</strong><em>{lineageApprovalSummaryText(activeApproval)}</em></div>
            </div>
            {activeApproval.reason ? (
              <div className="lineage-approval-detail-reason"><strong>修正原因</strong><p>{activeApproval.reason}</p></div>
            ) : null}
            {activeApproval.changes.length > 0 && (
              <div className="lineage-approval-detail-changes"><strong>变更明细</strong>
                {activeApproval.changes.map(change => (
                  <div key={change.id} className="lineage-approval-detail-change">
                    <Tag tone={change.action === 'add' ? 'success' : 'danger'}>{change.action === 'add' ? '新增' : '删除'}</Tag>
                    <span>{change.kind === 'relation' ? `${change.sourceName} → ${change.targetName}` : `${change.sourceName}.${change.sourceField} → ${change.targetName}.${change.targetField}`}</span>
                    {change.reason ? <em>{change.reason}</em> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lineage-modal-footer"><Button size="sm" onClick={() => setApprovalDetailOpen(false)}>关闭</Button></div>
        </div>
      </div>
    );
  }

  return (
    <section className={`lineage-page${correctMode ? ' lineage-page--correct-mode' : ''}${isEmbedded ? ' lineage-page--embedded' : ''}`} id="page-lineage-wrap">
      {/* Correct mode banner */}
      {correctMode && (
        <div className="lineage-page__correct-banner">
          修正模式：点击节点选择源 → 点击目标节点建立连线 → 右键节点标记删除连线</div>
      )}
      {/* Toolbar */}
      <div className="lineage-toolbar">
        {!isEmbedded && (
          <button className="btn btn-default btn-sm" onClick={handleBack}>
            <BackIcon /> 返回
          </button>
        )}
        {!isEmbedded && <div className="lineage-toolbar-sep" />}
        <span className="lineage-toolbar-label">血缘范围：</span>
        <select
          className="lineage-toolbar-select"
          value={scope}
          onChange={(e) => setScope(e.target.value as LineageScope)}
        >
          <option value="all">全部</option>
          <option value="upstream">只看上游</option>
          <option value="downstream">只看下游</option>
        </select>
        <div className="lineage-toolbar-sep" />
        <span className="lineage-toolbar-label">层级：</span>
        <select
          className="lineage-toolbar-select"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        >
          <option value={1}>1级</option>
          <option value={2}>2级</option>
          <option value={3}>3级</option>
          <option value={4}>4级</option>
          <option value={5}>5级</option>
        </select>
        <div className="lineage-toolbar-sep" />
        {/* Right-aligned actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button variant="default" size="sm" onClick={() => { setEditorOpen(true); setEditorTab('table'); }}>
            <EditIcon /> 修正血缘
          </Button>
          <div className="lineage-toolbar-sep" />
          <div className="lineage-toolbar-icon-btn" title="全屏" onClick={handleFullscreen}>
            <FullscreenIcon />
          </div>
          <div className="lineage-toolbar-icon-btn" title="回到中心点" onClick={centerView}>
            <CenterIcon />
          </div>
          <div className="lineage-toolbar-icon-btn" title="刷新" onClick={handleReset}>
            <RefreshIcon />
          </div>
        </div>
      </div>

      {/* Canvas + Drawer */}
      <div className="lineage-canvas-wrap">
        {/* Canvas */}
        <div
          className="lineage-canvas"
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          <div className="lineage-canvas-inner" ref={innerRef}>
            {/* Column headers */}
            <ColumnHeaders nodes={nodes} positions={positions} colMap={colMap} />

            {/* SVG edges */}
            <LineageEdges
              edges={edges}
              positions={positions}
              activeField={activeField}
              expandedNodes={expandedNodes}
              fieldPageMap={fieldPageMap}
              db={effectiveNodes}
              fieldEdges={effectiveFieldEdges}
            />

            {/* Node cards */}
            {nodes.map((n) => (
              <LineageNodeCard
                key={n.id}
                node={n}
                pos={positions[n.id] ?? { x: 0, y: 0 }}
                isCenter={n.id === centerNodeId}
                isSelected={n.id === selectedNodeId}
                isFieldActive={!!activeField && n.id === activeField.nodeId}
                isExpanded={expandedNodes.has(n.id)}
                fieldPage={fieldPageMap[n.id] ?? 0}
                linkedFields={linkedFieldsMap[n.id] ?? new Set()}
                activeField={activeField}
                scope={scope}
                colNum={colMap[n.id] ?? 0}
                correctMode={correctMode}
                connectionSource={connectionSource}
                onSelectNode={handleSelectNode}
                onToggleExpand={handleToggleExpand}
                onToggleFields={handleToggleFields}
                onFieldPage={handleFieldPage}
                onActivateField={handleActivateField}
                onCorrectModeClick={handleCorrectModeClick}
                onCorrectModeContextMenu={handleCorrectModeContextMenu}
                db={effectiveNodes}
              />
            ))}
          </div>
        </div>

        {/* Right drawer */}
        <LineageDrawer
          node={selectedNode}
          activeField={activeField}
          activeTab={drawerTab}
          onSwitchTab={handleSwitchDrawerTab}
          onClose={handleCloseDrawer}
          onActivateField={handleActivateField}
          onJumpToNode={handleJumpToNode}
          db={effectiveNodes}
        />
      </div>

      {renderEditorDrawer()}
      {renderAddDialog()}
      {renderSubmitApprovalDialog()}
      {renderInitializeApprovalDialog()}
      {renderApprovalDetailDialog()}

      {/* Submit confirmation dialog */}
      {submitDialogOpen && (
        <div className="lineage-modal-overlay" onClick={() => setSubmitDialogOpen(false)}>
          <div className="lineage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lineage-modal-header">提交血缘修正</div>
            <div className="lineage-modal-body">
              <p>确认提交以下 {pendingChanges.length} 项修改？</p>
              {pendingChanges.length > 0 ? (
                <ul className="lineage-change-list">
                  {pendingChanges.map((change) => (
                    <li key={change.id} className={`lineage-change-item lineage-change-item--${change.type}`}>
                      <span className="lineage-change-badge">{change.type === 'add' ? '新增' : '删除'}</span>
                      {change.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lineage-change-empty">暂无修改内容</p>
              )}
            </div>
            <div className="lineage-modal-footer">
              <Button variant="default" size="sm" onClick={() => setSubmitDialogOpen(false)}>取消</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  // Submit logic: call API, then close
                  console.log('Submitting changes:', pendingChanges);
                  setSubmitDialogOpen(false);
                  setCorrectMode(false);
                  setPendingChanges([]);
                  setConnectionSource(null);
                  alert('血缘修正已提交');
                }}
              >
                确认提交
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
