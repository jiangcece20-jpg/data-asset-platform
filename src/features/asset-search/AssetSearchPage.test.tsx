import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetSearchPage } from './AssetSearchPage';

const mockHashSetter = vi.fn();
const originalLocation = window.location;

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    value: {
      ...originalLocation,
      set hash(val: string) { mockHashSetter(val); },
      get hash() { return ''; },
    },
    writable: true,
    configurable: true,
  });
});

describe('AssetSearchPage', () => {
  beforeEach(() => {
    mockHashSetter.mockClear();
  });

  it('renders the discovery state with search box and hot keywords', () => {
    render(<AssetSearchPage />);

    expect(screen.getByRole('heading', { name: '数据资产检索' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索资产名称、描述、负责人、标签…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搜索' })).toBeInTheDocument();
    expect(screen.getByText('热门搜索:')).toBeInTheDocument();
    expect(screen.getByText('最近浏览')).toBeInTheDocument();
    expect(screen.getByText('我的收藏')).toBeInTheDocument();
    expect(screen.getByText('热门浏览')).toBeInTheDocument();
    expect(screen.getByText('热门专题')).toBeInTheDocument();
    expect(screen.getByText('平台概览')).toBeInTheDocument();
    expect(screen.getByText('AI 助手')).toBeInTheDocument();
  });

  it('shows suggestion panel when typing a keyword', async () => {
    const user = userEvent.setup();
    render(<AssetSearchPage />);

    await user.type(screen.getByPlaceholderText('搜索资产名称、描述、负责人、标签…'), '订单');

    expect(screen.getByText(/已命中 \d+ 条候选/)).toBeInTheDocument();
    expect(screen.getByText('↑ ↓ 切换选中')).toBeInTheDocument();
    expect(screen.getByText('Esc 收起下拉')).toBeInTheDocument();
  });

  it('navigates to catalog page when clicking search button', async () => {
    const user = userEvent.setup();
    render(<AssetSearchPage />);

    await user.type(screen.getByPlaceholderText('搜索资产名称、描述、负责人、标签…'), 'GMV');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(mockHashSetter).toHaveBeenCalledWith('#catalog?q=GMV');
  });

  it('navigates to catalog page when clicking hot keyword', async () => {
    const user = userEvent.setup();
    render(<AssetSearchPage />);

    const hints = screen.getByLabelText('热门搜索');
    const hotButton = within(hints).getByText('订单明细表');
    await user.click(hotButton);

    expect(mockHashSetter).toHaveBeenCalledWith('#catalog?q=%E8%AE%A2%E5%8D%95%E6%98%8E%E7%BB%86%E8%A1%A8');
  });

  it('hides suggestion panel on Escape key', async () => {
    const user = userEvent.setup();
    render(<AssetSearchPage />);

    const input = screen.getByPlaceholderText('搜索资产名称、描述、负责人、标签…');
    await user.type(input, '订单');

    expect(screen.getByText(/已命中 \d+ 条候选/)).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText(/已命中 \d+ 条候选/)).not.toBeInTheDocument();
  });

  it('always shows discovery panel (no in-page search results)', () => {
    render(<AssetSearchPage />);

    expect(screen.getByText('最近浏览')).toBeInTheDocument();
    expect(screen.queryByText(/找到 \d+ 个相关资产/)).not.toBeInTheDocument();
    expect(screen.queryByText('返回发现')).not.toBeInTheDocument();
  });
});
