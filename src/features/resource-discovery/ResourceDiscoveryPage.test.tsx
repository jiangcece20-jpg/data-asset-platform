import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceDiscoveryPage } from './ResourceDiscoveryPage';

describe('ResourceDiscoveryPage', () => {
  it('renders unified discovery pool by default', () => {
    render(<ResourceDiscoveryPage />);

    expect(screen.getByRole('heading', { name: '资源发现' })).toBeInTheDocument();
    expect(screen.getByText('业务目录')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '推荐资源' })).toBeInTheDocument();
    expect(screen.getByText('共 11 条')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '订单明细表' })).toBeInTheDocument();
  });

  it('shows unassigned resources from the quick tree node', async () => {
    const user = userEvent.setup();
    render(<ResourceDiscoveryPage />);

    await user.click(screen.getByRole('button', { name: /未归属/ }));

    expect(screen.getByText('当前范围：未归属')).toBeInTheDocument();
    expect(screen.getByText('共 3 条')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '行业资讯原始表' })).toBeInTheDocument();
  });

  it('filters to raw resources only', async () => {
    const user = userEvent.setup();
    render(<ResourceDiscoveryPage />);

    await user.click(screen.getByRole('button', { name: '仅资源' }));

    expect(screen.getByText('共 4 条')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '库存校验接口' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '订单明细表' })).not.toBeInTheDocument();
  });

  it('filters by maintain status', async () => {
    const user = userEvent.setup();
    render(<ResourceDiscoveryPage />);

    await user.click(screen.getByRole('button', { name: '待维护' }));

    expect(screen.getByText('共 3 条')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '点击流原始流' })).toBeInTheDocument();
  });

  it('searches across asset and resource records', async () => {
    const user = userEvent.setup();
    render(<ResourceDiscoveryPage />);

    await user.type(screen.getByPlaceholderText('请输入资产名称/描述关键字'), '库存');

    expect(screen.getByText('共 2 条')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '商品库存看板' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '库存校验接口' })).toBeInTheDocument();
  });

  it('filters by resource type tab', async () => {
    const user = userEvent.setup();
    render(<ResourceDiscoveryPage />);

    const tabs = screen.getByRole('tablist', { name: '资源类型' });
    await user.click(within(tabs).getByRole('tab', { name: 'API' }));

    expect(screen.getByText('共 2 条')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '客户价值评分 API' })).toBeInTheDocument();
  });
});
