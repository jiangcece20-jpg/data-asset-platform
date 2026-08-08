import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWizard,
  consumeDraftHandoff,
  createDefaultWizard,
  loadWizard,
  markFieldDraftStarted,
  saveWizard,
  setDraftHandoff,
} from './wizardStore';

describe('wizardStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
  });

  it('persists wizard step and target database', () => {
    const state = createDefaultWizard();
    state.step = 2;
    state.engine = 'Hive';
    state.database = 'dwd';
    saveWizard(state);
    expect(loadWizard().database).toBe('dwd');
    expect(loadWizard().step).toBe(2);
  });

  it('hands off draft payload and marks field draft_started after save path', () => {
    const state = createDefaultWizard();
    state.fields = [{ id: 'f3', nameZh: '优惠券编码', nameEn: '', comment: '' }];
    state.recommendations = [
      {
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
      },
    ];
    saveWizard(state);
    setDraftHandoff({
      fieldId: 'f3',
      nameZh: '优惠券编码',
      comment: '',
      suggestedNameEn: 'coupon_code',
      dataType: 'STRING',
      source: 'table-builder',
    });
    expect(consumeDraftHandoff()?.fieldId).toBe('f3');
    expect(consumeDraftHandoff()).toBeNull();
    markFieldDraftStarted('f3');
    expect(loadWizard().recommendations.find((r) => r.id === 'f3')?.status).toBe('draft_started');
  });
});
