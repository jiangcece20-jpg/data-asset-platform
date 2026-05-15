import type { ReactNode } from 'react';
import './feedback.css';

type DrawerProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Drawer({ open, title, children, onClose }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="ui-drawer-overlay">
      <aside className="ui-drawer" aria-label={title}>
        <header className="ui-drawer__header">
          <div className="ui-drawer__title">{title}</div>
          <button className="ui-close" type="button" aria-label="关闭抽屉" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ui-drawer__body">{children}</div>
      </aside>
    </div>
  );
}
