import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Tabs } from './Tabs';
import { Tag } from './Tag';

describe('base components', () => {
  it('renders button variants and handles clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button variant="primary" onClick={onClick}>
        保存
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders semantic tags', () => {
    render(<Tag tone="success">已有权限</Tag>);

    expect(screen.getByText('已有权限')).toBeInTheDocument();
  });

  it('renders tabs and marks active item', () => {
    render(
      <Tabs
        activeKey="table"
        items={[
          { key: 'table', label: '表格' },
          { key: 'chart', label: '图表' },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: '表格' })).toHaveAttribute('aria-selected', 'true');
  });
});
