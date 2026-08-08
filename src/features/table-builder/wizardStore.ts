import type { FieldInput, FieldRecommendResult, TableInput } from '../../types/tableBuilder';
import type { EngineType } from './ddlTemplates';

export type WizardStep = 1 | 2 | 3 | 4;

export type WizardState = {
  step: WizardStep;
  engine: EngineType;
  database: string;
  table: TableInput;
  fields: FieldInput[];
  recommendations: FieldRecommendResult[];
  createOutcome: 'success' | 'failure' | null;
};

export type StandardDraftHandoff = {
  fieldId: string;
  nameZh: string;
  comment: string;
  suggestedNameEn: string;
  dataType: string;
  source: 'table-builder';
};

const WIZARD_STORAGE_KEY = 'dap.tableBuilder.wizard';
const DRAFT_HANDOFF_STORAGE_KEY = 'dap.tableBuilder.draftHandoff';

export function createDefaultWizard(): WizardState {
  return {
    step: 1,
    engine: 'Hive',
    database: '',
    table: { nameZh: '', nameEn: '', description: '' },
    fields: [],
    recommendations: [],
    createOutcome: null,
  };
}

export function loadWizard(): WizardState {
  try {
    const text = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!text) {
      return createDefaultWizard();
    }
    const parsed = JSON.parse(text) as Partial<WizardState>;
    return { ...createDefaultWizard(), ...parsed };
  } catch {
    return createDefaultWizard();
  }
}

export function saveWizard(state: WizardState): void {
  sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
}

export function clearWizard(): void {
  sessionStorage.removeItem(WIZARD_STORAGE_KEY);
}

export function setDraftHandoff(payload: StandardDraftHandoff): void {
  sessionStorage.setItem(DRAFT_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
}

export function consumeDraftHandoff(): StandardDraftHandoff | null {
  const text = sessionStorage.getItem(DRAFT_HANDOFF_STORAGE_KEY);
  if (!text) {
    return null;
  }
  sessionStorage.removeItem(DRAFT_HANDOFF_STORAGE_KEY);
  try {
    return JSON.parse(text) as StandardDraftHandoff;
  } catch {
    return null;
  }
}

export function markFieldDraftStarted(fieldId: string): void {
  const state = loadWizard();
  state.recommendations = state.recommendations.map((rec) =>
    rec.id === fieldId ? { ...rec, status: 'draft_started' } : rec,
  );
  saveWizard(state);
}
