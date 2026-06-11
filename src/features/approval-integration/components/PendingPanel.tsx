import { useState } from 'react';
import { Button } from '../../../components/base/Button';
import { Tag } from '../../../components/base/Tag';
import { Modal } from '../../../components/feedback/Modal';
import type { PendingTask } from '../approvalData';
// re-export for consumers
export type { PendingTask };

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

export type ActionDialog = { task: PendingTask; type: 'approve' | 'reject' } | null;

interface PendingPanelProps {
  tasks: PendingTask[];
  onOpenAction: (action: ActionDialog) => void;
  onFeishu?: () => void;
}

export function PendingPanel({ tasks, onOpenAction, onFeishu }: PendingPanelProps) {
  const flash = (msg: string) => { void msg; };

  if (tasks.length === 0) {
    return (
      <section>
        <div className="approval-v6__page-header">
          <div>
            <h1>待我审批</h1>
            <p>可在平台直接审批通过或拒绝，结果将同步至飞书审批实例。</p>
          </div>
        </div>
        <div className="approval-v6__empty">暂无待审批任务</div>
      </section>
    );
  }

  return (
    <section>
      <div className="approval-v6__page-header">
        <div>
          <h1>待我审批</h1>
          <p>可在平台直接审批通过或拒绝，结果将同步至飞书审批实例。</p>
        </div>
        <div className="approval-v6__pending-count">{tasks.length} 条待处理</div>
      </div>

      <div className="approval-v6__pending-list">
        {tasks.map(task => (
          <PendingTaskCard
            key={task.id}
            task={task}
            onOpenAction={onOpenAction}
            onFeishu={onFeishu ?? (() => flash('跳转飞书审批（演示）'))}
          />
        ))}
      </div>
    </section>
  );
}

interface PendingTaskCardProps {
  task: PendingTask;
  onOpenAction: (action: ActionDialog) => void;
  onFeishu: () => void;
}

export function PendingTaskCard({ task, onOpenAction, onFeishu }: PendingTaskCardProps) {
  const visibleAssets = task.assets.slice(0, 4);
  const extraCount = task.assets.length - visibleAssets.length;
  const ticketType = task.ticketType ?? '权限申请';

  return (
    <article className="approval-v6__pending-card">
      <div className="approval-v6__pending-card-body">
        <div className="approval-v6__pending-meta">
          <strong>{task.applicant}</strong>
          <Tag tone="gray">{task.applicantDept}</Tag>
          <Tag tone="blue">{task.nodeName}</Tag>
          <span>等待 {task.waitingHours}h</span>
          <Tag tone="warning">{ticketType}</Tag>
        </div>

        {/* 资产标签（所有类型通用） */}
        <div className="approval-v6__chips">
          {visibleAssets.map(asset => (
            <span key={asset} className="approval-v6__chip">{asset}</span>
          ))}
          {extraCount > 0 && (
            <span className="approval-v6__chip approval-v6__chip--more">+{extraCount}</span>
          )}
          <span className="approval-v6__chip">{task.securityLevel}</span>
          {ticketType !== '目录修改' && ticketType !== '血缘修正' && ticketType !== '下架审批' && (
            <span className="approval-v6__chip">{task.permissionType}</span>
          )}
          <span className="approval-v6__chip">{sourceTypeLabel(task.sourceType)} / {task.sourceSystem}</span>
        </div>

        {/* 差异化信息区 */}
        {ticketType === '目录修改' && (
          <div className="approval-v6__diff-block approval-v6__diff-block--catalog">
            <span className="approval-v6__diff-label">目录变更</span>
            <span className="approval-v6__diff-from">{task.directory}</span>
            <span className="approval-v6__diff-arrow">→</span>
            <span className="approval-v6__diff-to">{task.matchedRoute}</span>
          </div>
        )}
        {ticketType === '负责人交接' && (
          <div className="approval-v6__diff-block approval-v6__diff-block--handover">
            <span className="approval-v6__diff-label">交接类型</span>
            <span className="approval-v6__diff-type">{task.permissionType}</span>
            <span className="approval-v6__diff-label">原负责人</span>
            <span className="approval-v6__diff-from">{task.applicantDept}</span>
            <span className="approval-v6__diff-arrow">→</span>
            <span className="approval-v6__diff-to">{task.matchedRoute}</span>
          </div>
        )}
        {ticketType === '血缘修正' && (
          <div className="approval-v6__diff-block approval-v6__diff-block--lineage">
            <span className="approval-v6__diff-label">血缘变更</span>
            <code className="approval-v6__lineage-change">{task.assets.join(' ')}</code>
          </div>
        )}
        {ticketType === '下架审批' && (
          <div className="approval-v6__warning-block">
            <span>⚠️ 下架后将退出正式资产目录，影响下游依赖方</span>
          </div>
        )}

        <p className="approval-v6__pending-reason">
          <b>申请理由：</b>{task.reason}
        </p>

        <div className="approval-v6__pending-footer">
          <small>{task.directory}</small>
          <small>·</small>
          <small>{task.matchedFlow}</small>
          <small>·</small>
          <small>{task.matchedRoute}</small>
        </div>
        <div className="approval-v6__pending-meta-row">
          <small>{task.subOrderNo}</small>
          <small>·</small>
          <small>{task.instanceCode}</small>
          <small>·</small>
          <small>{task.createdAt}</small>
        </div>
      </div>

      <div className="approval-v6__pending-actions">
        <Button size="sm" variant="primary" onClick={() => onOpenAction({ task, type: 'approve' })}>
          通过
        </Button>
        <Button size="sm" variant="danger" onClick={() => onOpenAction({ task, type: 'reject' })}>
          拒绝
        </Button>
        <button type="button" onClick={onFeishu}>飞书</button>
      </div>
    </article>
  );
}

interface ApprovalActionModalProps {
  action: Exclude<ActionDialog, null>;
  onClose: () => void;
  onSubmit: (task: PendingTask, type: 'approve' | 'reject', comment: string) => void;
}

export function ApprovalActionModal({ action, onClose, onSubmit }: ApprovalActionModalProps) {
  const [comment, setComment] = useState('');

  return (
    <Modal open title={action.type === 'approve' ? '确认审批通过' : '确认审批拒绝'} onClose={onClose}>
      <div className="approval-v6__form">
        <div className="approval-v6__summary">
          <div>
            <span>申请人</span>
            <strong>{action.task.applicant}</strong>
          </div>
          <div>
            <span>申请资产</span>
            <strong>{action.task.assets.join('、')}</strong>
          </div>
          <div>
            <span>安全等级</span>
            <strong>{action.task.securityLevel}</strong>
          </div>
          <div>
            <span>当前节点</span>
            <strong>{action.task.nodeName}</strong>
          </div>
        </div>

        <label>
          审批意见{action.type === 'reject' ? ' *' : ''}
          <textarea
            value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder={
              action.type === 'approve'
                ? '可选，填写审批意见'
                : '必填，请说明拒绝原因'
            }
          />
        </label>

        <div className="approval-v6__modal-actions">
          <Button onClick={onClose}>取消</Button>
          <Button
            variant={action.type === 'approve' ? 'primary' : 'danger'}
            onClick={() => onSubmit(action.task, action.type, comment)}
          >
            {action.type === 'approve' ? '确认通过' : '确认拒绝'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
