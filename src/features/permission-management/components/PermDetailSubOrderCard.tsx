import { useState } from 'react';
import { Button } from '../../../components/base/Button';
import { Tag } from '../../../components/base/Tag';
import type { PermSubOrder } from './permTypes';
import { TimelineItem } from './TimelineItem';
import { subOrderStatusTag } from './ticketStatus';
import { buildReapplyHash } from './buildReapplyHash';

type PermDetailSubOrderCardProps = {
  order: PermSubOrder;
};

export function PermDetailSubOrderCard({ order }: PermDetailSubOrderCardProps) {
  const [withdrawn, setWithdrawn] = useState(false);
  if (withdrawn) {
    return (
      <div className="permission-management__sub-order status-cancelled">
        <div className="permission-management__sub-order-header">
          <div><Tag tone="gray">已撤回</Tag> <strong>子单已撤回</strong></div>
        </div>
      </div>
    );
  }
  return (
    <div className={`permission-management__sub-order status-${order.status}`}>
      <div className="permission-management__sub-order-header">
        <div>
          {subOrderStatusTag(order.status)}
          <strong>{order.assetName}</strong>
          {order.assetDisplay ? <span className="permission-management__sub-order-secondary">{order.assetDisplay}</span> : null}
        </div>
        {order.assetTypeTag ? <Tag tone="blue">{order.assetTypeTag}</Tag> : null}
      </div>
      <div className="permission-management__sub-order-body">
        <div className="permission-management__timeline">
          {order.timeline.map((t, i) => <TimelineItem key={i} label={t.label} time={t.time} status={t.status} />)}
        </div>
        {order.rejectReason ? (
          <div className="permission-management__reject-reason">
            <strong>驳回原因：</strong>{order.rejectReason}
          </div>
        ) : null}
        {order.status === 'pending' ? <Button size="sm" onClick={() => setWithdrawn(true)}>撤回</Button> : null}
        {order.status === 'rejected' ? (
          <Button variant="primary" size="sm" onClick={() => { window.location.hash = buildReapplyHash(order.assetName); }}>重新申请</Button>
        ) : null}
      </div>
    </div>
  );
}
