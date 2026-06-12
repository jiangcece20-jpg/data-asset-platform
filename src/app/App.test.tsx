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
    expect(screen.getByRole('button', { name: '新建查询' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '权限中心' }));
    expect(screen.getByRole('heading', { name: '飞书流程库' })).toBeInTheDocument();
    expect(screen.getByText('权限申请_高安全等级版')).toBeInTheDocument();
    expect(screen.getByText('7C468A54-HIGH-2024')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /申请单/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^我申请的$/ })).not.toBeInTheDocument();
  });

  it('opens My application cart from hash query', () => {
    window.location.hash = 'my?section=cart';
    render(<App />);

    expect(screen.getByRole('heading', { name: '我的' })).toBeInTheDocument();
    expect(screen.getByText('权限申请单')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交申请' })).toBeInTheDocument();
  });
});
