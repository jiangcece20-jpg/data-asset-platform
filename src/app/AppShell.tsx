import type { ReactNode } from 'react';
import { appRoutes, type AppRouteKey } from './routes';

type AppShellProps = {
  activeRoute: AppRouteKey;
  children: ReactNode;
};

export function AppShell({ activeRoute, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__logo">数据资产管理平台</div>
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
        <div className="app-shell__user">管理员</div>
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
