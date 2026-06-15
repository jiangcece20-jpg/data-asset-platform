import type { ReactNode } from 'react';
import { Tag } from '../../../components/base/Tag';
import { TimelineItem } from './TimelineItem';
import { DiffField } from './DiffField';
import { statusLabels, statusTone, syncTone } from './ticketStatus';
import type { Ticket } from '../PermissionManagementPage';

type TimelineStep = { label: string; time: string; status: 'done' | 'rejected' | 'waiting' };

type ApplicantGovDetailProps = {
  ticket: Ticket;
  actions: ReactNode[];
  timeline: TimelineStep[];
  diff?: { label: string; before: string; after: string };
  redTitle?: boolean;
};

export function ApplicantGovDetail({ ticket, actions, timeline, diff, redTitle = false }: ApplicantGovDetailProps) {
  const titleClass = redTitle
    ? 'permission-management__detail-title permission-management__detail-title--red'
    : 'permission-management__detail-title';
  const hasDiff = !!diff && !!diff.before.trim() && !!diff.after.trim();

  return (
    <section className="permission-management__panel">
      <h2 className={titleClass}>{ticket.type}详情 — {ticket.id}</h2>
      <div className="permission-management__card">
        <div className="permission-management__card-body">
          <div className="permission-management__info-grid">
            <div><div className="permission-management__info-label">审批编号</div><div className="permission-management__info-value primary">{ticket.id}</div></div>
            <div><div className="permission-management__info-label">操作类型</div><div className="permission-management__info-value"><Tag tone="blue">{ticket.type}</Tag></div></div>
            <div><div className="permission-management__info-label">飞书定义</div><div className="permission-management__info-value">{ticket.feishuDefinition}</div></div>
            <div><div className="permission-management__info-label">飞书实例</div><div className="permission-management__info-value">{ticket.instanceCode}</div></div>
            <div><div className="permission-management__info-label">申请时间</div><div className="permission-management__info-value">{ticket.applyTime}</div></div>
            <div><div className="permission-management__info-label">状态</div><div className="permission-management__info-value"><Tag tone={statusTone(ticket.status)}>{statusLabels[ticket.status]}</Tag></div></div>
            <div><div className="permission-management__info-label">审批人</div><div className="permission-management__info-value">张三（数据管理员）</div></div>
            <div><div className="permission-management__info-label">同步状态</div><div className="permission-management__info-value"><Tag tone={syncTone(ticket.syncMode)}>{ticket.syncText}</Tag></div></div>
          </div>
        </div>
      </div>
      <div className="permission-management__card">
        <div className="permission-management__card-header"><strong>操作对象</strong></div>
        <div className="permission-management__card-body">
          <div className="permission-management__info-grid">
            <div><div className="permission-management__info-label">资产名称</div><div className="permission-management__info-value"><strong>{ticket.assetName}</strong><br /><span className="permission-management__sub-order-secondary">{ticket.assetDisplay}</span></div></div>
            <div><div className="permission-management__info-label">资产类型</div><div className="permission-management__info-value">{ticket.assetType}</div></div>
          </div>
        </div>
      </div>
      <div className="permission-management__card">
        <div className="permission-management__card-header"><strong>审批时间线</strong></div>
        <div className="permission-management__card-body">
          <div className="permission-management__timeline">
            {timeline.map((step, i) => <TimelineItem key={i} label={step.label} time={step.time} status={step.status} />)}
          </div>
        </div>
      </div>
      {hasDiff && diff ? (
        <div className="permission-management__card">
          <div className="permission-management__card-header"><strong>变更对比</strong></div>
          <div className="permission-management__card-body">
            <DiffField label={diff.label} before={diff.before} after={diff.after} />
          </div>
        </div>
      ) : null}
      <div className="permission-management__detail-actions">
        {actions.map((node, i) => <span key={i}>{node}</span>)}
      </div>
    </section>
  );
}
