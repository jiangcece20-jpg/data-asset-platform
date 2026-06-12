export type TimelineItemData = {
  status: 'completed' | 'current' | 'pending' | 'error';
  title: string;
  description?: string;
  time?: string;
  actor?: string;
};

type TimelineProps = {
  items: TimelineItemData[];
  className?: string;
};

export function Timeline({ items, className = '' }: TimelineProps) {
  return (
    <div className={`ui-timeline ${className}`}>
      {items.map((item, idx) => (
        <div key={idx} className={`ui-timeline__item ui-timeline__item--${item.status}`}>
          <div className="ui-timeline__dot" />
          {idx < items.length - 1 ? <div className="ui-timeline__line" /> : null}
          <div className="ui-timeline__content">
            <div className="ui-timeline__header">
              <span className="ui-timeline__title">{item.title}</span>
              {item.time ? <span className="ui-timeline__time">{item.time}</span> : null}
            </div>
            {item.actor ? <div className="ui-timeline__actor">{item.actor}</div> : null}
            {item.description ? <div className="ui-timeline__desc">{item.description}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}