import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AIFindDataPage } from './AIFindDataPage';

function sendQuery(container: HTMLElement, text: string) {
  const input = container.querySelector('.ai-find__input') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('AIFindDataPage', () => {
  it('渲染欢迎语与引导标签，右侧为空态', () => {
    render(<AIFindDataPage />);
    expect(screen.getByText(/告诉我你想找什么数据/)).toBeTruthy();
    expect(screen.getByText('从左侧开始：找数 → 用数')).toBeTruthy();
    expect(screen.getByRole('button', { name: '各渠道 GMV 表现' })).toBeTruthy();
  });

  it('查数：发送"昨天 GMV 是多少"出摘要卡与来源口径面板', async () => {
    const { container } = render(<AIFindDataPage />);
    sendQuery(container, '昨天 GMV 是多少');

    await waitFor(() => {
      expect(container.querySelector('.ai-find__chatbi-summary-label')?.textContent).toContain('昨天 GMV');
    }, { timeout: 3000 });

    // 右侧查数面板：来源与口径默认展开
    expect(screen.getByTestId('chatbi-source').textContent).toContain('指标口径');
    expect(screen.getByTestId('chatbi-source').textContent).toContain('dws_trade_order_day');
  });

  it('找资产：资产卡片按类型给用数按钮，表卡打开表信息页', async () => {
    const { container } = render(<AIFindDataPage />);
    sendQuery(container, '各渠道 GMV 表现');

    await waitFor(() => {
      expect(container.querySelectorAll('.ai-find__result-card').length).toBe(3);
    }, { timeout: 3000 });

    expect(screen.getByRole('button', { name: '预览报表' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '预览看板' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '打开表 · 去查询' }));
    await waitFor(() => {
      expect(screen.getByText('📋 表结构')).toBeTruthy();
      expect(screen.getByRole('button', { name: '去即席查询工作台 →' })).toBeTruthy();
    });
    // schema 默认展开
    expect(screen.getByText('channel_name')).toBeTruthy();
  });

  it('指标确认：销售额命中两个候选', async () => {
    const { container } = render(<AIFindDataPage />);
    sendQuery(container, '昨天销售额是多少');

    await waitFor(() => {
      expect(screen.getByText(/「销售额」可能对应 2 个指标/)).toBeTruthy();
    }, { timeout: 3000 });
    const options = container.querySelectorAll('.ai-find__ask-option--rich');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('GMV');
    expect(options[0].textContent).toContain('已接入直接查数');
    expect(options[1].textContent).toContain('营收');
    expect(options[1].textContent).toContain('未接入查数');
  });
});
