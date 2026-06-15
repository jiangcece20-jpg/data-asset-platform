import { useCallback, useRef, useState, type ReactNode } from 'react';

type ResizableProps = {
  direction: 'horizontal' | 'vertical';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children: [ReactNode, ReactNode];
  className?: string;
};

export function Resizable({
  direction,
  defaultSize = 300,
  minSize = 100,
  maxSize = 800,
  children,
  className = '',
}: ResizableProps) {
  const [size, setSize] = useState(defaultSize);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize.current = size;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = direction === 'horizontal' ? ev.clientX - startPos.current : startPos.current - ev.clientY;
        const nextSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
        setSize(nextSize);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [direction, size, minSize, maxSize]
  );

  const isHorizontal = direction === 'horizontal';

  return (
    <div className={`ui-resizable ui-resizable--${direction} ${className}`}>
      <div
        className="ui-resizable__pane ui-resizable__pane--primary"
        style={isHorizontal ? { width: size } : { height: size }}
      >
        {children[0]}
      </div>
      <div
        className={`ui-resizable__handle ui-resizable__handle--${direction}`}
        onMouseDown={handleMouseDown}
      />
      <div className="ui-resizable__pane ui-resizable__pane--secondary">
        {children[1]}
      </div>
    </div>
  );
}