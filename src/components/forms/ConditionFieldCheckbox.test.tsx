import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConditionFieldCheckbox } from './ConditionFieldCheckbox';

const OPTIONS = [
  { value: 'table', label: '数据表' },
  { value: 'view', label: '视图' },
  { value: 'api', label: 'API' },
  { value: 'report', label: '报表' },
];

describe('ConditionFieldCheckbox', () => {
  it('renders all options', () => {
    render(<ConditionFieldCheckbox label="对象类型" options={OPTIONS} value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('对象类型')).toBeInTheDocument();
    OPTIONS.forEach(opt => {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    });
  });

  it('shows correct checked state', () => {
    render(<ConditionFieldCheckbox label="对象类型" options={OPTIONS} value={['table', 'view']} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);
    expect(checkboxes[3].checked).toBe(false);
  });

  it('calls onChange when toggling an option', () => {
    const onChange = vi.fn();
    render(<ConditionFieldCheckbox label="对象类型" options={OPTIONS} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('数据表'));
    expect(onChange).toHaveBeenCalledWith(['table']);
  });

  it('calls onChange with empty array when deselecting', () => {
    const onChange = vi.fn();
    render(<ConditionFieldCheckbox label="对象类型" options={OPTIONS} value={['table']} onChange={onChange} />);
    fireEvent.click(screen.getByText('数据表'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('全选 toggles all on when none selected', () => {
    const onChange = vi.fn();
    render(<ConditionFieldCheckbox label="对象类型" options={OPTIONS} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('全选'));
    expect(onChange).toHaveBeenCalledWith(['table', 'view', 'api', 'report']);
  });

  it('全选 toggles all off when all selected', () => {
    const onChange = vi.fn();
    render(<ConditionFieldCheckbox label="对象类型" options={OPTIONS} value={['table', 'view', 'api', 'report']} onChange={onChange} />);
    fireEvent.click(screen.getByText('清空'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
