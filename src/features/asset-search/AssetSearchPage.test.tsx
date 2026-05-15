import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetSearchPage } from './AssetSearchPage';

describe('AssetSearchPage', () => {
  it('renders the discovery state before searching', () => {
    render(<AssetSearchPage />);

    expect(screen.getByRole('heading', { name: '数据资产检索' })).toBeInTheDocument();
    expect(screen.getByText('最近浏览')).toBeInTheDocument();
    expect(screen.getByText('热门搜索')).toBeInTheDocument();
    expect(screen.getAllByText('订单明细表').length).toBeGreaterThan(0);
  });

  it('shows matched asset results after searching', async () => {
    const user = userEvent.setup();
    render(<AssetSearchPage />);

    await user.type(screen.getByPlaceholderText('请输入搜索内容'), 'GMV');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(screen.getByText('找到 2 个相关资产')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GMV 日报' })).toBeInTheDocument();
    expect(screen.getByText('GMV 核心指标')).toBeInTheDocument();
  });

  it('shows an empty state when no assets match', async () => {
    const user = userEvent.setup();
    render(<AssetSearchPage />);

    await user.type(screen.getByPlaceholderText('请输入搜索内容'), '不存在的资产');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(screen.getByText('未找到匹配的数据资产')).toBeInTheDocument();
    expect(screen.getByText('可以换一个关键词，或提交资源治理需求。')).toBeInTheDocument();
  });
});
