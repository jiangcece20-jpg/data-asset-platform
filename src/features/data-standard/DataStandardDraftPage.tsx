import { useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { consumeDraftHandoff, markFieldDraftStarted } from '../table-builder/wizardStore';
import './data-standard.css';

type DraftForm = {
  fieldId: string | null;
  nameZh: string;
  nameEn: string;
  comment: string;
  dataType: string;
  classificationPath: string;
};

const DATA_TYPES = ['VARCHAR', 'CHAR', 'STRING', 'INT', 'BIGINT', 'DECIMAL', 'DATE', 'DATETIME', 'BOOLEAN'];

function buildInitialForm(): DraftForm {
  const handoff = consumeDraftHandoff();
  if (!handoff) {
    return {
      fieldId: null,
      nameZh: '',
      nameEn: '',
      comment: '',
      dataType: 'VARCHAR',
      classificationPath: '',
    };
  }
  return {
    fieldId: handoff.fieldId,
    nameZh: handoff.nameZh,
    nameEn: handoff.suggestedNameEn ?? '',
    comment: handoff.comment,
    dataType: handoff.dataType || 'VARCHAR',
    classificationPath: '',
  };
}

export function DataStandardDraftPage() {
  const [form, setForm] = useState<DraftForm>(buildInitialForm);

  const goBackToTableBuilder = () => {
    window.location.hash = '#table-builder';
  };

  const handleSave = () => {
    if (form.fieldId) {
      markFieldDraftStarted(form.fieldId);
    }
    goBackToTableBuilder();
  };

  const handleCancel = () => {
    goBackToTableBuilder();
  };

  return (
    <section className="dstd-page">
      <div className="dstd-header">
        <div>
          <h1 className="dstd-header__title">新建标准草稿</h1>
          <p className="dstd-header__note">原型：草稿仅演示，不入库</p>
        </div>
        {form.fieldId ? (
          <Tag tone="blue">来自建表工具缺标交接 · {form.fieldId}</Tag>
        ) : null}
      </div>

      <div className="dstd-section">
        <div className="dstd-form">
          <div className="dstd-form__field">
            <label className="dstd-form__label" htmlFor="dstd-name-zh">
              标准中文名<span className="dstd-form__required">*</span>
            </label>
            <input
              id="dstd-name-zh"
              className="dstd-form__input"
              value={form.nameZh}
              onChange={(e) => setForm((prev) => ({ ...prev, nameZh: e.target.value }))}
              placeholder="如：客户编号"
            />
          </div>

          <div className="dstd-form__field">
            <label className="dstd-form__label" htmlFor="dstd-name-en">
              标准英文名<span className="dstd-form__required">*</span>
            </label>
            <input
              id="dstd-name-en"
              className="dstd-form__input dstd-form__input--mono"
              value={form.nameEn}
              onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
              placeholder="如：customer_code"
            />
          </div>

          <div className="dstd-form__field">
            <label className="dstd-form__label" htmlFor="dstd-data-type">
              数据类型
            </label>
            <select
              id="dstd-data-type"
              className="dstd-form__select"
              value={form.dataType}
              onChange={(e) => setForm((prev) => ({ ...prev, dataType: e.target.value }))}
            >
              {DATA_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="dstd-form__field">
            <label className="dstd-form__label" htmlFor="dstd-classification">
              分类路径
            </label>
            <input
              id="dstd-classification"
              className="dstd-form__input"
              value={form.classificationPath}
              onChange={(e) => setForm((prev) => ({ ...prev, classificationPath: e.target.value }))}
              placeholder="如：客户/基础信息/标识"
            />
          </div>

          <div className="dstd-form__field dstd-form__field--full">
            <label className="dstd-form__label" htmlFor="dstd-comment">
              业务说明
            </label>
            <textarea
              id="dstd-comment"
              className="dstd-form__textarea"
              value={form.comment}
              onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
              rows={3}
              placeholder="补充该标准的业务口径与使用场景"
            />
          </div>
        </div>

        <div className="dstd-form__footer">
          <Button variant="default" onClick={handleCancel}>取消</Button>
          <Button variant="primary" onClick={handleSave}>保存草稿</Button>
        </div>
      </div>
    </section>
  );
}
