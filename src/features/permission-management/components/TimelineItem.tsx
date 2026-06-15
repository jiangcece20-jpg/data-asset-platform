import { Tag } from '../../../components/base/Tag';

type TimelineItemProps = { label: string; time: string; status: 'done' | 'rejected' | 'waiting' };

export function TimelineItem({ label, time, status }: TimelineItemProps) {
  const dotClass = status === 'done' ? 'done' : status === 'rejected' ? 'rejected' : 'waiting';
  const actionTag = status === 'done' ? <Tag tone="success">通过</Tag> : status === 'rejected' ? <Tag tone="danger">驳回</Tag> : <Tag tone="warning">待审批</Tag>;
  return (
    <div className="permission-management__timeline-item">
      <div className={`permission-management__timeline-dot ${dotClass}`} />
      <div className="permission-management__timeline-content">
        {label} {actionTag}
      </div>
      <div className="permission-management__timeline-time">{time}</div>
    </div>
  );
}
