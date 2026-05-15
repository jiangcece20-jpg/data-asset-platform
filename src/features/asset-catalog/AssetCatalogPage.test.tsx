import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCatalogPage } from './AssetCatalogPage';

describe('AssetCatalogPage', () => {
  it('renders catalog tree and all assets by default', () => {
    render(<AssetCatalogPage />);

    expect(screen.getByRole('heading', { name: '资产目录' })).toBeInTheDocument();
    expect(screen.getByText('业务线目录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /交易域/ })).toBeInTheDocument();
    expect(screen.getByText('共 7 条资产')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '订单明细表' })).toBeInTheDocument();
  });

  it('filters assets by selected business catalog node', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.click(screen.getByRole('button', { name: /用户域/ }));

    expect(screen.getByText('全部 / 用户域')).toBeInTheDocument();
    expect(screen.getByText('共 3 条资产')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '用户行为日志' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '订单明细表' })).not.toBeInTheDocument();
  });

  it('searches assets inside the catalog page', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.type(screen.getByPlaceholderText('请输入资产名称/描述关键字'), '库存');

    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '商品库存看板' })).toBeInTheDocument();
  });

  it('filters assets by resource type tab', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const tabs = screen.getByRole('tablist', { name: '资产类型' });
    await user.click(within(tabs).getByRole('tab', { name: '指标' }));

    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GMV 核心指标' })).toBeInTheDocument();
  });
});
