import { useEffect, useState } from 'react';
import type {
  FieldInput,
  FieldRecommendResult,
  FieldRecommendStatus,
  TableInput,
} from '../../../types/tableBuilder';
import { Button } from '../../../components/base/Button';
import { Modal } from '../../../components/feedback/Modal';
import { Tag } from '../../../components/base/Tag';
import {
  PUBLISHED_STANDARDS,
  UNSTANDARDIZED_TECH_DEFAULTS,
  matchWordRoots,
  recommendFields,
  recommendTable,
  recommendationsMatchFields,
} from '../recommend';
import { setDraftHandoff } from '../wizardStore';
import { parsePastedFields } from '../pasteParse';
import '../table-builder.css';

type StepFieldConfigProps = {
  table: TableInput;
  fields: FieldInput[];
  recommendations: FieldRecommendResult[];
  onTableChange: (patch: Partial<TableInput>) => void;
  onFieldsChange: (fields: FieldInput[]) => void;
  onRecommendationsChange: (recommendations: FieldRecommendResult[]) => void;
};

type TagTone = 'blue' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'cyan';

const STATUS_META: Record<FieldRecommendStatus, { label: string; tone: TagTone }> = {
  adopted: { label: '已采纳', tone: 'success' },
  reselected: { label: '已改选', tone: 'blue' },
  ignored: { label: '已忽略', tone: 'gray' },
  missing: { label: '缺标', tone: 'warning' },
  draft_started: { label: '草稿已发起', tone: 'purple' },
};

function countByStatus(recs: FieldRecommendResult[]): Record<FieldRecommendStatus, number> {
  const c: Record<FieldRecommendStatus, number> = { adopted: 0, reselected: 0, ignored: 0, missing: 0, draft_started: 0 };
  for (const r of recs) c[r.status] += 1;
  return c;
}

const DATA_TYPES = ['VARCHAR', 'CHAR', 'INT', 'BIGINT', 'DECIMAL', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'TEXT', 'DOUBLE', 'FLOAT'];
const NO_LENGTH_TYPES = ['DATE', 'TIMESTAMP', 'BOOLEAN', 'TEXT'];
const CLASSIFICATION_PATHS = ['待分类', '客户/基础信息/标识', '客户/基础信息/属性', '客户/基础信息/分类', '客户/联系信息/电话', '交易/订单信息', '商品/基础信息'];
const GRADES = ['待定', 'L1', 'L2', 'L3', 'L4'];

let fieldIdSeq = 0;
function nextFieldId(): string {
  fieldIdSeq += 1;
  return `field-${Date.now()}-${fieldIdSeq}`;
}

export function StepFieldConfig({
  table,
  fields,
  recommendations,
  onTableChange,
  onFieldsChange,
  onRecommendationsChange,
}: StepFieldConfigProps) {
  const [reselectTargetId, setReselectTargetId] = useState<string | null>(null);
  const [reselectCode, setReselectCode] = useState<string>(PUBLISHED_STANDARDS[0]?.code ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // 字段集合变化时重新生成推荐结果
  useEffect(() => {
    if (fields.length === 0) return;
    if (recommendations.length > 0 && recommendationsMatchFields(fields, recommendations)) return;
    const tableRec = recommendTable(table);
    if (!table.nameEn.trim()) {
      onTableChange({ nameEn: tableRec.nameEn });
    }
    onRecommendationsChange(recommendFields(fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations, fields, table]);

  const tableRecommend = recommendTable(table);
  const counts = countByStatus(recommendations);

  const updateRow = (id: string, patch: Partial<FieldRecommendResult>) => {
    onRecommendationsChange(recommendations.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  // ── 字段增删 ──

  const addField = () => {
    const newField: FieldInput = { id: nextFieldId(), nameZh: '', nameEn: '', comment: '' };
    const [newRec] = recommendFields([newField]);
    onFieldsChange([...fields, newField]);
    onRecommendationsChange([...recommendations, newRec]);
  };

  const removeField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
    onRecommendationsChange(recommendations.filter((r) => r.id !== id));
  };

  // ── 粘贴导入 ──

  const openPasteModal = () => { setPasteText(''); setPasteError(null); setPasteOpen(true); };
  const closePasteModal = () => { setPasteOpen(false); };

  const handleParseAndApply = () => {
    const result = parsePastedFields(pasteText);
    if (!result.ok) { setPasteError(result.message); return; }
    const parsed: FieldInput[] = result.rows.map((row) => ({
      id: nextFieldId(), nameZh: row.nameZh, nameEn: row.nameEn, comment: row.comment,
    }));
    const newRecs = recommendFields(parsed);
    onFieldsChange([...fields, ...parsed]);
    onRecommendationsChange([...recommendations, ...newRecs]);
    setPasteOpen(false);
  };

  // ── 英文名编辑 ──

  const handleNameEnChange = (id: string, nameEn: string) => {
    onFieldsChange(fields.map((f) => (f.id === id ? { ...f, nameEn } : f)));
    updateRow(id, { nameEn });
  };

  // ── 技术属性编辑 ──

  const handleDataTypeChange = (id: string, dataType: string) => { updateRow(id, { dataType }); };
  const handleLengthChange = (id: string, length: number | undefined) => { updateRow(id, { length }); };
  const handlePrecisionChange = (id: string, precision: number | undefined) => { updateRow(id, { precision }); };
  const handleNullableToggle = (id: string, nullable: boolean) => { updateRow(id, { nullable }); };
  const handlePrimaryKeyToggle = (id: string, primaryKey: boolean) => { updateRow(id, { primaryKey: primaryKey || undefined }); };
  const handleCodeTableChange = (id: string, codeTable: string) => { updateRow(id, { codeTable: codeTable || undefined }); };
  const handleClassificationChange = (id: string, classificationPath: string) => { updateRow(id, { classificationPath }); };
  const handleGradeChange = (id: string, grade: string) => { updateRow(id, { grade }); };

  // ── 标准改选/忽略/草稿 ──

  const handleIgnore = (row: FieldRecommendResult) => {
    const original = fields.find((f) => f.id === row.id);
    updateRow(row.id, {
      ...UNSTANDARDIZED_TECH_DEFAULTS,
      status: 'ignored',
      standard: undefined,
      confidence: 'low',
      nameZh: original?.nameZh ?? row.nameZh,
      nameEn: original?.nameEn ?? '',
      comment: original?.comment ?? row.comment,
      suggestedNameEn: row.suggestedNameEn,
      rationale: '已忽略标准匹配，标准派生的技术属性已重置为未落标状态，原始录入内容保留。',
    });
  };

  const openReselect = (row: FieldRecommendResult) => {
    setReselectTargetId(row.id);
    setReselectCode(row.standard?.code ?? PUBLISHED_STANDARDS[0]?.code ?? '');
  };
  const closeReselect = () => { setReselectTargetId(null); };

  const applyReselect = () => {
    if (!reselectTargetId) return;
    const std = PUBLISHED_STANDARDS.find((s) => s.code === reselectCode);
    if (!std) return;
    onFieldsChange(fields.map((f) => (f.id === reselectTargetId ? { ...f, nameZh: std.nameZh, nameEn: std.nameEn } : f)));
    updateRow(reselectTargetId, {
      status: 'reselected', standard: std, nameZh: std.nameZh, nameEn: std.nameEn,
      confidence: 'high', dataType: std.dataType, length: std.length, precision: std.precision,
      nullable: std.nullable, primaryKey: std.primaryKey, codeTable: std.codeTable,
      classificationPath: std.classificationPath, grade: std.grade,
      rationale: `用户手动改选为已发布标准 ${std.code}（${std.nameZh}）。`,
    });
    setReselectTargetId(null);
  };

  const handleDraft = (row: FieldRecommendResult) => {
    setDraftHandoff({
      fieldId: row.id, nameZh: row.nameZh, comment: row.comment,
      suggestedNameEn: row.suggestedNameEn ?? row.nameEn, dataType: row.dataType, source: 'table-builder',
    });
    window.location.hash = '#data-standard/draft';
  };

  // ── 词根推荐 ──

  const startEdit = (row: FieldRecommendResult) => { setEditingId(row.id); setEditValue(row.nameZh); };

  const confirmEdit = () => {
    if (!editingId) return;
    const field = fields.find((f) => f.id === editingId);
    if (!field) { setEditingId(null); return; }
    const updatedField = { ...field, nameZh: editValue };
    onFieldsChange(fields.map((f) => (f.id === editingId ? updatedField : f)));
    const [newRec] = recommendFields([updatedField]);
    onRecommendationsChange(recommendations.map((r) => (r.id === editingId ? newRec : r)));
    setEditingId(null);
  };

  const applyRootRecommendation = (id: string) => {
    const row = recommendations.find((r) => r.id === id);
    if (!row) return;
    const match = matchWordRoots(row.nameZh);
    if (!match) return;
    onFieldsChange(fields.map((f) => (f.id === id ? { ...f, nameEn: match.suggestedName } : f)));
    updateRow(id, {
      nameEn: match.suggestedName, rootMatch: match,
      rationale: `词根匹配：${match.roots.map((r) => `${r.name}→${r.abbreviation}`).join('、')}，推荐英文名 ${match.suggestedName}。未匹配到已发布标准。`,
    });
    setEditingId(null);
  };

  const handleBatchRootNaming = () => {
    const updatedRecs = recommendations.map((row) => {
      if (row.status === 'adopted' || row.status === 'reselected') return row;
      const match = matchWordRoots(row.nameZh);
      if (!match) return row;
      return {
        ...row, nameEn: row.nameEn || match.suggestedName, rootMatch: match,
        rationale: `词根匹配：${match.roots.map((r) => `${r.name}→${r.abbreviation}`).join('、')}，推荐英文名 ${match.suggestedName}。未匹配到已发布标准。`,
      };
    });
    onRecommendationsChange(updatedRecs);
    onFieldsChange(fields.map((f) => {
      const rec = updatedRecs.find((r) => r.id === f.id);
      return rec ? { ...f, nameEn: rec.nameEn } : f;
    }));
  };

  return (
    <div className="tb-step tb-recommend">
      <div className="tb-recommend__table-bar">
        <div className="tb-recommend__table-bar-main">
          <span>
            推荐表名：<strong>{tableRecommend.nameZh}</strong>
            <span className="tb-recommend__table-bar-en">（{tableRecommend.nameEn}）</span>
          </span>
          {table.nameEn.trim() !== tableRecommend.nameEn ? (
            <Button variant="default" size="sm" onClick={() => onTableChange({ nameEn: tableRecommend.nameEn })}>
              采纳建议英文表名
            </Button>
          ) : null}
        </div>
        <p className="tb-hint">{tableRecommend.rationale}</p>
      </div>

      <p className="tb-recommend__overview">
        {`推荐概览：已采纳 ${counts.adopted} · 已改选 ${counts.reselected} · 已忽略 ${counts.ignored} · 缺标 ${counts.missing} · 草稿已发起 ${counts.draft_started}`}
      </p>

      <div className="tb-fields-toolbar">
        <div className="tb-fields-toolbar__actions">
          <Button variant="default" size="sm" onClick={openPasteModal}>粘贴导入</Button>
          <Button variant="default" size="sm" onClick={addField}>+ 新增字段</Button>
          <Button variant="default" size="sm" onClick={handleBatchRootNaming}>词根命名</Button>
        </div>
      </div>

      <div className="tb-fields-table-wrap">
        <table className="tb-fields-table tb-recommend-table">
          <thead>
            <tr>
              <th aria-label="序号" />
              <th>中文名</th>
              <th>英文名</th>
              <th>类型（长度/精度）</th>
              <th>约束</th>
              <th>码表</th>
              <th>分类/密级</th>
              <th>匹配标准</th>
              <th>状态</th>
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {recommendations.length === 0 ? (
              <tr>
                <td colSpan={10} className="tb-fields-table__empty">
                  暂无字段，请点击「+ 新增字段」或「粘贴导入」
                </td>
              </tr>
            ) : (
              recommendations.map((row, index) => (
                <tr key={row.id}>
                  <td className="tb-recommend-table__index">{index + 1}</td>
                  <td className="tb-recommend-table__name-zh">
                    {editingId === row.id ? (
                      <div className="tb-root-edit">
                        <input
                          className="tb-fields-table__input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={confirmEdit}
                          onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); }}
                          aria-label="编辑字段中文名"
                        />
                        {(() => {
                          const match = matchWordRoots(editValue);
                          if (!match) return null;
                          return (
                            <div className="tb-root-dropdown">
                              <p className="tb-root-dropdown__title">词根匹配</p>
                              <button
                                type="button"
                                className="tb-root-dropdown__item"
                                onMouseDown={(e) => { e.preventDefault(); applyRootRecommendation(row.id); }}
                              >
                                <span className="tb-root-dropdown__name">{match.suggestedName}</span>
                                <span className="tb-root-dropdown__roots">
                                  {match.roots.map((r) => `${r.name}→${r.abbreviation}`).join(' · ')}
                                </span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <span
                        className="tb-recommend-table__name-zh-text"
                        onClick={() => startEdit(row)}
                        role="button"
                        tabIndex={0}
                      >
                        {row.nameZh || '（点击编辑）'}
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      className="tb-fields-table__input tb-fields-table__input--mono"
                      value={row.nameEn}
                      onChange={(e) => handleNameEnChange(row.id, e.target.value)}
                      aria-label={`字段${index + 1}英文名`}
                    />
                  </td>
                  <td>
                    <div className="tb-inline-type">
                      <select
                        className="tb-inline-select"
                        value={row.dataType}
                        onChange={(e) => handleDataTypeChange(row.id, e.target.value)}
                        aria-label={`字段${index + 1}数据类型`}
                      >
                        {DATA_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {!NO_LENGTH_TYPES.includes(row.dataType) ? (
                        <div className="tb-inline-type__size">
                          <input
                            type="number"
                            className="tb-fields-table__input tb-inline-input--sm"
                            value={row.length ?? ''}
                            onChange={(e) => handleLengthChange(row.id, e.target.value ? Number(e.target.value) : undefined)}
                            aria-label={`字段${index + 1}长度`}
                            placeholder="长度"
                          />
                          {row.dataType === 'DECIMAL' ? (
                            <input
                              type="number"
                              className="tb-fields-table__input tb-inline-input--sm"
                              value={row.precision ?? ''}
                              onChange={(e) => handlePrecisionChange(row.id, e.target.value ? Number(e.target.value) : undefined)}
                              aria-label={`字段${index + 1}精度`}
                              placeholder="精度"
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="tb-recommend-table__constraints">
                    <label className="tb-inline-check">
                      <input
                        type="checkbox"
                        checked={row.primaryKey ?? false}
                        onChange={(e) => handlePrimaryKeyToggle(row.id, e.target.checked)}
                      />
                      <span>主键</span>
                    </label>
                    <label className="tb-inline-check">
                      <input
                        type="checkbox"
                        checked={row.nullable}
                        onChange={(e) => handleNullableToggle(row.id, e.target.checked)}
                      />
                      <span>可空</span>
                    </label>
                  </td>
                  <td>
                    <input
                      className="tb-fields-table__input"
                      value={row.codeTable ?? ''}
                      onChange={(e) => handleCodeTableChange(row.id, e.target.value)}
                      aria-label={`字段${index + 1}码表`}
                      placeholder="-"
                    />
                  </td>
                  <td>
                    <select
                      className="tb-inline-select"
                      value={row.classificationPath}
                      onChange={(e) => handleClassificationChange(row.id, e.target.value)}
                      aria-label={`字段${index + 1}分类`}
                    >
                      {CLASSIFICATION_PATHS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      className="tb-inline-select"
                      value={row.grade}
                      onChange={(e) => handleGradeChange(row.id, e.target.value)}
                      aria-label={`字段${index + 1}密级`}
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                  <td>{row.standard ? `${row.standard.code} ${row.standard.nameZh}` : '-'}</td>
                  <td>
                    <Tag tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Tag>
                    {row.status === 'ignored' ? <Tag tone="warning">未落标</Tag> : null}
                  </td>
                  <td className="tb-recommend-table__actions">
                    {row.rootMatch && !row.standard ? (
                      <Button variant="text" size="sm" onClick={() => applyRootRecommendation(row.id)}>
                        应用词根
                      </Button>
                    ) : null}
                    <Button variant="text" size="sm" onClick={() => openReselect(row)}>
                      改选
                    </Button>
                    {row.status !== 'ignored' ? (
                      <Button variant="text" size="sm" onClick={() => handleIgnore(row)}>
                        忽略
                      </Button>
                    ) : null}
                    {row.status === 'missing' ? (
                      <Button variant="text" size="sm" onClick={() => handleDraft(row)}>
                        新建标准草稿
                      </Button>
                    ) : null}
                    <Button variant="text" size="sm" onClick={() => removeField(row.id)}>
                      删除
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={reselectTargetId !== null} title="改选标准" onClose={closeReselect}>
        <div className="tb-reselect">
          <label className="tb-form__label" htmlFor="tb-reselect-select">
            选择已发布标准
          </label>
          <select
            id="tb-reselect-select"
            className="tb-form__select"
            value={reselectCode}
            onChange={(e) => setReselectCode(e.target.value)}
          >
            {PUBLISHED_STANDARDS.map((standard) => (
              <option key={standard.code} value={standard.code}>
                {standard.code} · {standard.nameZh}（{standard.nameEn}）
              </option>
            ))}
          </select>
          <div className="tb-paste__footer">
            <Button variant="default" onClick={closeReselect}>取消</Button>
            <Button variant="primary" onClick={applyReselect}>确认改选</Button>
          </div>
        </div>
      </Modal>

      <Modal open={pasteOpen} title="批量导入字段" onClose={closePasteModal}>
        <div className="tb-paste">
          <p className="tb-paste__hint">
            每行一个字段，按「中文名,英文名,注释」格式粘贴（支持 Tab 分隔），例如：客户编号,customer_code,客户唯一编号
          </p>
          <label className="tb-form__label" htmlFor="tb-paste-textarea">粘贴字段内容</label>
          <textarea
            id="tb-paste-textarea"
            className="tb-form__textarea tb-paste__textarea"
            rows={8}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          {pasteError ? <p className="tb-paste__error">{pasteError}</p> : null}
          <div className="tb-paste__footer">
            <Button variant="default" onClick={closePasteModal}>取消</Button>
            <Button variant="primary" onClick={handleParseAndApply}>解析并写入</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
