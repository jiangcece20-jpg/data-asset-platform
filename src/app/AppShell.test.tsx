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

  it('passes the active product line to the product switcher', () => {
    const { container } = render(
      <AppShell activeRoute="search" productLine="data-asset">
        <div>检索内容</div>
      </AppShell>,
    );

    expect(container.querySelector('product-switcher')).toHaveAttribute('current', 'data-asset');
  });

  it('renders 数据标准 logo and navigation for the data-standard product line', () => {
    const { container } = render(
      <AppShell activeRoute="data-standard" productLine="data-standard">
        <div>数据标准内容</div>
      </AppShell>,
    );

    expect(container.querySelector('.app-shell__logo')).toHaveTextContent('数据标准');
    expect(screen.getByRole('link', { name: '数据标准' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '新建标准草稿' })).toHaveAttribute('href', '#data-standard/draft');
  });

  it('renders 建表工具 logo and navigation for the table-builder product line', () => {
    render(
      <AppShell activeRoute="table-builder" productLine="table-builder">
        <div>建表工具内容</div>
      </AppShell>,
    );

    expect(screen.getByText('建表工具')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '建表向导' })).toHaveAttribute('href', '#table-builder');
    expect(screen.getByRole('link', { name: '建表向导' })).toHaveAttribute('aria-current', 'page');
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
