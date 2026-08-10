import { useEffect, useState } from 'react';
import type { FieldInput, FieldRecommendResult, TableInput } from '../../types/tableBuilder';
import { Button } from '../../components/base/Button';
import type { EngineType } from './ddlTemplates';
import { clearWizard, createDefaultWizard, loadWizard, saveWizard, type WizardState, type WizardStep } from './wizardStore';
import { canConfirmCreate, canEnterFieldConfig, canEnterTableInfo } from './stepGates';
import { StepTarget } from './steps/StepTarget';
import { StepTableInfo } from './steps/StepTableInfo';
import { StepFieldConfig } from './steps/StepFieldConfig';
import { StepResult } from './steps/StepResult';
import './table-builder.css';

const STEP_LABELS: { step: WizardStep; label: string }[] = [
  { step: 1, label: '选库' },
  { step: 2, label: '表名信息' },
  { step: 3, label: '字段配置' },
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
      const error = canEnterTableInfo(state);
      if (error) {
        setStepError(error);
        return;
      }
    }
    if (state.step === 2) {
      const error = canEnterFieldConfig(state);
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

  const handleSimulateFailure = () => {
    const error = canConfirmCreate(state);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setState((prev) => ({ ...prev, step: 4, createOutcome: 'failure' }));
  };

  const handleRestart = () => {
    setStepError(null);
    clearWizard();
    setState(createDefaultWizard());
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
          <StepTableInfo
            table={state.table}
            onTableChange={handleTableChange}
          />
        ) : state.step === 3 ? (
          <StepFieldConfig
            table={state.table}
            fields={state.fields}
            recommendations={state.recommendations}
            onTableChange={handleTableChange}
            onFieldsChange={handleFieldsChange}
            onRecommendationsChange={handleRecommendationsChange}
          />
        ) : (
          <StepResult
            outcome={state.createOutcome}
            engine={state.engine}
            database={state.database}
            table={state.table}
            recommendations={state.recommendations}
            onBackToRecommend={goPrev}
            onRestart={handleRestart}
          />
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
        {state.step === 3 ? (
          <Button variant="danger" onClick={handleSimulateFailure}>
            模拟失败（演示）
          </Button>
        ) : null}
        {state.step !== 4 ? (
          <Button variant="primary" onClick={goNext}>
            {state.step === 3 ? '确认建表' : '下一步'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
