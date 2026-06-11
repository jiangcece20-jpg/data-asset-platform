import { render, screen } from '@testing-library/react';
import { DataTable } from './data-display/DataTable';
import { Drawer } from './feedback/Drawer';
import { EmptyState } from './feedback/EmptyState';
import { Modal } from './feedback/Modal';
import { FormControl } from './forms/FormControl';

describe('component library primitives', () => {
  it('renders table rows', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', title: '名称' },
          { key: 'type', title: '类型' },
        ]}
        rows={[{ id: '1', name: '订单明细表', type: '表' }]}
      />,
    );

    expect(screen.getByText('订单明细表')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<EmptyState title="暂无数据" description="调整筛选条件后重试" />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders open modal and drawer', () => {
    render(
      <>
        <Modal open title="确认操作" onClose={vi.fn()}>
          确认内容
        </Modal>
        <Drawer open title="历史记录" onClose={vi.fn()}>
          历史内容
        </Drawer>
      </>,
    );

    expect(screen.getByText('确认操作')).toBeInTheDocument();
    expect(screen.getByText('历史记录')).toBeInTheDocument();
  });

  it('renders form control with label', () => {
    render(<FormControl label="资源名称" placeholder="请输入资源名称" />);

    expect(screen.getByLabelText('资源名称')).toBeInTheDocument();
  });
});
