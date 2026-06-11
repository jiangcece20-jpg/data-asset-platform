import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App routing', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders product pages from top navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: '数据资产检索' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '即席查询' }));
    expect(screen.getByRole('heading', { name: '即席查询' })).toBeInTheDocument();
    expect(screen.getByText('SQL 工作台骨架')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '权限管理' }));
    expect(screen.getByRole('heading', { name: '权限管理' })).toBeInTheDocument();
    expect(screen.getByText('权限状态与申请流程骨架')).toBeInTheDocument();
  });
});
