import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DataStandardDraftPage } from './DataStandardDraftPage';
import { DataStandardShellPage } from './DataStandardShellPage';
import {
  clearWizard,
  createDefaultWizard,
  loadWizard,
  saveWizard,
  setDraftHandoff,
} from '../table-builder/wizardStore';
import type { FieldRecommendResult } from '../../types/tableBuilder';

const MISSING_FIELD_RECOMMENDATION: FieldRecommendResult = {
  id: 'f3',
  nameZh: '优惠券编码',
  nameEn: '',
  comment: '',
  status: 'missing',
  suggestedNameEn: 'coupon_code',
  dataType: 'STRING',
  nullable: true,
  primaryKey: false,
  classificationPath: '',
  grade: '',
  confidence: 'low',
  rationale: '无已发布标准命中',
};

function seedWizardWithMissingField() {
  const state = createDefaultWizard();
  state.recommendations = [{ ...MISSING_FIELD_RECOMMENDATION }];
  saveWizard(state);
}

function seedDraftHandoff() {
  setDraftHandoff({
    fieldId: 'f3',
    nameZh: '优惠券编码',
    comment: '营销优惠券',
    suggestedNameEn: 'coupon_code',
    dataType: 'STRING',
    source: 'table-builder',
  });
}

describe('DataStandard shell', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
  });

  it('renders placeholder standard list', () => {
    render(<DataStandardShellPage />);
    expect(screen.getByRole('heading', { name: '数据标准' })).toBeInTheDocument();
    // "标准集" copy appears in the section heading and in each row name
    // (e.g. "客户主题标准集"), so scope to the exact section heading.
    expect(screen.getByRole('heading', { name: '标准集', level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/标准集/).length).toBeGreaterThan(1);
  });

  it('prefills draft from handoff and returns to table builder after save', async () => {
    const user = userEvent.setup();
    seedDraftHandoff();
    render(<DataStandardDraftPage />);
    expect(screen.getByDisplayValue('优惠券编码')).toBeInTheDocument();
    expect(screen.getByDisplayValue('coupon_code')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(window.location.hash).toBe('#table-builder/new');
  });

  it('still prefills from handoff when mounted twice under React.StrictMode', () => {
    // React 18 StrictMode double-invokes the `useState` initializer (and
    // effects) on mount in development. If the handoff were consumed inside
    // the initializer, the second invocation would find it already deleted.
    seedDraftHandoff();
    render(
      <StrictMode>
        <DataStandardDraftPage />
      </StrictMode>,
    );
    expect(screen.getByDisplayValue('优惠券编码')).toBeInTheDocument();
    expect(screen.getByDisplayValue('coupon_code')).toBeInTheDocument();
  });

  it('marks the handed-off field as draft_started when saving', async () => {
    const user = userEvent.setup();
    seedWizardWithMissingField();
    seedDraftHandoff();
    render(<DataStandardDraftPage />);
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(loadWizard().recommendations.find((r) => r.id === 'f3')?.status).toBe('draft_started');
  });

  it('does not mark the field as draft_started when cancelling', async () => {
    const user = userEvent.setup();
    seedWizardWithMissingField();
    seedDraftHandoff();
    render(<DataStandardDraftPage />);
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(loadWizard().recommendations.find((r) => r.id === 'f3')?.status).toBe('missing');
  });
});
