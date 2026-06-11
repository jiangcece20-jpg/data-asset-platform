import type { ReactNode } from 'react';
import './feedback.css';

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div className="ui-modal-overlay">
      <section className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="ui-modal__header">
          <div className="ui-modal__title">{title}</div>
          <button className="ui-close" type="button" aria-label="关闭弹窗" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ui-modal__body">{children}</div>
      </section>
    </div>
  );
}
