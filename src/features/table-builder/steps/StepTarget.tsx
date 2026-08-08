import type { EngineType } from '../ddlTemplates';
import { DEMO_DATABASES } from '../mockStandards';
import '../table-builder.css';

const ENGINE_OPTIONS: EngineType[] = ['Hive', 'MaxCompute', 'MySQL'];

type StepTargetProps = {
  engine: EngineType;
  database: string;
  onEngineChange: (engine: EngineType) => void;
  onDatabaseChange: (database: string) => void;
};

export function StepTarget({ engine, database, onEngineChange, onDatabaseChange }: StepTargetProps) {
  const databaseOptions = DEMO_DATABASES[engine];

  return (
    <div className="tb-step">
      <p className="tb-hint">原型演示：不连接真实数据源，以下类型与库列表均为模拟数据，仅用于流程演示</p>
      <div className="tb-form">
        <div className="tb-form__field">
          <label className="tb-form__label" htmlFor="tb-engine">
            数据源类型
          </label>
          <select
            id="tb-engine"
            className="tb-form__select"
            value={engine}
            onChange={(e) => onEngineChange(e.target.value as EngineType)}
          >
            {ENGINE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="tb-form__field">
          <label className="tb-form__label" htmlFor="tb-database">
            目标库
          </label>
          <select
            id="tb-database"
            className="tb-form__select"
            value={database}
            onChange={(e) => onDatabaseChange(e.target.value)}
          >
            <option value="">请选择</option>
            {databaseOptions.map((db) => (
              <option key={db} value={db}>
                {db}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
