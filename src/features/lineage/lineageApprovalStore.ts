import { useSyncExternalStore } from 'react';
import type { ApprovalBatch, ApprovalInstance, PendingTask, SecurityLevel, SourceSystem, SourceType } from '../approval-integration/approvalData';

export type LineageNodeType = 'table' | 'view' | 'api' | 'report' | 'metric' | 'label';

export type LineageField = {
  name: string;
  type: string;
  comment: string;
};

export type LineageNodeData = {
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

export type LineageApprovalStatus = 'approving' | 'approved' | 'rejected' | 'withdrawn';

export type LineageRelationChange = {
  id: string;
  kind: 'relation';
  action: 'add' | 'delete';
  direction: 'upstream' | 'downstream';
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  reason?: string;
};

export type LineageFieldMappingChange = {
  id: string;
  kind: 'field';
  action: 'add' | 'delete';
  direction: 'upstream' | 'downstream';
  sourceId: string;
  sourceName: string;
  sourceField: string;
  targetId: string;
  targetName: string;
  targetField: string;
  reason?: string;
};

export type LineageChangeSetItem = LineageRelationChange | LineageFieldMappingChange;
export type LineageCorrectionMode = 'manual' | 'initialize';
export type LineageEffectMode = 'incremental' | 'full_rebuild';

export type SubmitLineageApprovalPayload = {
  objectId: string;
  objectName: string;
  objectDisplay: string;
  catalog: string;
  securityLevel: SecurityLevel;
  reason: string;
  changes: LineageChangeSetItem[];
  correctionMode?: LineageCorrectionMode;
  effectMode?: LineageEffectMode;
  riskConfirmed?: boolean;
  initStats?: { add: number; delete: number; keep: number };
};

export type LineageApproval = SubmitLineageApprovalPayload & {
  id: string;
  approvalNo: string;
  instanceCode: string;
  applicant: string;
  applicantDept: string;
  submittedAt: string;
  status: LineageApprovalStatus;
  currentNode: string;
  matchedFlow: string;
  matchedRoute: string;
  sourceType: SourceType;
  sourceSystem: SourceSystem;
  rejectedReason?: string;
  withdrawnAt?: string;
  appliedAt?: string;
};

type Listener = () => void;

let approvals: LineageApproval[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return approvals;
}

function nowText() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextApprovalNo() {
  return `LC-${Date.now().toString().slice(-10)}`;
}

export function useLineageApprovals() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function getLineageApprovals() {
  return approvals;
}

export function resetLineageApprovalStore() {
  approvals = [];
  emit();
}

export function getActiveLineageApproval(objectId: string) {
  return approvals.find(item => item.objectId === objectId && item.status === 'approving');
}

export function submitLineageApproval(payload: SubmitLineageApprovalPayload) {
  if (getActiveLineageApproval(payload.objectId)) {
    throw new Error('当前对象已有血缘修正审批中');
  }
  const approvalNo = nextApprovalNo();
  const approval: LineageApproval = {
    ...payload,
    correctionMode: payload.correctionMode ?? 'manual',
    effectMode: payload.effectMode ?? 'incremental',
    id: `lineage-approval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    approvalNo,
    instanceCode: approvalNo.replace('LC-', 'LIN-INS-'),
    applicant: '李治理',
    applicantDept: '数据治理部',
    submittedAt: nowText(),
    status: 'approving',
    currentNode: '直接上级审批',
    matchedFlow: '血缘修正_统一版',
    matchedRoute: '标准血缘修正（兜底）',
    sourceType: 'warehouse_engine',
    sourceSystem: 'Hive',
  };
  approvals = [approval, ...approvals];
  emit();
  return approval;
}

export function withdrawLineageApproval(approvalId: string) {
  approvals = approvals.map(item => item.id === approvalId ? { ...item, status: 'withdrawn', withdrawnAt: nowText() } : item);
  emit();
}

export function approveLineageApproval(approvalId: string) {
  approvals = approvals.map(item => item.id === approvalId ? { ...item, status: 'approved', appliedAt: nowText(), currentNode: '审批完成' } : item);
  emit();
}

export function rejectLineageApproval(approvalId: string, reason: string) {
  approvals = approvals.map(item => item.id === approvalId ? { ...item, status: 'rejected', rejectedReason: reason, currentNode: '审批完成' } : item);
  emit();
}

export function applyLineageChangeSet(approvalId: string) {
  const approval = approvals.find(item => item.id === approvalId && item.status === 'approved');
  return approval?.changes ?? [];
}

export function lineageApprovalSummary(approval: LineageApproval) {
  const addUpstream = approval.changes.filter(item => item.kind === 'relation' && item.action === 'add' && item.direction === 'upstream').length;
  const addDownstream = approval.changes.filter(item => item.kind === 'relation' && item.action === 'add' && item.direction === 'downstream').length;
  const deleteUpstream = approval.changes.filter(item => item.kind === 'relation' && item.action === 'delete' && item.direction === 'upstream').length;
  const deleteDownstream = approval.changes.filter(item => item.kind === 'relation' && item.action === 'delete' && item.direction === 'downstream').length;
  const fieldFix = approval.changes.filter(item => item.kind === 'field').length;
  return { addUpstream, addDownstream, deleteUpstream, deleteDownstream, fieldFix, total: approval.changes.length };
}

export function lineageApprovalSummaryText(approval: LineageApproval) {
  const summary = lineageApprovalSummary(approval);
  const modeText = approval.correctionMode === 'initialize' ? '初始化血缘 / 全量重建：' : '';
  return `${modeText}新增上游 ${summary.addUpstream}、新增下游 ${summary.addDownstream}、删除上游 ${summary.deleteUpstream}、删除下游 ${summary.deleteDownstream}、字段映射修正 ${summary.fieldFix}`;
}

function statusToApplyStatus(status: LineageApprovalStatus): 'pending' | 'approved' | 'rejected' | 'withdrawn' {
  if (status === 'approving') return 'pending';
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'withdrawn';
}

function approvalTimelineStatus(status: LineageApprovalStatus): 'done' | 'rejected' | 'waiting' {
  if (status === 'rejected') return 'rejected';
  if (status === 'approving') return 'waiting';
  return 'done';
}

export function lineageApprovalsToMyApplyItems() {
  return approvals.map(approval => ({
    id: approval.id,
    assetName: approval.objectName,
    assetDisplay: approval.objectDisplay,
    type: 'table' as const,
    sourceLabel: '数仓引擎',
    reason: approval.reason,
    applyTime: approval.submittedAt,
    status: statusToApplyStatus(approval.status),
    ticketId: approval.approvalNo,
    ticketType: '血缘修正',
    subOrders: [{
      assetName: approval.objectName,
      assetDisplay: approval.objectDisplay,
      status: statusToApplyStatus(approval.status),
      timeline: [{
        label: approval.status === 'approving' ? approval.currentNode : `血缘修正${approval.status === 'approved' ? '已通过' : approval.status === 'rejected' ? '已拒绝' : '已撤回'}`,
        time: approval.status === 'approving' ? '等待审批中...' : approval.appliedAt ?? approval.withdrawnAt ?? approval.submittedAt,
        status: approvalTimelineStatus(approval.status),
      }],
    }],
  }));
}

export function lineageApprovalsToPendingTasks(): PendingTask[] {
  return approvals.filter(item => item.status === 'approving').map(approval => ({
    id: approval.id,
    applicant: approval.applicant,
    applicantDept: approval.applicantDept,
    nodeName: approval.currentNode,
    waitingHours: 1,
    assets: [approval.objectDisplay],
    securityLevel: approval.securityLevel,
    permissionType: lineageApprovalSummaryText(approval),
    directory: approval.catalog,
    sourceType: approval.sourceType,
    sourceSystem: approval.sourceSystem,
    matchedFlow: approval.matchedFlow,
    matchedRoute: approval.matchedRoute,
    reason: approval.reason,
    subOrderNo: approval.approvalNo,
    instanceCode: approval.instanceCode,
    createdAt: approval.submittedAt,
    ticketType: '血缘修正',
    lineageApproval: approval,
  }));
}

export function lineageApprovalsToBatches(): ApprovalBatch[] {
  return approvals.map(approval => ({
    id: `batch-${approval.id}`,
    batchId: approval.approvalNo,
    ticketType: '血缘修正',
    totalAssets: 1,
    instanceCount: 1,
    createdAt: approval.submittedAt,
    status: approval.status === 'approving' ? 'approving' : approval.status === 'approved' ? 'approved' : approval.status === 'rejected' ? 'rejected' : 'cancelled',
    effectStatus: approval.status === 'approved' ? 'effective' : 'not_effective',
    instances: [{
      id: approval.id,
      subOrderNo: approval.approvalNo,
      instanceCode: approval.instanceCode,
      feishuUrl: `https://example.feishu.cn/approval/${approval.instanceCode}`,
      status: approval.status === 'approving' ? 'approving' : approval.status === 'approved' ? 'approved' : approval.status === 'rejected' ? 'rejected' : 'cancelled',
      effectStatus: approval.status === 'approved' ? 'effective' : 'not_effective',
      assets: [approval.objectDisplay],
      securityLevel: approval.securityLevel,
      permissionType: lineageApprovalSummaryText(approval),
      expireDate: '永久',
      directory: approval.catalog,
      sourceType: approval.sourceType,
      sourceSystem: approval.sourceSystem,
      matchedFlow: approval.matchedFlow,
      matchedRoute: approval.matchedRoute,
      reason: approval.reason,
      ticketType: '血缘修正',
      approvers: [
        { nodeId: 'manager_node', nodeName: '直接上级', mode: 'single', approvers: [{ name: '王经理', openId: 'ou_manager_001' }] },
        { nodeId: 'security_admin_node', nodeName: 'S4/S5 安全管理员', mode: 'single', approvers: [{ name: '周安全', openId: 'ou_security_001' }] },
        { nodeId: 'data_admin_node', nodeName: 'S4/S5 数据管理员', mode: 'single', approvers: [{ name: '李治理', openId: 'ou_data_001' }] },
        { nodeId: 'cto_node', nodeName: 'CTO', mode: 'single', approvers: [{ name: '郑技术', openId: 'ou_cto_001' }] },
      ],
      timeline: [
        { action: '提交血缘修正', operator: approval.applicant, time: approval.submittedAt, status: 'system' },
        { action: approval.status === 'approving' ? '等待直接上级审批' : `审批${approval.status === 'approved' ? '通过' : approval.status === 'rejected' ? '拒绝' : '撤回'}`, operator: approval.status === 'approving' ? '王经理' : '审批系统', time: approval.appliedAt ?? approval.withdrawnAt ?? approval.submittedAt, status: approval.status === 'approved' ? 'approved' : approval.status === 'rejected' ? 'rejected' : approval.status === 'approving' ? 'pending' : 'system', comment: approval.rejectedReason },
      ],
    } as ApprovalInstance],
  }));
}
