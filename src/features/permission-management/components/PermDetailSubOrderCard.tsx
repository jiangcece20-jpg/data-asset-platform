import type { PermSubOrder } from './permTypes';

type PermDetailSubOrderCardProps = {
  order: PermSubOrder;
};

export function PermDetailSubOrderCard({ order }: PermDetailSubOrderCardProps) {
  return (
    <div className="permission-management__sub-order-card">
      <div className="permission-management__sub-order-head">
        <strong>{order.assetName}</strong>
        <span className="permission-management__sub-order-secondary">{order.assetDisplay}</span>
      </div>
      {order.rejectReason ? (
        <div className="permission-management__reject-reason">
          <strong>驳回原因：</strong>{order.rejectReason}
        </div>
      ) : null}
    </div>
  );
}
