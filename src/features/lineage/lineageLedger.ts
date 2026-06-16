import type {
  LineageApproval,
  LineageChangeSetItem,
  LineageFieldMappingChange,
  LineageNodeData,
  LineageNodeType,
  LineageRelationChange,
} from './lineageApprovalStore';

export type LineageLedgerStatus =
  | 'effective'
  | 'excluded'
  | 'approving_add'
  | 'approving_exclude'
  | 'approving_restore'
  | 'draft_add'
  | 'draft_exclude'
  | 'draft_restore';

export type LineageLedgerStatusFilter = 'effective' | 'all' | 'approving' | 'excluded' | 'draft';
export type LineageLedgerDirectionFilter = 'all' | 'upstream' | 'downstream';
export type LineageLedgerOriginFilter = 'all' | 'auto' | 'manual';

export type LedgerFieldEdge = {
  from: string;
  fromField: string;
  to: string;
  toField: string;
};

export type LineageLedgerFilters = {
  search: string;
  direction: LineageLedgerDirectionFilter;
  origin: LineageLedgerOriginFilter;
  status: LineageLedgerStatusFilter;
};

type LedgerRowBase = {
  key: string;
  direction: 'upstream' | 'downstream';
  sourceId: string;
  sourceName: string;
  sourceDisplay: string;
  targetId: string;
  targetName: string;
  targetDisplay: string;
  origin: 'auto' | 'manual';
  status: LineageLedgerStatus;
  visuallyExcluded: boolean;
  change?: LineageChangeSetItem;
  approval?: LineageApproval;
};

export type RelationLedgerRow = LedgerRowBase & {
  kind: 'relation';
  resourceName: string;
  resourceDisplay: string;
  resourceType: LineageNodeType;
};

export type FieldLedgerRow = LedgerRowBase & {
  kind: 'field';
  sourceField: string;
  targetField: string;
  upResource: string;
  upField: string;
  downResource: string;
  downField: string;
};

export type AnyLedgerRow = RelationLedgerRow | FieldLedgerRow;

export type BuildRelationLedgerRowsInput = {
  centerNodeId: string;
  baseNodes: Record<string, LineageNodeData>;
  effectiveNodes: Record<string, LineageNodeData>;
  approvals: LineageApproval[];
  draftChanges: LineageChangeSetItem[];
};

export type BuildFieldLedgerRowsInput = BuildRelationLedgerRowsInput & {
  baseFieldEdges: LedgerFieldEdge[];
  effectiveFieldEdges: LedgerFieldEdge[];
};

function relationKey(sourceId: string, targetId: string) {
  return `relation:${sourceId}>${targetId}`;
}

function fieldKey(sourceId: string, sourceField: string, targetId: string, targetField: string) {
  return `field:${sourceId}.${sourceField}>${targetId}.${targetField}`;
}

function sortedApprovals(approvals: LineageApproval[]) {
  return [...approvals].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

function changeTouchesCenter(change: LineageChangeSetItem, centerNodeId: string) {
  return change.sourceId === centerNodeId || change.targetId === centerNodeId;
}

function nodeName(nodes: Record<string, LineageNodeData>, nodeId: string, fallback?: string) {
  return nodes[nodeId]?.name ?? fallback ?? nodeId;
}

function nodeDisplay(nodes: Record<string, LineageNodeData>, nodeId: string) {
  return nodes[nodeId]?.display ?? '';
}

function nodeType(nodes: Record<string, LineageNodeData>, nodeId: string): LineageNodeType {
  return nodes[nodeId]?.type ?? 'table';
}

function relationDirection(sourceId: string, targetId: string, centerNodeId: string): 'upstream' | 'downstream' {
  return targetId === centerNodeId ? 'upstream' : 'downstream';
}

function fieldDirection(
  edge: Pick<LedgerFieldEdge, 'from' | 'to'>,
  centerNodeId: string,
  nodes: Record<string, LineageNodeData>,
): 'upstream' | 'downstream' {
  if (edge.to === centerNodeId) return 'upstream';
  if (edge.from === centerNodeId) return 'downstream';
  if (nodes[centerNodeId]?.upstream.includes(edge.from)) return 'upstream';
  return 'downstream';
}

function statusFor(
  action: LineageRelationChange['action'],
  prefix: 'approving' | 'draft',
): LineageLedgerStatus {
  if (action === 'add') return `${prefix}_add`;
  if (action === 'restore') return `${prefix}_restore`;
  return `${prefix}_exclude`;
}

function isVisuallyExcluded(status: LineageLedgerStatus) {
  return status === 'excluded' || status === 'approving_restore' || status === 'draft_restore';
}

function relationRowFromPair({
  sourceId,
  targetId,
  centerNodeId,
  nodes,
  origin,
  status,
  change,
  approval,
}: {
  sourceId: string;
  targetId: string;
  centerNodeId: string;
  nodes: Record<string, LineageNodeData>;
  origin: 'auto' | 'manual';
  status: LineageLedgerStatus;
  change?: LineageChangeSetItem;
  approval?: LineageApproval;
}): RelationLedgerRow {
  const direction = relationDirection(sourceId, targetId, centerNodeId);
  const resourceId = direction === 'upstream' ? sourceId : targetId;
  return {
    key: relationKey(sourceId, targetId),
    kind: 'relation',
    direction,
    sourceId,
    sourceName: nodeName(nodes, sourceId),
    sourceDisplay: nodeDisplay(nodes, sourceId),
    targetId,
    targetName: nodeName(nodes, targetId),
    targetDisplay: nodeDisplay(nodes, targetId),
    resourceName: nodeName(nodes, resourceId),
    resourceDisplay: nodeDisplay(nodes, resourceId),
    resourceType: nodeType(nodes, resourceId),
    origin,
    status,
    visuallyExcluded: isVisuallyExcluded(status),
    change,
    approval,
  };
}

function fieldRowFromPair({
  edge,
  centerNodeId,
  nodes,
  origin,
  status,
  change,
  approval,
}: {
  edge: LedgerFieldEdge;
  centerNodeId: string;
  nodes: Record<string, LineageNodeData>;
  origin: 'auto' | 'manual';
  status: LineageLedgerStatus;
  change?: LineageChangeSetItem;
  approval?: LineageApproval;
}): FieldLedgerRow {
  const direction = fieldDirection(edge, centerNodeId, nodes);
  return {
    key: fieldKey(edge.from, edge.fromField, edge.to, edge.toField),
    kind: 'field',
    direction,
    sourceId: edge.from,
    sourceName: nodeName(nodes, edge.from),
    sourceDisplay: nodeDisplay(nodes, edge.from),
    sourceField: edge.fromField,
    targetId: edge.to,
    targetName: nodeName(nodes, edge.to),
    targetDisplay: nodeDisplay(nodes, edge.to),
    targetField: edge.toField,
    upResource: edge.from,
    upField: edge.fromField,
    downResource: edge.to,
    downField: edge.toField,
    origin,
    status,
    visuallyExcluded: isVisuallyExcluded(status),
    change,
    approval,
  };
}

function relationNodesForChange(change: LineageRelationChange) {
  return { sourceId: change.sourceId, targetId: change.targetId };
}

function fieldEdgeForChange(change: LineageFieldMappingChange): LedgerFieldEdge {
  return {
    from: change.sourceId,
    fromField: change.sourceField,
    to: change.targetId,
    toField: change.targetField,
  };
}

function mergeNodes(
  baseNodes: Record<string, LineageNodeData>,
  effectiveNodes: Record<string, LineageNodeData>,
) {
  return { ...baseNodes, ...effectiveNodes };
}

function relationOrigin(existing: RelationLedgerRow | undefined, action: LineageRelationChange['action']) {
  if (action === 'add') return 'manual';
  return existing?.origin ?? 'auto';
}

function fieldOrigin(existing: FieldLedgerRow | undefined, action: LineageFieldMappingChange['action']) {
  if (action === 'add') return 'manual';
  return existing?.origin ?? 'auto';
}

export function buildRelationLedgerRows({
  centerNodeId,
  baseNodes,
  effectiveNodes,
  approvals,
  draftChanges,
}: BuildRelationLedgerRowsInput): RelationLedgerRow[] {
  const nodes = mergeNodes(baseNodes, effectiveNodes);
  const rows = new Map<string, RelationLedgerRow>();

  const seedRelation = (sourceId: string, targetId: string, origin: 'auto' | 'manual' = 'auto') => {
    if (!nodes[sourceId] || !nodes[targetId]) return;
    rows.set(relationKey(sourceId, targetId), relationRowFromPair({
      sourceId,
      targetId,
      centerNodeId,
      nodes,
      origin,
      status: 'effective',
    }));
  };

  baseNodes[centerNodeId]?.upstream.forEach(sourceId => seedRelation(sourceId, centerNodeId));
  baseNodes[centerNodeId]?.downstream.forEach(targetId => seedRelation(centerNodeId, targetId));
  effectiveNodes[centerNodeId]?.upstream.forEach(sourceId => seedRelation(sourceId, centerNodeId, rows.get(relationKey(sourceId, centerNodeId))?.origin ?? 'auto'));
  effectiveNodes[centerNodeId]?.downstream.forEach(targetId => seedRelation(centerNodeId, targetId, rows.get(relationKey(centerNodeId, targetId))?.origin ?? 'auto'));

  sortedApprovals(approvals)
    .filter(approval => approval.objectId === centerNodeId && approval.status === 'approved')
    .flatMap(approval => approval.changes.map(change => ({ approval, change })))
    .filter((item): item is { approval: LineageApproval; change: LineageRelationChange } => item.change.kind === 'relation' && changeTouchesCenter(item.change, centerNodeId))
    .forEach(({ approval, change }) => {
      const { sourceId, targetId } = relationNodesForChange(change);
      const key = relationKey(sourceId, targetId);
      const existing = rows.get(key);
      const origin = relationOrigin(existing, change.action);
      rows.set(key, relationRowFromPair({
        sourceId,
        targetId,
        centerNodeId,
        nodes,
        origin,
        status: change.action === 'delete' ? 'excluded' : 'effective',
        approval,
      }));
    });

  sortedApprovals(approvals)
    .filter(approval => approval.objectId === centerNodeId && approval.status === 'approving')
    .flatMap(approval => approval.changes.map(change => ({ approval, change })))
    .filter((item): item is { approval: LineageApproval; change: LineageRelationChange } => item.change.kind === 'relation' && changeTouchesCenter(item.change, centerNodeId))
    .forEach(({ approval, change }) => {
      const { sourceId, targetId } = relationNodesForChange(change);
      const key = relationKey(sourceId, targetId);
      const existing = rows.get(key);
      rows.set(key, relationRowFromPair({
        sourceId,
        targetId,
        centerNodeId,
        nodes,
        origin: relationOrigin(existing, change.action),
        status: statusFor(change.action, 'approving'),
        change,
        approval,
      }));
    });

  draftChanges
    .filter((change): change is LineageRelationChange => change.kind === 'relation' && changeTouchesCenter(change, centerNodeId))
    .forEach(change => {
      const { sourceId, targetId } = relationNodesForChange(change);
      const key = relationKey(sourceId, targetId);
      const existing = rows.get(key);
      rows.set(key, relationRowFromPair({
        sourceId,
        targetId,
        centerNodeId,
        nodes,
        origin: relationOrigin(existing, change.action),
        status: statusFor(change.action, 'draft'),
        change,
      }));
    });

  return [...rows.values()].sort((a, b) =>
    a.direction.localeCompare(b.direction) ||
    a.resourceName.localeCompare(b.resourceName),
  );
}

export function buildFieldLedgerRows({
  centerNodeId,
  baseNodes,
  effectiveNodes,
  baseFieldEdges,
  effectiveFieldEdges,
  approvals,
  draftChanges,
}: BuildFieldLedgerRowsInput): FieldLedgerRow[] {
  const nodes = mergeNodes(baseNodes, effectiveNodes);
  const rows = new Map<string, FieldLedgerRow>();
  const touchesCenter = (edge: Pick<LedgerFieldEdge, 'from' | 'to'>) => {
    if (edge.from === centerNodeId || edge.to === centerNodeId) return true;
    const center = nodes[centerNodeId];
    return !!center && (center.upstream.includes(edge.from) || center.downstream.includes(edge.to));
  };
  const seedField = (edge: LedgerFieldEdge, origin: 'auto' | 'manual' = 'auto') => {
    if (!touchesCenter(edge)) return;
    rows.set(fieldKey(edge.from, edge.fromField, edge.to, edge.toField), fieldRowFromPair({
      edge,
      centerNodeId,
      nodes,
      origin,
      status: 'effective',
    }));
  };

  baseFieldEdges.forEach(edge => seedField(edge));
  effectiveFieldEdges.forEach(edge => {
    const key = fieldKey(edge.from, edge.fromField, edge.to, edge.toField);
    seedField(edge, rows.get(key)?.origin ?? 'auto');
  });

  sortedApprovals(approvals)
    .filter(approval => approval.objectId === centerNodeId && approval.status === 'approved')
    .flatMap(approval => approval.changes.map(change => ({ approval, change })))
    .filter((item): item is { approval: LineageApproval; change: LineageFieldMappingChange } => item.change.kind === 'field' && changeTouchesCenter(item.change, centerNodeId))
    .forEach(({ approval, change }) => {
      const edge = fieldEdgeForChange(change);
      const key = fieldKey(edge.from, edge.fromField, edge.to, edge.toField);
      const existing = rows.get(key);
      rows.set(key, fieldRowFromPair({
        edge,
        centerNodeId,
        nodes,
        origin: fieldOrigin(existing, change.action),
        status: change.action === 'delete' ? 'excluded' : 'effective',
        approval,
      }));
    });

  sortedApprovals(approvals)
    .filter(approval => approval.objectId === centerNodeId && approval.status === 'approving')
    .flatMap(approval => approval.changes.map(change => ({ approval, change })))
    .filter((item): item is { approval: LineageApproval; change: LineageFieldMappingChange } => item.change.kind === 'field' && changeTouchesCenter(item.change, centerNodeId))
    .forEach(({ approval, change }) => {
      const edge = fieldEdgeForChange(change);
      const key = fieldKey(edge.from, edge.fromField, edge.to, edge.toField);
      const existing = rows.get(key);
      rows.set(key, fieldRowFromPair({
        edge,
        centerNodeId,
        nodes,
        origin: fieldOrigin(existing, change.action),
        status: statusFor(change.action, 'approving'),
        change,
        approval,
      }));
    });

  draftChanges
    .filter((change): change is LineageFieldMappingChange => change.kind === 'field' && changeTouchesCenter(change, centerNodeId))
    .forEach(change => {
      const edge = fieldEdgeForChange(change);
      const key = fieldKey(edge.from, edge.fromField, edge.to, edge.toField);
      const existing = rows.get(key);
      rows.set(key, fieldRowFromPair({
        edge,
        centerNodeId,
        nodes,
        origin: fieldOrigin(existing, change.action),
        status: statusFor(change.action, 'draft'),
        change,
      }));
    });

  return [...rows.values()].sort((a, b) =>
    a.direction.localeCompare(b.direction) ||
    a.sourceId.localeCompare(b.sourceId) ||
    a.sourceField.localeCompare(b.sourceField),
  );
}

function rowMatchesStatus(row: AnyLedgerRow, status: LineageLedgerStatusFilter) {
  if (status === 'all') return true;
  if (status === 'effective') return row.status === 'effective';
  if (status === 'approving') return row.status.startsWith('approving_');
  if (status === 'draft') return row.status.startsWith('draft_');
  return row.status === 'excluded' || row.status === 'approving_restore' || row.status === 'draft_restore';
}

function statusText(status: LineageLedgerStatus) {
  if (status === 'effective') return '有效';
  if (status === 'excluded') return '已排除';
  if (status.startsWith('approving_')) return '审批中';
  return '待提交';
}

function actionText(status: LineageLedgerStatus) {
  if (status.endsWith('_add')) return '新增';
  if (status.endsWith('_restore')) return '恢复';
  if (status === 'excluded' || status.endsWith('_exclude')) return '排除 删除';
  return '';
}

function searchableText(row: AnyLedgerRow) {
  const common = [
    row.direction === 'upstream' ? '上游' : '下游',
    row.origin === 'auto' ? '自动采集' : '手动添加',
    statusText(row.status),
    actionText(row.status),
    row.sourceId,
    row.sourceName,
    row.sourceDisplay,
    row.targetId,
    row.targetName,
    row.targetDisplay,
  ];
  if (row.kind === 'relation') {
    common.push(row.resourceName, row.resourceDisplay, row.resourceType);
  } else {
    common.push(row.sourceField, row.targetField, row.upResource, row.upField, row.downResource, row.downField);
  }
  return common.filter(Boolean).join(' ').toLowerCase();
}

export function filterLedgerRows<T extends AnyLedgerRow>(rows: T[], filters: LineageLedgerFilters): T[] {
  const keyword = filters.search.trim().toLowerCase();
  return rows.filter(row => {
    if (filters.direction !== 'all' && row.direction !== filters.direction) return false;
    if (filters.origin !== 'all' && row.origin !== filters.origin) return false;
    if (!rowMatchesStatus(row, filters.status)) return false;
    if (keyword && !searchableText(row).includes(keyword)) return false;
    return true;
  });
}
