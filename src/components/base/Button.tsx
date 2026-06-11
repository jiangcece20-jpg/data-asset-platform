import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './base.css';

type ButtonVariant = 'primary' | 'default' | 'text' | 'danger';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

export function Button({ variant = 'default', size = 'md', loading = false, disabled, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
