import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCatalogPage } from './AssetCatalogPage';

describe('AssetCatalogPage', () => {
  it('renders catalog tree and all assets by default', () => {
    render(<AssetCatalogPage />);

    expect(screen.getByText('业务线目录')).toBeInTheDocument();
    expect(screen.getAllByText('全部').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('请输入资产名称/描述关键字')).toBeInTheDocument();
    expect(screen.getByText('负责人')).toBeInTheDocument();
    expect(screen.getByText('请选择负责人')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '倒序 ↓' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /标签筛选/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /交易域/ })).toBeInTheDocument();
    expect(screen.getByText('共 7 条资产')).toBeInTheDocument();
    expect(screen.getByText('dwd_ctps_product_browsed_company_shop_device_product_d1')).toBeInTheDocument();
    expect(screen.getAllByText('来源').length).toBeGreaterThan(0);
    expect(screen.getAllByText('目录').length).toBeGreaterThan(0);
    expect(screen.getAllByText('技术负责人').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务负责人').length).toBeGreaterThan(0);
    expect(screen.getByText('MaxCompute')).toBeInTheDocument();
    expect(screen.getAllByText(/已有权限/).length).toBeGreaterThan(0);
  });

  it('filters assets by selected business catalog node', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.click(screen.getByRole('button', { name: /用户域/ }));

    expect(screen.getByText('全部 / 用户域')).toBeInTheDocument();
    expect(screen.getByText('共 3 条资产')).toBeInTheDocument();
    expect(screen.getByText('dwd_user_behavior_log')).toBeInTheDocument();
    expect(screen.queryByText('dwd_ctps_product_browsed_company_shop_device_product_d1')).not.toBeInTheDocument();
  });

  it('filters assets in real-time as user types', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    expect(screen.getByText('共 7 条资产')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('请输入资产名称/描述关键字'), '库存');

    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();
    expect(screen.getAllByText('dashboard_inventory_overview').length).toBeGreaterThan(0);
  });

  it('shows suggestion panel when typing keywords', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.type(screen.getByPlaceholderText('请输入资产名称/描述关键字'), '库存');

    expect(screen.getByText(/快速命中建议/)).toBeInTheDocument();
    expect(screen.getByText('输入时实时命中，点击候选可直接进入')).toBeInTheDocument();
  });

  it('shows hit badges in suggestion items', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.type(screen.getByPlaceholderText('请输入资产名称/描述关键字'), '库存');

    expect(screen.getByText('商品库存看板')).toBeInTheDocument();
    expect(screen.getAllByText('描述').length).toBeGreaterThan(1);
  });

  it('toggles my assets filter', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    await user.click(screen.getByRole('button', { name: /我的表/ }));

    expect(screen.getByText(/共 3 条资产/)).toBeInTheDocument();
    expect(screen.getAllByText(/已有权限/).length).toBeGreaterThan(0);
  });

  it('filters assets by resource type tab', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const tabs = screen.getByRole('tablist', { name: '资产类型' });
    await user.click(within(tabs).getByRole('tab', { name: '指标' }));

    expect(screen.getByText('共 1 条资产')).toBeInTheDocument();
    expect(screen.getByText('metric_gmv_core')).toBeInTheDocument();
  });

  it('opens permission modal when clicking 申请权限', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const applyLinks = screen.getAllByText('申请权限');
    await user.click(applyLinks[0]);

    expect(screen.getByText('加入申请单')).toBeInTheDocument();
    expect(screen.getByText('已加入申请单')).toBeInTheDocument();
    expect(screen.getByText('继续浏览')).toBeInTheDocument();
    expect(screen.getByText('去申请单提交 →')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '去申请单提交 →' }));
    expect(window.location.hash).toBe('#my?section=cart');
  });

  it('toggles favorite button', async () => {
    const user = userEvent.setup();
    render(<AssetCatalogPage />);

    const favButtons = screen.getAllByRole('button', { name: '取消收藏' });
    expect(favButtons.length).toBeGreaterThan(0);

    await user.click(favButtons[0]);

    expect(screen.getAllByRole('button', { name: '收藏' }).length).toBeGreaterThan(0);
  });

  it('shows database name prefix for table resources', () => {
    render(<AssetCatalogPage />);

    expect(screen.getByText('wlyd_mc_beijing.')).toBeInTheDocument();
    expect(screen.getByText('dwd_ctps_product_browsed_company_shop_device_product_d1')).toBeInTheDocument();
  });
});
