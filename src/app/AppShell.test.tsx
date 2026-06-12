import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders platform navigation and active route', () => {
    render(
      <AppShell activeRoute="search">
        <div>检索内容</div>
      </AppShell>,
    );

    expect(screen.getByText('数据资产管理平台')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('资产检索')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('检索内容')).toBeInTheDocument();
  });
});