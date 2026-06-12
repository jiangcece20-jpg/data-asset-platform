import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Tag } from '../../components/base/Tag';
import { Button } from '../../components/base/Button';
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

function isUpstreamOf(nodeId: string, targetId: string, visited = new Set<string>()): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);
  const node = NODES_DB[nodeId];
  if (!node) return false;
  if (node.downstream.includes(targetId)) return true;
  return node.downstream.some((d) => isUpstreamOf(d, targetId, visited));
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
): { nodes: LineageNodeData[]; edges: LineageEdge[] } {
  const center = NODES_DB[centerNodeId];
  if (!center) return { nodes: [], edges: [] };

  const visibleIds = new Set<string>([centerNodeId]);
  const edges: LineageEdge[] = [];

  function expand(nodeId: string, dir: 'up' | 'down', d: number) {
    if (d <= 0) return;
    const node = NODES_DB[nodeId];
    if (!node) return;
    const neighbors = dir === 'up' ? node.upstream : node.downstream;
    neighbors.forEach((nid) => {
      if (!NODES_DB[nid]) return;
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
    const node = NODES_DB[nid];
    if (!node) return;
    const up = isUpstreamOf(nid, centerNodeId);
    if (up && scope !== 'downstream') {
      node.upstream.forEach((uid) => {
        if (!NODES_DB[uid]) return;
        visibleIds.add(uid);
        edges.push({ from: uid, to: nid, type: 'table' });
      });
    } else if (!up && scope !== 'upstream') {
      node.downstream.forEach((did) => {
        if (!NODES_DB[did]) return;
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
    nodes: [...visibleIds].map((id) => NODES_DB[id]).filter(Boolean),
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
): { positions: Record<string, NodePosition>; colMap: Record<string, number> } {
  const colMap: Record<string, number> = {};
  colMap[centerNodeId] = 0;

  const nodeSet = new Set(nodes.map((n) => n.id));

  function assignCol(nodeId: string, col: number, dir: 'up' | 'down' | 'all', visited = new Set<string>()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    colMap[nodeId] = col;
    const node = NODES_DB[nodeId];
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
        const node = NODES_DB[nid];
        return sum + getNodeRenderHeight(node!, expandedNodes.has(nid), fieldPageMap[nid] ?? 0);
      }, 0) +
      Math.max(0, colNodeIds.length - 1) * ROW_GAP;
    const startY = canvasH / 2 - totalH / 2;
    let currentY = startY;
    colNodeIds.forEach((nid) => {
      const node = NODES_DB[nid]!;
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
}) {
  const totalFields = node.fields.length;
  const totalPages = Math.ceil(totalFields / FIELDS_PER_PAGE);
  const visibleFields = node.fields.slice(fieldPage * FIELDS_PER_PAGE, (fieldPage + 1) * FIELDS_PER_PAGE);
  const hasFields = nodeHasFieldSection(node);

  const upCount = node.upstream.filter((uid) => NODES_DB[uid]).length;
  const downCount = node.downstream.filter((did) => NODES_DB[did]).length;
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
}: {
  edges: LineageEdge[];
  positions: Record<string, NodePosition>;
  activeField: ActiveField | null;
  expandedNodes: Set<string>;
  fieldPageMap: Record<string, number>;
}) {
  const activeFieldEdges = useMemo(() => {
    if (!activeField) return [];
    return FIELD_EDGES.filter(
      (fe) =>
        (fe.from === activeField.nodeId && fe.fromField === activeField.fieldName) ||
        (fe.to === activeField.nodeId && fe.toField === activeField.fieldName),
    );
  }, [activeField]);

  const hasFieldEdges = activeFieldEdges.length > 0;

  function getVisibleFieldIndex(nodeId: string, fieldName: string): number {
    const node = NODES_DB[nodeId];
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
        const fromNode = NODES_DB[e.from];
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
}: {
  node: LineageNodeData | null;
  activeField: ActiveField | null;
  activeTab: string;
  onSwitchTab: (tab: string) => void;
  onClose: () => void;
  onActivateField: (nodeId: string, fieldName: string) => void;
  onJumpToNode: (id: string) => void;
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
          {validTab === 'lineage' && <DrawerLineageTab node={node} onJumpToNode={onJumpToNode} />}
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
}: {
  node: LineageNodeData;
  onJumpToNode: (id: string) => void;
}) {
  const upList = node.upstream.filter((id) => NODES_DB[id]);
  const downList = node.downstream.filter((id) => NODES_DB[id]);

  return (
    <>
      <div className="detail-lineage-panel-section">
        <div className="detail-lineage-panel-title">上游 ({upList.length})</div>
        {upList.length > 0 ? (
          upList.map((id) => {
            const related = NODES_DB[id];
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
            const related = NODES_DB[id];
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

/* ─── Main Component ──────────────────────────── */

export function LineagePage() {
  const [centerNodeId, setCenterNodeId] = useState('dwd_order_detail');
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

  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Build visible nodes and edges
  const { nodes, edges } = useMemo(
    () => buildVisibleNodes(centerNodeId, scope, depth, expandedNodes),
    [centerNodeId, scope, depth, expandedNodes],
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
    () => layoutNodes(nodes, centerNodeId, expandedNodes, fieldPageMap, canvasSize.w, canvasSize.h),
    [nodes, centerNodeId, expandedNodes, fieldPageMap, canvasSize],
  );

  // Compute linked fields per node for highlighting
  const linkedFieldsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    nodes.forEach((n) => {
      map[n.id] = new Set<string>();
    });
    if (activeField) {
      FIELD_EDGES.forEach((fe) => {
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
  }, [activeField, nodes]);

  // Selected node data
  const selectedNode = selectedNodeId ? NODES_DB[selectedNodeId] ?? null : null;

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
      const node = NODES_DB[nodeId];
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
      FIELD_EDGES.forEach((fe) => {
        if (fe.from === nodeId && fe.fromField === fieldName) newExpanded.add(fe.to);
        if (fe.to === nodeId && fe.toField === fieldName) newExpanded.add(fe.from);
      });
      newExpanded.add(nodeId);
      setExpandedNodes(newExpanded);
      return { nodeId, fieldName };
    });
  }, [expandedNodes]);

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
    if (!NODES_DB[nodeId]) return;
    setCenterNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setActiveField(null);
    setExpandedNodes(new Set());
    setFieldPageMap({});
    setDrawerTab('lineage');
  }, []);

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
      const sourceNode = NODES_DB[connectionSource];
      const targetNode = NODES_DB[nodeId];
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
  }, [correctMode, connectionSource]);

  // Correct mode: handle right-click for marking edge deletion
  const handleCorrectModeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    if (!correctMode) return;
    const sourceNode = NODES_DB[nodeId];
    if (!sourceNode) return;
    // Find an upstream edge to mark for deletion
    const existingUpstream = sourceNode.upstream.find((uid) => NODES_DB[uid]);
    if (existingUpstream) {
      const upstreamNode = NODES_DB[existingUpstream];
      const newChange: LineageChange = {
        id: `delete-${existingUpstream}-${nodeId}-${Date.now()}`,
        type: 'delete',
        sourceId: existingUpstream,
        targetId: nodeId,
        description: `删除连线：${upstreamNode?.display} → ${sourceNode.display}`,
      };
      setPendingChanges((prev) => [...prev, newChange]);
    }
  }, [correctMode]);

  // Correct mode: remove a pending change
  const handleRemoveChange = useCallback((changeId: string) => {
    setPendingChanges((prev) => prev.filter((c) => c.id !== changeId));
  }, []);

  return (
    <section className={`lineage-page${correctMode ? ' lineage-page--correct-mode' : ''}`} id="page-lineage-wrap">
      {/* Correct mode banner */}
      {correctMode && (
        <div className="lineage-page__correct-banner">
          修正模式：点击节点选择源 → 点击目标节点建立连线 → 右键节点标记删除连线</div>
      )}
      {/* Toolbar */}
      <div className="lineage-toolbar">
        <button className="btn btn-default btn-sm" onClick={handleBack}>
          <BackIcon /> 返回
        </button>
        <div className="lineage-toolbar-sep" />
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
          {correctMode ? (
            <>
              <Button variant="primary" size="sm" onClick={() => setSubmitDialogOpen(true)} disabled={pendingChanges.length === 0}>
                <CheckIcon /> 提交修正
              </Button>
              <Button variant="default" size="sm" onClick={() => { setCorrectMode(false); setPendingChanges([]); setConnectionSource(null); }}>
                取消
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={() => setCorrectMode(true)}>
              <EditIcon /> 修正血缘
            </Button>
          )}
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
        />
      </div>

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
