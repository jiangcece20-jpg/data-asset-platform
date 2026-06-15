import { useMemo } from 'react';

type PaginationProps = {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  showTotal?: boolean;
  className?: string;
};

export function Pagination({ current, total, pageSize, onChange, showTotal = false, className = '' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pages = useMemo(() => {
    const items: Array<number | 'ellipsis'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (current > 3) items.push('ellipsis');
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);
      for (let i = start; i <= end; i++) items.push(i);
      if (current < totalPages - 2) items.push('ellipsis');
      items.push(totalPages);
    }
    return items;
  }, [current, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className={`ui-pagination ${className}`}>
      {showTotal ? <span className="ui-pagination__total">共 {total} 条</span> : null}
      <button
        type="button"
        className="ui-pagination__btn"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="上一页"
      >
        &#8249;
      </button>
      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="ui-pagination__ellipsis">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={`ui-pagination__item ${page === current ? 'ui-pagination__item--active' : ''}`}
            onClick={() => onChange(page)}
          >
            {page}
          </button>
        )
      )}
      <button
        type="button"
        className="ui-pagination__btn"
        disabled={current >= totalPages}
        onClick={() => onChange(current + 1)}
        aria-label="下一页"
      >
        &#8250;
      </button>
    </nav>
  );
}