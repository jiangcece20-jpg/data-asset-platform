import type { ReactNode } from 'react';
import './base.css';

type TagTone = 'blue' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'cyan';

type TagProps = {
  tone?: TagTone;
  children: ReactNode;
};

export function Tag({ tone = 'gray', children }: TagProps) {
  return <span className={`ui-tag ui-tag--${tone}`}>{children}</span>;
}
