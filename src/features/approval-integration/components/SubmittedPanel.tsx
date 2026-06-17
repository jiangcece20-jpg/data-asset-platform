import { useState } from 'react';
import { Button } from '../../../components/base/Button';
import { Tag } from '../../../components/base/Tag';
import { ticketTypes as approvalTicketTypes } from '../approvalData';
import type { ApprovalBatch, ApprovalInstance } from '../approvalData';
import {
  batchAggregateStatusLabels,
  batchAggregateStatusTone,
  deriveBatchAggregateStatus,
  type BatchAggregateStatus,
} from '../approvalAggregateStatus';

type ActionDialog = { task: { id: string; applicant: string; applicantDept: string; nodeName: string; waitingHours: number; assets: string[]; securityLevel: string; permissionType: string; reason: string; subOrderNo: string; instanceCode: string; createdAt: string; directory: string; matchedFlow: string; matchedRoute: string; sourceType: string; sourceSystem: string; ticketType: string }; type: 'approve' | 'reject' } | null;

function toneForStatus(status: string): 'success' | 'warning' | 'danger' | 'gray' | 'blue' {
  if (['enabled', 'passed', 'complete', 'approved', 'effective', 'approved'].includes(status)) return 'success';
  if (['failed', 'rejected', 'sync_error', 'effect_failed', 'rejected'].includes(status)) return 'danger';
  if (['approving', 'effecting', 'incomplete', 'approving'].includes(status)) return 'warning';
  if (status === 'pending_submit') return 'blue';
  return 'gray';
}

const statusLabel: Record<string, string> = {
  pending_submit: '待提交',
  approving: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  sync_error: '同步异常',
};

const effectLabel: Record<string, string> = {
  not_effective: '未生效',
  effecting: '生效中',
  effective: '已生效',
  effect_failed: '生效失败',
};

const sourceTypeOptions = [
  { value: 'warehouse_engine', label: '数仓引擎' },
  { value: 'analytic_db', label: '分析型数据库' },
  { value: 'biz_database', label: '业务数据库' },
  { value: 'report_system', label: '报表系统' },
  { value: 'api_service', label: 'API服务' },
  { value: 'message_stream', label: '消息队列' },
  { value: 'file_storage', label: '文件存储' },
  { value: 'metric_platform', label: '指标平台' },
];

function sourceTypeLabel(value: string) {
  return sourceTypeOptions.find(item => item.value === value)?.label ?? value;
}

export function Stat({ label, value }: { label: string; value: number }) {
  return <div className="approval-v6__stat"><strong>{value}</strong><span>{label}</span></div>;
}

interface SubmittedPanelProps {
  batches: ApprovalBatch[];
  onView: (instance: ApprovalInstance) => void;
  onOpenAction?: (action: ActionDialog) => void;
}

export function SubmittedPanel({ batches, onView }: SubmittedPanelProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | BatchAggregateStatus>('all');
  const [type, setType] = useState('all');

  const filtered = batches.filter(batch => {
    const aggregateStatus = deriveBatchAggregateStatus(batch);
    if (search) {
      const kw = search.toLowerCase();
      if (!batch.batchId.toLowerCase().includes(kw) &&
          !batch.instances.some(i => i.subOrderNo.toLowerCase().includes(kw) || i.assets.some(a => a.toLowerCase().includes(kw)))) {
        return false;
      }
    }
    if (status !== 'all' && aggregateStatus !== status) return false;
    if (type !== 'all' && batch.ticketType !== type) return false;
    return true;
  });

  const stats = {
    total: batches.length,
    approving: batches.filter(item => ['in_progress', 'partial_approved_in_progress'].includes(deriveBatchAggregateStatus(item))).length,
    approved: batches.filter(item => deriveBatchAggregateStatus(item) === 'all_approved').length,
    rejected: batches.filter(item => ['partial_approved_with_rejected_or_cancelled', 'all_rejected_or_cancelled'].includes(deriveBatchAggregateStatus(item))).length,
  };

  return (
    <section>
      <div className="approval-v6__page-header">
        <div>
          <h1>我提交的申请</h1>
          <p>以工单批次为维度，查看所有提交的权限申请及审批进度。</p>
        </div>
        <Button variant="primary" onClick={() => { window.location.hash = 'my?section=cart'; }}>
          + 新建申请
        </Button>
      </div>

      <div className="approval-v6__stats">
        <Stat label="总批次" value={stats.total} />
        <Stat label="审批中" value={stats.approving} />
        <Stat label="已通过" value={stats.approved} />
        <Stat label="已拒绝" value={stats.rejected} />
      </div>

      <div className="approval-v6__toolbar">
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="搜索批次号、子单号、资产名..."
        />
        <select aria-label="聚合状态筛选" value={status} onChange={event => setStatus(event.target.value as 'all' | BatchAggregateStatus)}>
          <option value="all">全部状态</option>
          <option value="in_progress">审批中</option>
          <option value="partial_approved_in_progress">部分通过审批中</option>
          <option value="all_approved">全部通过</option>
          <option value="partial_approved_with_rejected_or_cancelled">部分通过部分拒绝/撤回</option>
          <option value="all_rejected_or_cancelled">全部拒绝/撤回</option>
          <option value="cancelled">已取消</option>
        </select>
        <select value={type} onChange={event => setType(event.target.value)}>
          <option value="all">全部类型</option>
          {approvalTicketTypes.map(item => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="approval-v6__batch-list">
        {filtered.map((batch, index) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            defaultExpanded={index === 0}
            onView={onView}
          />
        ))}
        {filtered.length === 0 && (
          <div className="approval-v6__empty">暂无申请记录</div>
        )}
      </div>
    </section>
  );
}

interface BatchCardProps {
  batch: ApprovalBatch;
  defaultExpanded: boolean;
  onView: (instance: ApprovalInstance) => void;
}

export function BatchCard({ batch, defaultExpanded, onView }: BatchCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const aggregateStatus = deriveBatchAggregateStatus(batch);

  return (
    <article className="approval-v6__batch">
      <button type="button" onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? '⌄' : '›'}</span>
        <div>
          <strong>{batch.batchId}</strong>
          <small>
            {batch.ticketType} · {batch.totalAssets} 个资产 · {batch.instanceCount} 个子单 · {batch.createdAt.split(' ')[0]}
          </small>
        </div>
        <Tag tone={batchAggregateStatusTone[aggregateStatus]}>{batchAggregateStatusLabels[aggregateStatus]}</Tag>
        <Tag tone={toneForStatus(batch.effectStatus)}>{effectLabel[batch.effectStatus]}</Tag>
      </button>

      {expanded && (
        <div>
          {batch.instances.length > 0 ? (
            batch.instances.map(instance => (
              <div key={instance.id} className="approval-v6__instance-row">
                <button type="button" onClick={() => onView(instance)}>
                  {instance.subOrderNo}
                </button>
                <span>{instance.assets.join('、')}</span>
                <small>
                  {instance.directory} · {sourceTypeLabel(instance.sourceType)} / {instance.sourceSystem} · {instance.matchedRoute}
                </small>
                <Tag tone={toneForStatus(instance.status)}>{statusLabel[instance.status]}</Tag>
                <Tag tone={toneForStatus(instance.effectStatus)}>{effectLabel[instance.effectStatus]}</Tag>
                <button type="button" aria-label={`查看 ${instance.subOrderNo}`} onClick={() => onView(instance)}>
                  查看详情
                </button>
              </div>
            ))
          ) : (
            <div className="approval-v6__empty compact">暂无子单详情</div>
          )}
        </div>
      )}
    </article>
  );
}
