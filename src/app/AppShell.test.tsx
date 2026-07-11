import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders platform navigation and active route', () => {
    render(
      <AppShell activeRoute="search" productLine="data-asset">
        <div>检索内容</div>
      </AppShell>,
    );

    expect(screen.getByText('数据资产管理平台')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('资产检索')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('检索内容')).toBeInTheDocument();
  });

  it('removes outer padding for embedded workspace pages', () => {
    const { rerender } = render(
      <AppShell activeRoute="my" productLine="data-asset">
        <div>我的内容</div>
      </AppShell>,
    );

    expect(screen.getByRole('main')).toHaveClass('app-shell__main--flush');

    rerender(
      <AppShell activeRoute="permissions" productLine="data-asset">
        <div>权限中心内容</div>
      </AppShell>,
    );

    expect(screen.getByRole('main')).toHaveClass('app-shell__main--flush');

    rerender(
      <AppShell activeRoute="search" productLine="data-asset">
        <div>检索内容</div>
      </AppShell>,
    );

    expect(screen.getByRole('main')).not.toHaveClass('app-shell__main--flush');
  });
});
