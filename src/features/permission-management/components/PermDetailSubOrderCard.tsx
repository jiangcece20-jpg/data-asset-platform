type PermSubOrder = {
  assetName: string;
  assetDisplay?: string;
  status: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  rejectReason?: string;
  timeline: Array<{ label: string; time: string; status: 'done' | 'rejected' | 'waiting' }>;
};

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
