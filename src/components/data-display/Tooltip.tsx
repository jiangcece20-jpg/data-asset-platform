import { useState, useRef, type ReactElement } from 'react';

type TooltipProps = {
  title: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactElement;
  className?: string;
};

export function Tooltip({ title, placement = 'top', children, className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={triggerRef}
      className={`ui-tooltip ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span className={`ui-tooltip__popup ui-tooltip__popup--${placement}`} role="tooltip">
          {title}
        </span>
      ) : null}
    </span>
  );
}