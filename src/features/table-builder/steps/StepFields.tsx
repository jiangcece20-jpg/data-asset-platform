import { useState } from 'react';
import type { FieldInput, TableInput } from '../../../types/tableBuilder';
import { Button } from '../../../components/base/Button';
import { Modal } from '../../../components/feedback/Modal';
import { parsePastedFields } from '../pasteParse';
import '../table-builder.css';

type StepFieldsProps = {
  table: TableInput;
  fields: FieldInput[];
  onTableChange: (patch: Partial<TableInput>) => void;
  onFieldsChange: (fields: FieldInput[]) => void;
};

let fieldIdSeq = 0;
function nextFieldId(): string {
  fieldIdSeq += 1;
  return `field-${Date.now()}-${fieldIdSeq}`;
}

export function StepFields({ table, fields, onTableChange, onFieldsChange }: StepFieldsProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const updateField = (id: string, patch: Partial<FieldInput>) => {
    onFieldsChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const addField = () => {
    onFieldsChange([...fields, { id: nextFieldId(), nameZh: '', nameEn: '', comment: '' }]);
  };

  const removeField = (id: string) => {
    onFieldsChange(fields.filter((field) => field.id !== id));
  };

  const openPasteModal = () => {
    setPasteText('');
    setPasteError(null);
    setPasteOpen(true);
  };

  const closePasteModal = () => {
    setPasteOpen(false);
  };

  const handleParseAndApply = () => {
    const result = parsePastedFields(pasteText);
    if (!result.ok) {
      setPasteError(result.message);
      return;
    }
    const parsedFields: FieldInput[] = result.rows.map((row) => ({
      id: nextFieldId(),
      nameZh: row.nameZh,
      nameEn: row.nameEn,
      comment: row.comment,
    }));
    onFieldsChange([...fields, ...parsedFields]);
    setPasteOpen(false);
  };

  return (
    <div className="tb-step">
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
            placeholder="如：客户维度表"
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
            placeholder="如：dim_customer"
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

      <div className="tb-fields-toolbar">
        <h3 className="tb-fields-toolbar__title">字段列表</h3>
        <div className="tb-fields-toolbar__actions">
          <Button variant="default" size="sm" onClick={openPasteModal}>
            粘贴导入
          </Button>
          <Button variant="default" size="sm" onClick={addField}>
            + 新增字段
          </Button>
        </div>
      </div>

      <div className="tb-fields-table-wrap">
        <table className="tb-fields-table">
          <thead>
            <tr>
              <th>中文名</th>
              <th>英文名</th>
              <th>注释</th>
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={4} className="tb-fields-table__empty">
                  暂无字段，请粘贴导入或点击「+ 新增字段」
                </td>
              </tr>
            ) : (
              fields.map((field, index) => (
                <tr key={field.id}>
                  <td>
                    <input
                      className="tb-fields-table__input"
                      value={field.nameZh}
                      onChange={(e) => updateField(field.id, { nameZh: e.target.value })}
                      aria-label={`字段${index + 1}中文名`}
                    />
                  </td>
                  <td>
                    <input
                      className="tb-fields-table__input tb-fields-table__input--mono"
                      value={field.nameEn}
                      onChange={(e) => updateField(field.id, { nameEn: e.target.value })}
                      aria-label={`字段${index + 1}英文名`}
                    />
                  </td>
                  <td>
                    <input
                      className="tb-fields-table__input"
                      value={field.comment}
                      onChange={(e) => updateField(field.id, { comment: e.target.value })}
                      aria-label={`字段${index + 1}注释`}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="tb-fields-table__remove"
                      onClick={() => removeField(field.id)}
                      aria-label={`删除字段${index + 1}`}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={pasteOpen} title="批量导入字段" onClose={closePasteModal}>
        <div className="tb-paste">
          <p className="tb-paste__hint">
            每行一个字段，按「中文名,英文名,注释」格式粘贴（支持 Tab 分隔），例如：客户编号,customer_code,客户唯一编号
          </p>
          <label className="tb-form__label" htmlFor="tb-paste-textarea">
            粘贴字段内容
          </label>
          <textarea
            id="tb-paste-textarea"
            className="tb-form__textarea tb-paste__textarea"
            rows={8}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          {pasteError ? <p className="tb-paste__error">{pasteError}</p> : null}
          <div className="tb-paste__footer">
            <Button variant="default" onClick={closePasteModal}>
              取消
            </Button>
            <Button variant="primary" onClick={handleParseAndApply}>
              解析并写入
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
