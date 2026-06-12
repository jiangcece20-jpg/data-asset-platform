type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  separator?: string;
  className?: string;
};

export function Breadcrumb({ items, separator = '/', className = '' }: BreadcrumbProps) {
  return (
    <nav className={`ui-breadcrumb ${className}`} aria-label="面包屑导航">
      {items.map((item, idx) => (
        <span key={idx} className="ui-breadcrumb__item">
          {idx > 0 ? <span className="ui-breadcrumb__sep">{separator}</span> : null}
          {item.onClick ? (
            <button type="button" className="ui-breadcrumb__link" onClick={item.onClick}>
              {item.label}
            </button>
          ) : (
            <span className="ui-breadcrumb__text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}