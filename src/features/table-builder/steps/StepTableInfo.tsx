import type { ModelingLayer, TableInput, TableNamingConfig } from '../../../types/tableBuilder';
import {
  BUSINESS_CATEGORIES,
  DATA_SYSTEMS,
  FIELD_META,
  LAYER_FIELDS,
  MODELING_LAYERS,
  PARTITION_TYPES,
  generateTableName,
  getDefaultNamingConfig,
  validateSnakeCase,
} from '../tableNaming';
import '../table-builder.css';

type StepTableInfoProps = {
  table: TableInput;
  onTableChange: (patch: Partial<TableInput>) => void;
};

export function StepTableInfo({ table, onTableChange }: StepTableInfoProps) {
  const config = table.namingConfig ?? getDefaultNamingConfig();
  const autoName = generateTableName(config);

  const updateConfig = (patch: Partial<TableNamingConfig>) => {
    const newConfig = { ...config, ...patch };
    const newName = generateTableName(newConfig);
    onTableChange({ namingConfig: newConfig, nameEn: newName });
  };

  const handleLayerChange = (layer: ModelingLayer) => {
    updateConfig({ layer });
  };

  const handleCategoryChange = (code: string) => {
    const cat = BUSINESS_CATEGORIES.find((c) => c.code === code);
    const newDomain = cat?.domains.some((d) => d.code === config.businessDomain)
      ? config.businessDomain
      : '';
    const newSubject = cat?.subjectDomains.some((s) => s.code === config.subjectDomain)
      ? config.subjectDomain
      : '';
    updateConfig({ businessCategory: code, businessDomain: newDomain, subjectDomain: newSubject });
  };

  const fields = LAYER_FIELDS[config.layer];
  const selectedCategory = BUSINESS_CATEGORIES.find((c) => c.code === config.businessCategory);

  return (
    <div className="tb-step">
      {/* 建模分层选择 */}
      <div className="tb-naming__layer">
        <label className="tb-form__label">建模分层</label>
        <div className="tb-layer-tabs">
          {MODELING_LAYERS.map((l) => (
            <button
              key={l.key}
              type="button"
              className={
                config.layer === l.key ? 'tb-layer-tab tb-layer-tab--active' : 'tb-layer-tab'
              }
              onClick={() => handleLayerChange(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 动态配置字段 */}
      <div className="tb-form tb-naming-form">
        {fields.map((fieldName) => {
          const meta = FIELD_META[fieldName];
          const fieldValue = config[fieldName as keyof TableNamingConfig] as string;

          if (meta.type === 'select') {
            let options: { code: string; nameZh: string }[] = [];
            if (fieldName === 'businessCategory') {
              options = BUSINESS_CATEGORIES.map((c) => ({ code: c.code, nameZh: c.nameZh }));
              if (config.layer === 'DIM') {
                options = [{ code: '', nameZh: '无' }, ...options];
              }
            } else if (fieldName === 'businessDomain') {
              options = selectedCategory?.domains ?? [];
            } else if (fieldName === 'subjectDomain') {
              options = selectedCategory?.subjectDomains ?? [];
            } else if (fieldName === 'dataSystemName') {
              options = DATA_SYSTEMS;
            }

            return (
              <div className="tb-form__field" key={fieldName}>
                <label className="tb-form__label" htmlFor={`tb-naming-${fieldName}`}>
                  {meta.label}
                </label>
                <select
                  id={`tb-naming-${fieldName}`}
                  className="tb-form__select"
                  value={fieldValue}
                  onChange={(e) => {
                    if (fieldName === 'businessCategory') {
                      handleCategoryChange(e.target.value);
                    } else {
                      updateConfig({ [fieldName]: e.target.value } as Partial<TableNamingConfig>);
                    }
                  }}
                >
                  <option value="">请选择</option>
                  {options.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.code} {o.nameZh}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (meta.type === 'input') {
            const error = validateSnakeCase(fieldValue);
            return (
              <div className="tb-form__field" key={fieldName}>
                <label className="tb-form__label" htmlFor={`tb-naming-${fieldName}`}>
                  {meta.label}
                </label>
                <input
                  id={`tb-naming-${fieldName}`}
                  className="tb-form__input tb-form__input--mono"
                  value={fieldValue}
                  onChange={(e) =>
                    updateConfig({ [fieldName]: e.target.value } as Partial<TableNamingConfig>)
                  }
                  placeholder={meta.placeholder}
                />
                {error ? <span className="tb-form__error">{error}</span> : null}
              </div>
            );
          }

          if (meta.type === 'radio') {
            return (
              <div className="tb-form__field" key={fieldName}>
                <label className="tb-form__label">{meta.label}</label>
                <div className="tb-radio-group">
                  {PARTITION_TYPES.map((p) => (
                    <label key={p.key} className="tb-radio-item">
                      <input
                        type="radio"
                        name="partitionType"
                        value={p.key}
                        checked={config.partitionType === p.key}
                        onChange={() => updateConfig({ partitionType: p.key })}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* 自动生成表名预览 */}
      <div className="tb-naming-preview">
        <span className="tb-naming-preview__label">自动生成表名：</span>
        <code className="tb-naming-preview__code">{autoName}</code>
      </div>

      {/* 中文表名 / 英文表名 / 表描述 */}
      <div className="tb-form">
        <div className="tb-form__field">
          <label className="tb-form__label" htmlFor="tb-table-name-zh">
            中文表名
          </label>
          <input
            id="tb-table-name-zh"
            className="tb-form__input"
            value={table.nameZh}
            onChange={(e) => onTableChange({ nameZh: e.target.value })}
            placeholder="如：运单运输明细表"
          />
        </div>

        <div className="tb-form__field">
          <label className="tb-form__label" htmlFor="tb-table-name-en">
            英文表名
          </label>
          <input
            id="tb-table-name-en"
            className="tb-form__input tb-form__input--mono"
            value={table.nameEn}
            onChange={(e) => onTableChange({ nameEn: e.target.value })}
            placeholder={autoName}
          />
        </div>

        <div className="tb-form__field tb-form__field--full">
          <label className="tb-form__label" htmlFor="tb-table-desc">
            表描述
          </label>
          <textarea
            id="tb-table-desc"
            className="tb-form__textarea"
            rows={2}
            value={table.description}
            onChange={(e) => onTableChange({ description: e.target.value })}
            placeholder="补充该表的业务口径与用途"
          />
        </div>
      </div>
    </div>
  );
}
