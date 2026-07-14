import { type ReactNode } from 'react';
import { ProductSwitcher } from '../components/product-switcher/ProductSwitcher';
import { appRoutes, type AppRouteKey, type ProductLineKey } from './routes';

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
        <ProductSwitcher currentSystem={productLine} />
        <div className="app-shell__logo">
          {productLine === 'data-source' ? '数据之源' : productLine === 'chatbi' ? '智能问数' : '数据资产管理平台'}
        </div>
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
        {productLine === 'chatbi' && (
          <nav className="app-shell__nav" aria-label="智能问数导航">
            <a
              className={activeRoute === 'ai-find' ? 'app-shell__nav-item app-shell__nav-item--active' : 'app-shell__nav-item'}
              href="#ai-find"
              aria-current={activeRoute === 'ai-find' ? 'page' : undefined}
            >
              AI 找数
            </a>
          </nav>
        )}
        <div className="app-shell__user">管理员</div>
      </header>
      <main className={isFlushPage ? 'app-shell__main app-shell__main--flush' : 'app-shell__main'}>{children}</main>
    </div>
  );
}
