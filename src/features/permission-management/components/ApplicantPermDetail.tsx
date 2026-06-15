import type { ReactNode } from 'react';
import { Tag } from '../../../components/base/Tag';
import type { Ticket } from '../PermissionManagementPage';
import type { PermSubOrder } from './permTypes';
import { PermDetailSubOrderCard } from './PermDetailSubOrderCard';

type ApplicantPermDetailProps = {
  ticket: Ticket;
  subOrders: PermSubOrder[];
  actions: ReactNode[];
  redTitle?: boolean;
};

export function ApplicantPermDetail({ ticket, subOrders, actions, redTitle = false }: ApplicantPermDetailProps) {
  const total = subOrders.length;
  const approvedCount = subOrders.filter(s => s.status === 'approved').length;
  const rejectedCount = subOrders.filter(s => s.status === 'rejected').length;
  const pendingCount = subOrders.filter(s => s.status === 'pending').length;
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
            <div><div className="permission-management__info-label">整体状态</div><div className="permission-management__info-value"><Tag tone="warning">部分通过</Tag></div></div>
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
              <div className="permission-management__progress-segment green" style={{ width: total > 0 ? `${(approvedCount / total) * 100}%` : '0%' }} />
              <div className="permission-management__progress-segment red" style={{ width: total > 0 ? `${(rejectedCount / total) * 100}%` : '0%' }} />
              <div className="permission-management__progress-segment blue" style={{ width: total > 0 ? `${(pendingCount / total) * 100}%` : '0%' }} />
            </div>
            <div className="permission-management__progress-legend">
              <span>✅ 已通过 {approvedCount}</span>
              <span>❌ 已驳回 {rejectedCount}</span>
              <span>⏳ 审批中 {pendingCount}</span>
            </div>
          </div>
        </div>
      </div>
      <h3>审批流明细（{total} 个子单）</h3>
      {subOrders.map((order, i) => <PermDetailSubOrderCard key={i} order={order} />)}
      <div className="permission-management__detail-actions">
        {actions.map((node, i) => <span key={i}>{node}</span>)}
      </div>
    </section>
  );
}
