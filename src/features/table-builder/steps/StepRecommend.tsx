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
import { PUBLISHED_STANDARDS, recommendFields, recommendTable } from '../recommend';
import { setDraftHandoff } from '../wizardStore';
import '../table-builder.css';

type StepRecommendProps = {
  table: TableInput;
  fields: FieldInput[];
  recommendations: FieldRecommendResult[];
  onTableChange: (patch: Partial<TableInput>) => void;
  onRecommendationsChange: (recommendations: FieldRecommendResult[]) => void;
};

type TagTone = 'blue' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'cyan';

/**
 * 概览行使用的是产品约定的状态词汇（已采纳/已改选/已忽略/未落标/草稿已发起），
 * 行内标签则使用同义表述，避免同一状态多行重复出现导致同一关键词分散在多个独立节点上。
 */
const STATUS_META: Record<FieldRecommendStatus, { overviewLabel: string; rowLabel: string; tone: TagTone }> = {
  adopted: { overviewLabel: '已采纳', rowLabel: '标准匹配', tone: 'success' },
  reselected: { overviewLabel: '已改选', rowLabel: '人工改选', tone: 'blue' },
  ignored: { overviewLabel: '已忽略', rowLabel: '已跳过', tone: 'gray' },
  missing: { overviewLabel: '未落标', rowLabel: '待补标准', tone: 'warning' },
  draft_started: { overviewLabel: '草稿已发起', rowLabel: '草稿处理中', tone: 'purple' },
};

const CONFIDENCE_LABELS: Record<FieldRecommendResult['confidence'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function formatType(row: FieldRecommendResult): string {
  if (!row.length) return row.dataType;
  return row.precision !== undefined
    ? `${row.dataType}(${row.length},${row.precision})`
    : `${row.dataType}(${row.length})`;
}

function countByStatus(recommendations: FieldRecommendResult[]): Record<FieldRecommendStatus, number> {
  const counts: Record<FieldRecommendStatus, number> = {
    adopted: 0,
    reselected: 0,
    ignored: 0,
    missing: 0,
    draft_started: 0,
  };
  for (const row of recommendations) {
    counts[row.status] += 1;
  }
  return counts;
}

export function StepRecommend({
  table,
  fields,
  recommendations,
  onTableChange,
  onRecommendationsChange,
}: StepRecommendProps) {
  const [reselectTargetId, setReselectTargetId] = useState<string | null>(null);
  const [reselectCode, setReselectCode] = useState<string>(PUBLISHED_STANDARDS[0]?.code ?? '');

  useEffect(() => {
    if (recommendations.length > 0 || fields.length === 0) return;
    const tableRec = recommendTable(table);
    if (!table.nameEn.trim()) {
      onTableChange({ nameEn: tableRec.nameEn });
    }
    onRecommendationsChange(recommendFields(fields));
    // 仅在进入 Step3 且尚无推荐结果时执行一次；已生成推荐后交由用户操作驱动更新。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations.length, fields, table]);

  const tableRecommend = recommendTable(table);
  const missingRows = recommendations.filter((row) => row.status === 'missing');
  const counts = countByStatus(recommendations);

  const updateRow = (id: string, patch: Partial<FieldRecommendResult>) => {
    onRecommendationsChange(recommendations.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleIgnore = (row: FieldRecommendResult) => {
    const original = fields.find((f) => f.id === row.id);
    updateRow(row.id, {
      status: 'ignored',
      standard: undefined,
      confidence: 'low',
      nameZh: original?.nameZh ?? row.nameZh,
      nameEn: original?.nameEn ?? '',
      comment: original?.comment ?? row.comment,
      rationale: '已跳过标准匹配，保留原始录入内容。',
    });
  };

  const openReselect = (row: FieldRecommendResult) => {
    setReselectTargetId(row.id);
    setReselectCode(row.standard?.code ?? PUBLISHED_STANDARDS[0]?.code ?? '');
  };

  const closeReselect = () => {
    setReselectTargetId(null);
  };

  const applyReselect = () => {
    if (!reselectTargetId) return;
    const standard = PUBLISHED_STANDARDS.find((s) => s.code === reselectCode);
    if (!standard) return;
    updateRow(reselectTargetId, {
      status: 'reselected',
      standard,
      nameZh: standard.nameZh,
      nameEn: standard.nameEn,
      confidence: 'high',
      dataType: standard.dataType,
      length: standard.length,
      precision: standard.precision,
      nullable: standard.nullable,
      primaryKey: standard.primaryKey,
      codeTable: standard.codeTable,
      classificationPath: standard.classificationPath,
      grade: standard.grade,
      rationale: `用户手动改选为已发布标准 ${standard.code}（${standard.nameZh}）。`,
    });
    setReselectTargetId(null);
  };

  const handleDraft = (row: FieldRecommendResult) => {
    setDraftHandoff({
      fieldId: row.id,
      nameZh: row.nameZh,
      comment: row.comment,
      suggestedNameEn: row.suggestedNameEn ?? row.nameEn,
      dataType: row.dataType,
      source: 'table-builder',
    });
    window.location.hash = '#data-standard/draft';
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
        {`推荐概览：已采纳 ${counts.adopted} · 已改选 ${counts.reselected} · 已忽略 ${counts.ignored} · 未落标 ${counts.missing} · 草稿已发起 ${counts.draft_started}`}
      </p>

      <div className="tb-fields-table-wrap">
        <table className="tb-fields-table tb-recommend-table">
          <thead>
            <tr>
              <th>中文名</th>
              <th>英文名</th>
              <th>类型（长度/精度）</th>
              <th>约束</th>
              <th>码表</th>
              <th>分类/密级</th>
              <th>匹配标准</th>
              <th>置信度</th>
              <th>推荐依据</th>
              <th>状态</th>
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {recommendations.length === 0 ? (
              <tr>
                <td colSpan={11} className="tb-fields-table__empty">
                  暂无推荐结果
                </td>
              </tr>
            ) : (
              recommendations.map((row) => (
                <tr key={row.id}>
                  <td>{row.nameZh}</td>
                  <td className="tb-form__input--mono">{row.nameEn || '（待补充英文名）'}</td>
                  <td>{formatType(row)}</td>
                  <td className="tb-recommend-table__constraints">
                    {row.primaryKey ? <Tag tone="purple">主键</Tag> : null}
                    <Tag tone={row.nullable ? 'gray' : 'warning'}>{row.nullable ? '可空' : '必填'}</Tag>
                  </td>
                  <td>{row.codeTable ?? '-'}</td>
                  <td>
                    {row.classificationPath}
                    <br />
                    {row.grade}
                  </td>
                  <td>{row.standard ? `${row.standard.code} ${row.standard.nameZh}` : '-'}</td>
                  <td>{CONFIDENCE_LABELS[row.confidence]}</td>
                  <td className="tb-recommend-table__rationale">{row.rationale}</td>
                  <td>
                    <Tag tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].rowLabel}</Tag>
                  </td>
                  <td className="tb-recommend-table__actions">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="tb-recommend__missing">
        <h3 className="tb-fields-toolbar__title">缺标汇总</h3>
        {missingRows.length === 0 ? (
          <p className="tb-hint">全部字段均已匹配到已发布标准。</p>
        ) : (
          <ul className="tb-recommend__missing-list">
            {missingRows.map((row) => (
              <li key={row.id}>
                {row.nameZh}
                {row.suggestedNameEn ? `（建议英文名 ${row.suggestedNameEn}）` : null}
              </li>
            ))}
          </ul>
        )}
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
            <Button variant="default" onClick={closeReselect}>
              取消
            </Button>
            <Button variant="primary" onClick={applyReselect}>
              确认改选
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
