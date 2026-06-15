import type { ReactNode } from 'react';
import { TimelineItem } from './TimelineItem';

type TimelineStep = { label: string; time: string; status: 'done' | 'rejected' | 'waiting' };

type ApplicantTransferDetailProps = {
  ticket: { id: string };
  transferor: string;
  assignee: string;
  asset: string;
  applyTime: string;
  reason: string;
  timeline: TimelineStep[];
  actions: ReactNode[];
  redTitle?: boolean;
};

export function ApplicantTransferDetail({ ticket, transferor, assignee, asset, applyTime, reason, timeline, actions, redTitle = false }: ApplicantTransferDetailProps) {
  const titleClass = redTitle
    ? 'permission-management__detail-title permission-management__detail-title--red'
    : 'permission-management__detail-title';
  return (
    <section className="permission-management__panel">
      <h2 className={titleClass}>转交负责人详情 — {ticket.id}</h2>
      <div className="permission-management__card">
        <div className="permission-management__card-body">
          <div className="permission-management__info-grid">
            <div><div className="permission-management__info-label">转交人</div><div className="permission-management__info-value">{transferor}</div></div>
            <div><div className="permission-management__info-label">申请时间</div><div className="permission-management__info-value">{applyTime}</div></div>
            <div><div className="permission-management__info-label">资产</div><div className="permission-management__info-value">{asset}</div></div>
            <div><div className="permission-management__info-label">被转交人</div><div className="permission-management__info-value primary">{assignee}</div></div>
            <div style={{ gridColumn: '1/-1' }}><div className="permission-management__info-label">转交原因</div><div className="permission-management__info-value">{reason}</div></div>
          </div>
        </div>
      </div>
      <div className="permission-management__card">
        <div className="permission-management__card-header"><strong>审批进度</strong></div>
        <div className="permission-management__card-body">
          <div className="permission-management__timeline">
            {timeline.map((step, i) => <TimelineItem key={i} label={step.label} time={step.time} status={step.status} />)}
          </div>
        </div>
      </div>
      <div className="permission-management__detail-actions">
        {actions.map((node, i) => <span key={i}>{node}</span>)}
      </div>
    </section>
  );
}
