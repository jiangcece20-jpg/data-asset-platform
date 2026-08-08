import type { WizardState } from './wizardStore';

/**
 * Step1 → Step2 门禁：必须先选定数据源类型与目标库。
 */
export function canEnterFields(state: Pick<WizardState, 'engine' | 'database'>): string | null {
  if (!state.engine || !state.database) {
    return '请先完成数据源类型与库的设置后再继续';
  }
  return null;
}

/**
 * Step2 → Step3 门禁：至少录入一个字段，且表中文名/英文名至少填写一个。
 */
export function canEnterRecommend(state: Pick<WizardState, 'fields' | 'table'>): string | null {
  if (state.fields.length === 0) {
    return '请至少录入一个字段后再继续';
  }
  const hasTableName = state.table.nameZh.trim() !== '' || state.table.nameEn.trim() !== '';
  if (!hasTableName) {
    return '请填写表中文名或表英文名后再继续';
  }
  return null;
}
