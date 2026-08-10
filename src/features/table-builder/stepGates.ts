import type { WizardState } from './wizardStore';

/**
 * Step1 → Step2 门禁：必须先选定数据源类型与目标库。
 */
export function canEnterTableInfo(state: Pick<WizardState, 'engine' | 'database'>): string | null {
  if (!state.engine || !state.database) {
    return '请先完成数据源类型与库的设置后再继续';
  }
  return null;
}

/**
 * Step2 → Step3 门禁：表中文名/英文名至少填写一个。
 */
export function canEnterFieldConfig(state: Pick<WizardState, 'table'>): string | null {
  const hasTableName = state.table.nameZh.trim() !== '' || state.table.nameEn.trim() !== '';
  if (!hasTableName) {
    return '请填写表中文名或表英文名后再继续';
  }
  return null;
}

/**
 * 判断一组字段（或推荐结果）的英文名是否存在重复（忽略大小写与首尾空白，空值不参与比较）。
 */
export function hasDuplicateEnglishNames(items: { nameEn: string }[]): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.nameEn.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/**
 * Step3 → Step4 门禁：至少一个字段，英文名不可重复。
 */
export function canConfirmCreate(state: Pick<WizardState, 'recommendations'>): string | null {
  if (state.recommendations.length === 0) {
    return '请至少添加一个字段后再确认建表';
  }
  if (hasDuplicateEnglishNames(state.recommendations)) {
    return '存在重复的英文名，请先调整改选/忽略结果后再确认建表';
  }
  return null;
}
