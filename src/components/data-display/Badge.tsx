import type { ReactNode } from 'react';

type BadgeProps = {
  count?: number;
  dot?: boolean;
  overflow?: number;
  className?: string;
  children: ReactNode;
};

export function Badge({ count, dot = false, overflow = 99, className = '', children }: BadgeProps) {
  const displayCount = count !== undefined && count > overflow ? `${overflow}+` : count;

  return (
    <span className={`ui-badge ${className}`}>
      {children}
      {dot ? (
        <span className="ui-badge__dot" />
      ) : count !== undefined && count > 0 ? (
        <span className="ui-badge__count">{displayCount}</span>
      ) : null}
    </span>
  );
}