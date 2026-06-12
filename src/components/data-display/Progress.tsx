type ProgressProps = {
  percent: number;
  status?: 'active' | 'success' | 'error';
  segments?: Array<{ percent: number; status: string; label?: string }>;
  showLabel?: boolean;
  className?: string;
};

export function Progress({ percent, status, segments, showLabel = true, className = '' }: ProgressProps) {
  const statusClass = status ? `ui-progress--${status}` : '';

  return (
    <div className={`ui-progress ${statusClass} ${className}`}>
      <div className="ui-progress__track">
        {segments ? (
          segments.map((seg, idx) => (
            <div
              key={idx}
              className={`ui-progress__segment ui-progress__segment--${seg.status}`}
              style={{ width: `${seg.percent}%` }}
              title={seg.label}
            />
          ))
        ) : (
          <div className="ui-progress__bar" style={{ width: `${Math.min(percent, 100)}%` }} />
        )}
      </div>
      {showLabel && !segments ? <span className="ui-progress__label">{percent}%</span> : null}
    </div>
  );
}