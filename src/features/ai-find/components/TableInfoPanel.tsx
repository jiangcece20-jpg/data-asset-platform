import { useState } from 'react';
import { Button } from '../../../components/base/Button';
import { Tag } from '../../../components/base/Tag';
import { toast } from '../../../components/feedback/Toast';
import type { TableAsset } from '../../../types/aiFind';

type Props = {
  table: TableAsset;
  onOpenDetail: () => void;
};

/** 表信息页：元信息 + 业务说明 + 表结构；查询统一去即席查询工作台 */
export function TableInfoPanel({ table, onOpenDetail }: Props) {
  const [schemaOpen, setSchemaOpen] = useState(true);

  const gotoWorkbench = () => {
    toast.info(`已携带表 ${table.name} 打开「即席查询」工作台，表名与字段信息自动带入`);
    window.location.hash = 'workbench';
  };

  return (
    <div className="ai-find__panel">
      <div className="ai-find__panel-header">
        <Tag tone="blue">表</Tag>
        <div>
          <div className="ai-find__panel-title">{table.name}</div>
          <div className="ai-find__panel-sub">{table.cnName} · {table.source} · {table.domain}</div>
        </div>
        <div className="ai-find__panel-actions">
          <button type="button" className="ai-find__btn-outline" onClick={onOpenDetail}>完整详情</button>
        </div>
      </div>

      <div className="ai-find__meta-grid">
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">负责人</span><span className="ai-find__meta-value">{table.owner}</span></div>
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">近30天查询量</span><span className="ai-find__meta-value">{table.heat}</span></div>
        <div className="ai-find__meta-item">
          <span className="ai-find__meta-label">权限状态</span>
          <span className={table.perm === 'ok' ? 'ai-find__meta-value ai-find__meta-value--ok' : 'ai-find__meta-value ai-find__meta-value--apply'}>
            {table.perm === 'ok' ? '已有权限' : '申请权限'}
          </span>
        </div>
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">更新频率</span><span className="ai-find__meta-value">{table.freq}</span></div>
      </div>

      <div className="ai-find__business-tip">💡 <strong>这张表能帮你看：</strong>{table.tip}</div>

      <button type="button" className="ai-find__schema-toggle" onClick={() => setSchemaOpen((v) => !v)}>
        <span>📋 表结构</span>
        <span className={schemaOpen ? 'ai-find__toggle-arrow' : 'ai-find__toggle-arrow ai-find__toggle-arrow--closed'}>▼</span>
        <span className="ai-find__schema-count">{table.schema.length} 个字段</span>
      </button>
      {schemaOpen && (
        <div className="ai-find__schema-wrap">
          <table className="ai-find__table">
            <thead><tr><th>字段</th><th>类型</th><th>业务含义</th></tr></thead>
            <tbody>
              {table.schema.map((f) => (
                <tr key={f.col}>
                  <td className="ai-find__code">{f.col}</td>
                  <td className="ai-find__code ai-find__code--muted">{f.type}</td>
                  <td>{f.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ai-find__table-cta">
        <p>需要查这张表的数据时，去即席查询工作台执行。<br />跳转会自动带上表名和字段信息。</p>
        <Button variant="primary" onClick={gotoWorkbench}>去即席查询工作台 →</Button>
      </div>
    </div>
  );
}
