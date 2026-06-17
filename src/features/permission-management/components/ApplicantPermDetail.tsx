import type { ReactNode } from 'react';
import { Tag } from '../../../components/base/Tag';
import type { Ticket } from '../PermissionManagementPage';
import type { PermSubOrder } from './permTypes';
import { PermDetailSubOrderCard } from './PermDetailSubOrderCard';
import {
  aggregateStatusLabels,
  aggregateStatusTone,
  countChildApprovalStatuses,
  deriveMainTicketAggregateStatus,
} from './ticketAggregateStatus';

type ApplicantPermDetailProps = {
  ticket: Ticket;
  subOrders: PermSubOrder[];
  actions: ReactNode[];
  redTitle?: boolean;
};

export function ApplicantPermDetail({ ticket, subOrders, actions, redTitle = false }: ApplicantPermDetailProps) {
  const statusList = subOrders.map(s => s.status);
  const counts = countChildApprovalStatuses(statusList);
  const aggregateStatus = deriveMainTicketAggregateStatus(statusList, { mainWithdrawn: ticket.status === 'withdrawn' });
  const titleClass = redTitle
    ? 'permission-management__detail-title permission-management__detail-title--red'
    : 'permission-management__detail-title';

  return (
    <section className="permission-management__panel">
      <h2 className={titleClass}>权限申请详情 — {ticket.id}</h2>
      <div className="permission-management__card">
        <div className="permission-management__card-body">
          <div className="permission-management__info-grid">
            <div><div className="permission-management__info-label">申请编号</div><div className="permission-management__info-value primary">{ticket.id}</div></div>
            <div><div className="permission-management__info-label">申请类型</div><div className="permission-management__info-value">{ticket.type}</div></div>
            <div><div className="permission-management__info-label">飞书定义</div><div className="permission-management__info-value">{ticket.feishuDefinition}</div></div>
            <div><div className="permission-management__info-label">批次/实例</div><div className="permission-management__info-value">{ticket.batchId ?? '单实例'} / {ticket.instanceCode}</div></div>
            <div><div className="permission-management__info-label">申请时间</div><div className="permission-management__info-value">{ticket.applyTime}</div></div>
            <div><div className="permission-management__info-label">整体状态</div><div className="permission-management__info-value"><Tag tone={aggregateStatusTone[aggregateStatus]}>{aggregateStatusLabels[aggregateStatus]}</Tag></div></div>
          </div>
          {ticket.reason ? (
            <div className="permission-management__info-block">
              <div className="permission-management__info-label">申请理由</div>
              <div className="permission-management__info-value">{ticket.reason}</div>
            </div>
          ) : null}
          {ticket.dataTable ? (
            <div className="permission-management__info-block">
              <div className="permission-management__info-label">数据表</div>
              <div className="permission-management__info-value">{ticket.dataTable}</div>
            </div>
          ) : null}
          {ticket.usagePeriod ? (
            <div className="permission-management__info-block">
              <div className="permission-management__info-label">使用周期</div>
              <div className="permission-management__info-value">{ticket.usagePeriod}</div>
            </div>
          ) : null}
          {ticket.dataScope ? (
            <div className="permission-management__info-block">
              <div className="permission-management__info-label">数据范围</div>
              <div className="permission-management__info-value">{ticket.dataScope}</div>
            </div>
          ) : null}
          {ticket.permissionJudgment ? (
            <div className="permission-management__info-block">
              <div className="permission-management__info-label">权限申请判断</div>
              <div className="permission-management__info-value">{ticket.permissionJudgment}</div>
            </div>
          ) : null}
          {ticket.transactionOrder ? (
            <div className="permission-management__info-block">
              <div className="permission-management__info-label">交易订单</div>
              <div className="permission-management__info-value">{ticket.transactionOrder}</div>
            </div>
          ) : null}
          <div className="permission-management__info-block">
            <div className="permission-management__info-label">审批进度</div>
            <div className="permission-management__progress-bar">
              <div className="permission-management__progress-segment green" style={{ width: counts.total > 0 ? `${(counts.approved / counts.total) * 100}%` : '0%' }} />
              <div className="permission-management__progress-segment red" style={{ width: counts.total > 0 ? `${(counts.rejected / counts.total) * 100}%` : '0%' }} />
              <div className="permission-management__progress-segment blue" style={{ width: counts.total > 0 ? `${(counts.pending / counts.total) * 100}%` : '0%' }} />
              <div className="permission-management__progress-segment gray" style={{ width: counts.total > 0 ? `${(counts.withdrawn / counts.total) * 100}%` : '0%' }} />
            </div>
            <div className="permission-management__progress-legend">
              <span>已通过 {counts.approved}</span>
              <span>已驳回 {counts.rejected}</span>
              <span>审批中 {counts.pending}</span>
              <span>已撤回 {counts.withdrawn}</span>
            </div>
          </div>
        </div>
      </div>
      <h3>审批流明细（{counts.total} 个子单）</h3>
      {subOrders.map((order, i) => <PermDetailSubOrderCard key={i} order={order} />)}
      <div className="permission-management__detail-actions">
        {actions.map((node, i) => <span key={i}>{node}</span>)}
      </div>
    </section>
  );
}
