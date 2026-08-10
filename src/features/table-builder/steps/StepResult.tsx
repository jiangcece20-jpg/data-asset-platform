import { useState } from 'react';
import type { FieldRecommendResult, TableInput } from '../../../types/tableBuilder';
import { Button } from '../../../components/base/Button';
import { buildDdl, type EngineType } from '../ddlTemplates';
import { formatFieldType, recommendTable } from '../recommend';
import '../table-builder.css';

/** 原型演示：失败场景固定为「目标库无权限」，不接入真实建表链路。 */
export const DEMO_FAILURE_REASON = '目标库无权限（演示）';

type CopyState = 'idle' | 'copied' | 'failed';

type StepResultProps = {
  outcome: 'success' | 'failure' | null;
  engine: EngineType;
  database: string;
  table: TableInput;
  recommendations: FieldRecommendResult[];
  onBackToRecommend: () => void;
  onRestart: () => void;
};

function formatCreatedAt(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function StepResult({
  outcome,
  engine,
  database,
  table,
  recommendations,
  onBackToRecommend,
  onRestart,
}: StepResultProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  // 原型演示：结果页首次渲染即视为「建表」发生的时刻，仅用于成功摘要展示，不代表真实建表时间。
  const [createdAt] = useState(() => new Date());
  const isFailure = outcome === 'failure';
  const hasDraftStarted = recommendations.some((row) => row.status === 'draft_started');

  const goToDataStandard = () => {
    window.location.hash = '#data-standard';
  };

  const tableRecommend = recommendTable(table);
  const tableNameEn = table.nameEn.trim() || tableRecommend.nameEn;
  const tableComment = table.description.trim() || tableRecommend.nameZh;

  const ddl = buildDdl({
    engine,
    database,
    tableNameEn,
    tableComment,
    fields: recommendations.map((row) => ({
      nameEn: row.nameEn || row.suggestedNameEn || row.id,
      dataType: formatFieldType(row),
      nullable: row.nullable,
      comment: row.comment,
    })),
  });

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1500);
      return;
    }
    try {
      await navigator.clipboard.writeText(ddl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 1500);
  };

  return (
    <div className="tb-step tb-result">
      {isFailure ? (
        <div className="tb-result__banner tb-result__banner--failure" role="alert">
          <span className="tb-result__banner-icon" aria-hidden="true">
            ✕
          </span>
          <div>
            <p className="tb-result__banner-title">建表失败（演示）</p>
            <p className="tb-result__banner-desc">{DEMO_FAILURE_REASON}</p>
          </div>
        </div>
      ) : (
        <div className="tb-result__banner tb-result__banner--success" role="status">
          <span className="tb-result__banner-icon" aria-hidden="true">
            ✓
          </span>
          <div>
            <p className="tb-result__banner-title">建表成功（演示）</p>
            <p className="tb-result__banner-desc">
              {`${database}.${tableNameEn} 建表语句已生成，原型演示不会真实创建表结构`}
            </p>
          </div>
        </div>
      )}

      <div className="tb-result__summary">
        <span>
          数据源类型：<strong>{engine}</strong>
        </span>
        <span>
          目标库：<strong>{database}</strong>
        </span>
        <span>
          表名：<strong>{tableRecommend.nameZh}</strong>
          <span className="tb-recommend__table-bar-en">（{tableNameEn}）</span>
        </span>
        <span>
          字段数：<strong>{recommendations.length}</strong>
        </span>
        {isFailure ? null : (
          <span>
            创建时间：<strong>{formatCreatedAt(createdAt)}</strong>
            <span className="tb-recommend__table-bar-en">（演示时间，非真实建表时间）</span>
          </span>
        )}
      </div>

      <div className="tb-result__ddl">
        <div className="tb-result__ddl-header">
          <h3 className="tb-fields-toolbar__title">DDL 预览</h3>
          <Button variant="default" size="sm" onClick={handleCopy}>
            {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败，请手动选择' : '复制 DDL'}
          </Button>
        </div>
        <pre className="tb-result__ddl-code">{ddl}</pre>
      </div>

      <div className="tb-result__actions">
        {isFailure ? (
          <Button variant="default" onClick={onBackToRecommend}>
            返回修改
          </Button>
        ) : null}
        <Button variant="default" onClick={goToDataStandard}>
          {hasDraftStarted ? '查看相关草稿' : '去数据标准（原型演示）'}
        </Button>
        <Button variant="primary" onClick={onRestart}>
          重新建表
        </Button>
      </div>
    </div>
  );
}
