import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCatalogPage } from './AssetCatalogPage';

describe('AssetCatalogPage', () => {
  it('renders catalog tree and all assets by default', () => {
    render(<AssetCatalogPage />);

    expect(screen.getByText('业务线目录')).toBeInTheDocument();
    expect(screen.getAllByText('全部').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('请输入搜索内容')).toBeInTheDocument();
    expect(screen.getByText('负责人')).toBeInTheDocument();
    expect(screen.getByText('请选择负责人')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '倒序 ↓' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /标签筛选/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /交易域/ })).toBeInTheDocument();
    expect(screen.getByText('共 7 条资产')).toBeInTheDocument();
    expect(screen.getByText('dwd_trade_order')).toBeInTheDocument();
    expect(screen.getAllByText('来源').length).toBeGreaterThan(0);
    expect(screen.getAllByText('目录').length).toBeGreaterThan(0);
    expect(screen.getAllByText('技术负责人').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务负责人').length).toBeGreaterThan(0);
    expect(screen.getByText('MaxCompute')).toBeInTheDocument();
  });

  it('filters assets by selected business catalog node', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.click(screen.getByRole('button', { name: /用户域/ }));

    expect(screen.getByText('全部 / 用户域')).toBeInTheDocument();
    expect(screen.getByText('共 3 条资产')).toBeInTheDocument();
    expect(screen.getByText('dwd_user_behavior_log')).toBeInTheDocument();
    expect(screen.queryByText('dwd_trade_order')).not.toBeInTheDocument();
  });

  it('filters assets after submitting search form', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    expect(screen.getByText('共 7 条资产')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('请输入搜索内容'), '库存');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();
    expect(screen.getAllByText('report_inventory_overview').length).toBeGreaterThan(0);
  });

  it('shows suggestion panel when typing keywords', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.type(screen.getByPlaceholderText('请输入搜索内容'), '库存');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(screen.getByText('report_inventory_overview')).toBeInTheDocument();
  });

  it('shows description for matched resources', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.type(screen.getByPlaceholderText('请输入搜索内容'), '库存');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(screen.getByText('report_inventory_overview')).toBeInTheDocument();
    expect(screen.getAllByText('描述').length).toBeGreaterThan(0);
  });

  it('toggles my assets filter', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.click(screen.getByRole('button', { name: /我的表/ }));

    // Only resources with permissionStatus: 'granted' (dwd_trade_order, tag_user_profile, report_inventory_overview)
    expect(screen.getByText(/共 3 条资产/)).toBeInTheDocument();
  });

  it('filters assets by resource type tab', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const tabs = screen.getByRole('tablist', { name: '资产类型' });
    await user.click(within(tabs).getByRole('tab', { name: '指标' }));

    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();
    expect(screen.getByText('metric_gmv_core')).toBeInTheDocument();
  });

  it('shows assets count for report type tab', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const tabs = screen.getByRole('tablist', { name: '资产类型' });
    await user.click(within(tabs).getByRole('tab', { name: '报表' }));

    expect(screen.getByText('共 2 条资产')).toBeInTheDocument();
    expect(screen.getByText('rpt_gmv_daily')).toBeInTheDocument();
  });

  it('shows count and resets when type tab all is clicked', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const tabs = screen.getByRole('tablist', { name: '资产类型' });
    await user.click(within(tabs).getByRole('tab', { name: '指标' }));
    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();

    await user.click(within(tabs).getByRole('tab', { name: '全部' }));
    expect(screen.getByText('共 7 条资产')).toBeInTheDocument();
  });

  it('shows database name prefix for table resources', () => {
    render(<AssetCatalogPage />);

    expect(screen.getByText('wlyd_mc_beijing.')).toBeInTheDocument();
    expect(screen.getByText('dwd_trade_order')).toBeInTheDocument();
  });
});
