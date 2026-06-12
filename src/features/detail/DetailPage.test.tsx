import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DetailPage } from './DetailPage';

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    value: { hash: '#detail?domain=asset&id=resource-table-order-detail' },
    writable: true,
  });
});

function setHash(hash: string) {
  (window.location as unknown as { hash: string }).hash = hash;
}

describe('DetailPage', () => {
  it('renders header area with technical name, db prefix and display name', () => {
    setHash('#detail?domain=asset&id=resource-table-order-detail');
    render(<DetailPage />);

    expect(document.querySelector('.detail-header__tech-name')?.textContent)
      .toBe('dwd_trade_order');
    expect(document.querySelector('.detail-header__db-name')?.textContent).toContain('dwd.');
    expect(document.querySelector('.detail-header__display-name')?.textContent).toBe('订单明细表');
  });

  it('renders permission chip in granted state for table', () => {
    setHash('#detail?domain=asset&id=resource-table-order-detail');
    render(<DetailPage />);

    expect(document.querySelector('.detail-header__perm-chip--granted')?.textContent).toBe('已有权限');
  });

  it('renders permission chip in pending state for metric', () => {
    setHash('#detail?domain=asset&id=resource-metric-gmv-core');
    render(<DetailPage />);

    expect(document.querySelector('.detail-header__perm-chip--pending')?.textContent).toBe('申请中');
  });

  it('renders tab navigation for table type with 7 tabs per PRD §5', () => {
    setHash('#detail?domain=asset&id=resource-table-order-detail');
    render(<DetailPage />);

    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.length).toBe(7);
    expect(within(tablist).getByRole('tab', { name: '字段信息' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '样例数据' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '分区信息' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '血缘关系' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '使用说明' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: 'DDL变更' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '操作记录' })).toBeTruthy();
  });

  it('renders tab navigation for metric type with 4 tabs per PRD §5', () => {
    setHash('#detail?domain=asset&id=resource-metric-gmv-core');
    render(<DetailPage />);

    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.length).toBe(4);
    expect(within(tablist).getByRole('tab', { name: '指标定义' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '血缘关系' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '使用说明' })).toBeTruthy();
    expect(within(tablist).getByRole('tab', { name: '操作记录' })).toBeTruthy();
  });

  it('renders field info tab with security levels and encrypt marks', () => {
    setHash('#detail?domain=asset&id=resource-table-order-detail');
    render(<DetailPage />);

    expect(screen.getAllByText('S1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('S4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('需加密').length).toBeGreaterThanOrEqual(1);
  });

  it('shows not found state for invalid resource id', () => {
    setHash('#detail?domain=asset&id=nonexistent-id');
    render(<DetailPage />);

    expect(screen.getByText('未找到该资源')).toBeTruthy();
    expect(screen.getByText('返回列表')).toBeTruthy();
  });

  it('renders top bar with back button and breadcrumb', () => {
    setHash('#detail?domain=asset&id=resource-table-order-detail');
    render(<DetailPage />);

    expect(screen.getByText('返回')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: '面包屑导航' })).toBeTruthy();
  });
});
