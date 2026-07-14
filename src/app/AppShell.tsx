import { type ReactNode } from 'react';
import { appRoutes, type AppRouteKey, type ProductLineKey } from './routes';
import { getSystemHref, SystemSwitcher } from './SystemSwitcher';

type AppShellProps = {
  activeRoute: AppRouteKey;
  productLine: ProductLineKey;
  children: ReactNode;
};

export function AppShell({ activeRoute, productLine, children }: AppShellProps) {
  const isFlushPage = activeRoute === 'my' || activeRoute === 'permissions';

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <SystemSwitcher currentSystem={productLine} />
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
            <a className="app-shell__nav-item" href={getSystemHref('chatbi')}>
              ChatBI
            </a>
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
            <a className="app-shell__nav-item" href={getSystemHref('chatbi')}>
              ChatBI
            </a>
          </nav>
        )}
        <div className="app-shell__user">管理员</div>
      </header>
      <main className={isFlushPage ? 'app-shell__main app-shell__main--flush' : 'app-shell__main'}>{children}</main>
    </div>
  );
}
