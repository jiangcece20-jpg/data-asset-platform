import { useEffect, useState } from 'react';
import type { FieldInput, FieldRecommendResult, TableInput } from '../../types/tableBuilder';
import { Button } from '../../components/base/Button';
import type { EngineType } from './ddlTemplates';
import { clearWizard, createDefaultWizard, loadWizard, saveWizard, type WizardState, type WizardStep } from './wizardStore';
import { canConfirmCreate, canEnterFields, canEnterRecommend } from './stepGates';
import { StepTarget } from './steps/StepTarget';
import { StepFields } from './steps/StepFields';
import { StepRecommend } from './steps/StepRecommend';
import { StepResult } from './steps/StepResult';
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
    setState((prev) => {
      const table = { ...prev.table, ...patch };
      // 仅在 Step2 录入阶段编辑表名/描述时才需要清空推荐结果；Step3「采纳建议英文表名」
      // 等操作复用同一个 handler，但不应使已生成的字段推荐结果失效。
      if (prev.step === 2 && prev.recommendations.length > 0) {
        return { ...prev, table, recommendations: [] };
      }
      return { ...prev, table };
    });
  };

  const handleFieldsChange = (fields: FieldInput[]) => {
    setStepError(null);
    // 字段列表在 Step2 发生任何变化（编辑/新增/删除/粘贴）后，此前生成的推荐结果即视为
    // 过期，清空后交由 Step3 的进入逻辑重新生成，避免残留旧字段的标准匹配结果。
    setState((prev) => ({ ...prev, fields, recommendations: [] }));
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
