import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders platform navigation and active route', () => {
    render(
      <AppShell activeRoute="components">
        <div>组件库内容</div>
      </AppShell>,
    );

    expect(screen.getByText('数据资产管理平台')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('组件库')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('组件库内容')).toBeInTheDocument();
  });
});
