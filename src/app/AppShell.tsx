import { useRef, useState, type ReactNode } from 'react';
import { appRoutes, productLines, type AppRouteKey, type ProductLineKey } from './routes';

type AppShellProps = {
  activeRoute: AppRouteKey;
  productLine: ProductLineKey;
  children: ReactNode;
};

export function AppShell({ activeRoute, productLine, children }: AppShellProps) {
  const isFlushPage = activeRoute === 'my' || activeRoute === 'permissions';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentProduct = productLines.find((p) => p.key === productLine) ?? productLines[0];
  const containerRef = useRef<HTMLDivElement>(null);

  const handleProductSelect = (key: ProductLineKey) => {
    setDropdownOpen(false);
    if (key === productLine) return;
    if (key === 'data-asset') {
      window.location.hash = 'search';
    } else if (key === 'data-source') {
      window.location.hash = 'datasource';
    }
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div
          className="app-shell__product-switcher"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          ref={containerRef}
        >
          <span aria-hidden="true">{currentProduct.icon}</span>
          <span>{currentProduct.name}</span>
          <span aria-hidden="true">▾</span>
        </div>
        {dropdownOpen && (
          <div className="app-shell__product-dropdown">
            {productLines.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`app-shell__product-item ${p.key === productLine ? 'app-shell__product-item--active' : ''}`}
                onClick={() => handleProductSelect(p.key)}
              >
                <span className="app-shell__product-item-icon">{p.icon}</span>
                <span className="app-shell__product-item-name">{p.name}</span>
                <span className="app-shell__product-item-status">{p.status}</span>
              </button>
            ))}
          </div>
        )}
        <div className="app-shell__logo">{productLine === 'data-source' ? '数据之源' : '数据资产管理平台'}</div>
        {productLine === 'data-asset' && (
          <nav className="app-shell__nav" aria-label="主导航">
            {appRoutes.map((route) => (
              <a
                key={route.key}
                className={route.key === activeRoute ? 'app-shell__nav-item app-shell__nav-item--active' : 'app-shell__nav-item'}
                href={`#${route.key}`}
                aria-current={route.key === activeRoute ? 'page' : undefined}
              >
                {route.label}
              </a>
            ))}
          </nav>
        )}
        {productLine === 'data-source' && (
          <nav className="app-shell__nav" aria-label="数据源导航">
            <a
              className={activeRoute === 'datasource' ? 'app-shell__nav-item app-shell__nav-item--active' : 'app-shell__nav-item'}
              href="#datasource"
              aria-current={activeRoute === 'datasource' ? 'page' : undefined}
            >
              数据源管理
            </a>
          </nav>
        )}
        <div className="app-shell__user">管理员</div>
      </header>
      <main className={isFlushPage ? 'app-shell__main app-shell__main--flush' : 'app-shell__main'}>{children}</main>
    </div>
  );
}
