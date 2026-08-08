import { useEffect, useState } from 'react';
import type { FieldInput, FieldRecommendResult, TableInput } from '../../types/tableBuilder';
import { Button } from '../../components/base/Button';
import type { EngineType } from './ddlTemplates';
import { loadWizard, saveWizard, type WizardState, type WizardStep } from './wizardStore';
import { canConfirmCreate, canEnterFields, canEnterRecommend } from './stepGates';
import { StepTarget } from './steps/StepTarget';
import { StepFields } from './steps/StepFields';
import { StepRecommend } from './steps/StepRecommend';
import './table-builder.css';

const STEP_LABELS: { step: WizardStep; label: string }[] = [
  { step: 1, label: '选库' },
  { step: 2, label: '录入' },
  { step: 3, label: '推荐确认' },
  { step: 4, label: '结果' },
];

function prevStepOf(step: WizardStep): WizardStep {
  return step === 1 ? 1 : ((step - 1) as WizardStep);
}

function nextStepOf(step: WizardStep): WizardStep {
  return step === 4 ? 4 : ((step + 1) as WizardStep);
}

export function TableBuilderPage() {
  const [state, setState] = useState<WizardState>(() => loadWizard());
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    saveWizard(state);
  }, [state]);

  const goPrev = () => {
    setStepError(null);
    setState((prev) => ({ ...prev, step: prevStepOf(prev.step) }));
  };

  const goNext = () => {
    if (state.step === 1) {
      const error = canEnterFields(state);
      if (error) {
        setStepError(error);
        return;
      }
    }
    if (state.step === 2) {
      const error = canEnterRecommend(state);
      if (error) {
        setStepError(error);
        return;
      }
    }
    if (state.step === 3) {
      const error = canConfirmCreate(state);
      if (error) {
        setStepError(error);
        return;
      }
      setStepError(null);
      setState((prev) => ({ ...prev, step: 4, createOutcome: 'success' }));
      return;
    }
    setStepError(null);
    setState((prev) => ({ ...prev, step: nextStepOf(prev.step) }));
  };

  const handleEngineChange = (engine: EngineType) => {
    setStepError(null);
    setState((prev) => ({ ...prev, engine, database: '' }));
  };

  const handleDatabaseChange = (database: string) => {
    setStepError(null);
    setState((prev) => ({ ...prev, database }));
  };

  const handleTableChange = (patch: Partial<TableInput>) => {
    setStepError(null);
    setState((prev) => ({ ...prev, table: { ...prev.table, ...patch } }));
  };

  const handleFieldsChange = (fields: FieldInput[]) => {
    setStepError(null);
    setState((prev) => ({ ...prev, fields }));
  };

  const handleRecommendationsChange = (recommendations: FieldRecommendResult[]) => {
    setStepError(null);
    setState((prev) => ({ ...prev, recommendations }));
  };

  return (
    <section className="tb-page">
      <div className="tb-header">
        <h1 className="tb-header__title">建表工具</h1>
        <p className="tb-header__note">原型演示：不连接真实数据源，仅用于选库建表与标准推荐流程演示</p>
      </div>

      <ol className="tb-steps">
        {STEP_LABELS.map(({ step, label }) => (
          <li
            key={step}
            className={[
              'tb-steps__item',
              state.step === step ? 'tb-steps__item--active' : '',
              state.step > step ? 'tb-steps__item--done' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="tb-steps__index">{step}</span>
            <span className="tb-steps__label">{label}</span>
          </li>
        ))}
      </ol>

      <div className="tb-body">
        {state.step === 1 ? (
          <StepTarget
            engine={state.engine}
            database={state.database}
            onEngineChange={handleEngineChange}
            onDatabaseChange={handleDatabaseChange}
          />
        ) : state.step === 2 ? (
          <StepFields
            table={state.table}
            fields={state.fields}
            onTableChange={handleTableChange}
            onFieldsChange={handleFieldsChange}
          />
        ) : state.step === 3 ? (
          <StepRecommend
            table={state.table}
            fields={state.fields}
            recommendations={state.recommendations}
            onTableChange={handleTableChange}
            onRecommendationsChange={handleRecommendationsChange}
          />
        ) : (
          <div className="tb-step tb-step--stub">
            <p>建表结果（DDL 预览与提交）将在下一阶段接入。</p>
          </div>
        )}
      </div>

      {stepError ? (
        <p className="tb-step-error" role="alert">
          {stepError}
        </p>
      ) : null}

      <div className="tb-footer">
        <Button variant="default" onClick={goPrev} disabled={state.step === 1}>
          上一步
        </Button>
        <Button variant="primary" onClick={goNext} disabled={state.step === 4}>
          {state.step === 4 ? '完成' : state.step === 3 ? '确认建表' : '下一步'}
        </Button>
      </div>
    </section>
  );
}
