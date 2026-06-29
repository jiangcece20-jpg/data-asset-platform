import { Tag } from '../../../components/base/Tag';
import type { ApprovalInstance } from '../approvalData';
import { effectLabel, statusLabel } from '../approvalData';
import { ApprovalDetailTables } from './ApprovalDetailTables';
import '../approval-integration.css';

function toneForStatus(status: string): 'success' | 'warning' | 'danger' | 'gray' | 'blue' {
  if (['enabled', 'passed', 'complete', 'approved', 'effective'].includes(status)) return 'success';
  if (['failed', 'rejected', 'sync_error', 'effect_failed'].includes(status)) return 'danger';
  if (['approving', 'effecting', 'incomplete'].includes(status)) return 'warning';
  if (status === 'pending_submit') return 'blue';
  return 'gray';
}

export function ApprovalInstanceDrawer({ instance, onClose }: { instance: ApprovalInstance; onClose: () => void }) {
  return (
    <div className="approval-v6__drawer-mask" onClick={onClose}>
      <aside className="approval-v6__drawer approval-v6__drawer--approval-detail" aria-label="工单详情" onClick={event => event.stopPropagation()}>
        <header>
          <h2>工单详情</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="approval-v6__instance-detail">
          <div className="approval-v6__instance-header">
            <Tag tone={toneForStatus(instance.status)}>{statusLabel(instance.status)}</Tag>
            <Tag tone={toneForStatus(instance.effectStatus)}>{effectLabel(instance.effectStatus)}</Tag>
            <code>{instance.instanceCode}</code>
          </div>

          <ApprovalDetailTables record={instance} />

          <h3>审批节点</h3>
          {instance.approvers.map(node => (
            <div key={node.nodeId} className="approval-v6__timeline">
              <strong>{node.nodeName}</strong>
              <span>{node.approvers.map(item => item.name).join('、')}{node.mode === 'countersign' ? '（会签）' : ''}</span>
            </div>
          ))}

          <h3>审批时间线</h3>
          {instance.timeline.map((item, index) => (
            <div key={index} className="approval-v6__timeline">
              <strong>{item.action}</strong>
              <span>{item.operator} · {item.time}</span>
              {item.comment ? <em>{item.comment}</em> : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
