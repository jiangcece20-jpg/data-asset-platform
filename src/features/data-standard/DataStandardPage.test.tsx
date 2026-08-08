import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DataStandardDraftPage } from './DataStandardDraftPage';
import { DataStandardShellPage } from './DataStandardShellPage';
import { clearWizard, setDraftHandoff } from '../table-builder/wizardStore';

describe('DataStandard shell', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
  });

  it('renders placeholder standard list', () => {
    render(<DataStandardShellPage />);
    expect(screen.getByRole('heading', { name: /数据标准/ })).toBeInTheDocument();
    expect(screen.getByText(/客户编号|标准集/)).toBeInTheDocument();
  });

  it('prefills draft from handoff and returns to table builder after save', async () => {
    const user = userEvent.setup();
    setDraftHandoff({
      fieldId: 'f3',
      nameZh: '优惠券编码',
      comment: '营销优惠券',
      suggestedNameEn: 'coupon_code',
      dataType: 'STRING',
      source: 'table-builder',
    });
    render(<DataStandardDraftPage />);
    expect(screen.getByDisplayValue('优惠券编码')).toBeInTheDocument();
    expect(screen.getByDisplayValue('coupon_code')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(window.location.hash).toBe('#table-builder');
  });
});
