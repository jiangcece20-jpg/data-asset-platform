import { useState } from 'react';
import { Button } from '../../../components/base/Button';
import { Tabs, type TabItem } from '../../../components/base/Tabs';
import { Tag } from '../../../components/base/Tag';
import { Drawer } from '../../../components/feedback/Drawer';
import { toast } from '../../../components/feedback/Toast';
import { aiFindLineage } from '../../../mocks/aiFind';
import type { AssetCard, SchemaField, TableAsset } from '../../../types/aiFind';

export type DrawerTarget =
  | { kind: 'table'; table: TableAsset }
  | { kind: 'asset'; asset: AssetCard };

type Props = {
  target: DrawerTarget;
  onClose: () => void;
  onOpenTable: (tableKey: string) => void;
};

/** 统一详情抽屉：结构对齐 DetailPage（双层头部 + Tab 矩阵 + 右侧信息栏） */
const TABLE_TABS: TabItem[] = [
  { key: 'fields', label: '字段信息' },
  { key: 'sample', label: '样例数据' },
  { key: 'partitions', label: '分区信息' },
  { key: 'lineage', label: '血缘关系' },
  { key: 'manage', label: '使用说明' },
  { key: 'ddl', label: 'DDL变更' },
  { key: 'logs', label: '操作记录' },
];

const ASSET_TABS: TabItem[] = [
  { key: 'definition', label: '定义' },
  { key: 'lineage', label: '血缘关系' },
  { key: 'manage', label: '使用说明' },
  { key: 'logs', label: '操作记录' },
];

/** 字段安全等级：S1/S2 正常展示，S3+ 样例脱敏 */
function secOf(col: string): string {
  if (/user_id/.test(col)) return 'S3';
  if (/(^|_)id$|order_id|refund_id/.test(col)) return 'S2';
  if (/amt|gmv|rate/.test(col)) return 'S2';
  return 'S1';
}
function isMasked(col: string): boolean {
  return ['S3', 'S4', 'S5'].includes(secOf(col));
}

const SAMPLE_POOL: Record<string, string[]> = {
  channel_name: ['APP', '小程序', 'H5'],
  city_name: ['北京', '上海', '广州'],
  region: ['华东', '华南', '华北'],
  user_type: ['新用户', '老用户', '新用户'],
  category_name: ['食品生鲜', '日用百货', '数码家电'],
  refund_reason: ['质量问题', '不想要了', '配送超时'],
  order_status: ['2', '4', '2'],
};

function sampleVal(f: SchemaField, i: number): string {
  if (isMasked(f.col)) return '******';
  if (SAMPLE_POOL[f.col]) return SAMPLE_POOL[f.col][i % 3];
  if (f.type === 'DATE') return ['2026-07-12', '2026-07-11', '2026-07-10'][i % 3];
  if (f.type === 'DATETIME') return ['2026-07-12 10:23:45', '2026-07-11 18:02:11', '2026-07-10 09:47:30'][i % 3];
  if (f.type.startsWith('DECIMAL')) return ['12,845.60', '8,321.50', '456.00'][i % 3];
  if (f.type === 'BIGINT') return ['861234', '752190', '689452'][i % 3];
  if (f.type === 'TINYINT') return ['1', '0', '1'][i % 3];
  return ['示例值A', '示例值B', '示例值C'][i % 3];
}

export function AssetDetailDrawer({ target, onClose, onOpenTable }: Props) {
  const isTable = target.kind === 'table';
  const tabs = isTable ? TABLE_TABS : ASSET_TABS;
  const [tab, setTab] = useState(tabs[0].key);
  const [fav, setFav] = useState(false);

  const techName = isTable ? target.table.name : target.asset.enName ?? target.asset.name;
  const cnName = isTable ? target.table.cnName : target.asset.name;
  const heat = isTable ? target.table.heat : target.asset.heat ?? '—';
  const perm = isTable ? target.table.perm : target.asset.perm;
  const completeness = isTable ? 88 : 76;
  const domain = isTable ? target.table.domain : target.asset.domain ?? '综合';
  const tags = isTable ? ['交易数据', '核心资产'] : ['经营分析'];

  const copyName = () => {
    void navigator.clipboard?.writeText(techName);
    toast.success('英文名已复制');
  };

  return (
    <div className="ai-drawer-scope">
      <Drawer open title={`${techName} 详情`} onClose={onClose}>
        <div className="ai-drawer">
          {/* 双层头部（对齐 DetailPage detail-header） */}
          <div className="ai-drawer__header">
            <div className="ai-drawer__l1">
              {isTable && <span className="ai-drawer__db">dw.</span>}
              <span className="ai-drawer__tech">{techName}</span>
              <span className="ai-drawer__cn">{cnName}</span>
              {isTable ? (
                <><Tag tone="blue">数仓引擎</Tag><span className="ai-drawer__sys">MaxCompute</span></>
              ) : (
                <><Tag tone="success">报表系统</Tag><span className="ai-drawer__sys">BI 平台</span></>
              )}
              <button type="button" className="ai-drawer__copy" onClick={copyName} aria-label="复制英文名">⧉</button>
              <span className="ai-drawer__stats">🔍 {heat} · 👁 {isTable ? '5,102' : '8,931'}</span>
              <span className="ai-drawer__actions">
                {perm === 'ok'
                  ? <Tag tone="success">✓ 已有权限</Tag>
                  : <Button size="sm" onClick={() => toast.info('已加入权限申请购物车（演示）')}>申请权限</Button>}
                {isTable ? (
                  <Button variant="primary" size="sm" onClick={() => { onClose(); onOpenTable(target.table.name); }}>打开这张表 →</Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => { onClose(); toast.info(`已打开原${target.asset.typeLabel}（演示）`); }}>打开{target.asset.typeLabel} →</Button>
                )}
                <button type="button" className={fav ? 'ai-drawer__fav ai-drawer__fav--on' : 'ai-drawer__fav'} onClick={() => setFav((v) => !v)} aria-label={fav ? '取消收藏' : '收藏'}>
                  {fav ? '★' : '☆'}
                </button>
              </span>
            </div>
            <div className="ai-drawer__l2">
              <span>信息完善度 <span className="ai-drawer__progress"><span style={{ width: `${completeness}%` }} /></span> {completeness}%</span>
              <span>数据目录 <strong>数据资产目录 / {domain}</strong></span>
              <span>数据分类 {tags.map((t) => <Tag key={t} tone="gray">{t}</Tag>)}</span>
            </div>
          </div>

          <Tabs items={tabs} activeKey={tab} onChange={setTab} />

          <div className="ai-drawer__body">
            <div className="ai-drawer__main">
              {isTable ? <TableTabContent tab={tab} table={target.table} /> : <AssetTabContent tab={tab} asset={target.asset} />}
            </div>
            <aside className="ai-drawer__side">
              {isTable ? <TableSidebar table={target.table} perm={perm} tags={tags} /> : <AssetSidebar asset={target.asset} />}
            </aside>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

/* ── 表 Tab 内容 ─────────────────────────────────────────── */

function TableTabContent({ tab, table }: { tab: string; table: TableAsset }) {
  if (tab === 'fields') {
    return (
      <>
        <div className="ai-drawer__notice">安全等级规则：S1 公开级 / S2 内部级 → 正常展示；S3 秘密级 / S4 绝密级 / S5 核心级 → 标记加密，样例脱敏。</div>
        <table className="ai-find__table">
          <thead><tr><th>序号</th><th>字段名</th><th>类型</th><th>注释</th><th>安全等级</th></tr></thead>
          <tbody>
            {table.schema.map((f, i) => {
              const sec = secOf(f.col);
              return (
                <tr key={f.col}>
                  <td>{i + 1}</td>
                  <td className="ai-find__code">{f.col}</td>
                  <td className="ai-find__code ai-find__code--muted">{f.type}</td>
                  <td>{f.comment}</td>
                  <td>
                    <Tag tone={sec === 'S1' || sec === 'S2' ? 'success' : 'warning'}>{sec}</Tag>
                    {isMasked(f.col) && <span className="ai-drawer__encrypt">需加密</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }
  if (tab === 'sample') {
    return (
      <div className="ai-drawer__scroll-x">
        <table className="ai-find__table">
          <thead><tr>{table.schema.map((f) => <th key={f.col}>{f.col}{isMasked(f.col) ? ' 🔒' : ''}</th>)}</tr></thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i}>{table.schema.map((f) => <td key={f.col}>{sampleVal(f, i)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (tab === 'partitions') {
    const parts = ['2026-07-12', '2026-07-11', '2026-07-10'];
    const rows = ['8,612,340', '8,459,102', '8,390,876'];
    return (
      <table className="ai-find__table">
        <thead><tr><th>分区键</th><th>分区值</th><th>数据量(行数)</th><th>存储大小</th><th>最近更新时间</th></tr></thead>
        <tbody>
          {parts.map((d, i) => (
            <tr key={d}><td>stat_date</td><td>{d}</td><td>{rows[i]}</td><td>1.2 GB</td><td>{d} 03:15</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (tab === 'lineage') return <LineageTab name={table.name} />;
  if (tab === 'manage') {
    return (
      <>
        <div className="ai-find__caliber-box">{table.tip}</div>
        <ul className="ai-drawer__notes">
          <li>查询请务必带上 stat_date 分区条件，避免全表扫描。</li>
          <li>GMV 为支付口径，与财务口径（确收）存在差异，对外披露前请与财务对齐。</li>
          <li>遇到数据异常请先查看当日产出状态，再联系负责人 {table.owner}。</li>
        </ul>
      </>
    );
  }
  if (tab === 'ddl') {
    return (
      <table className="ai-find__table">
        <thead><tr><th>变更时间</th><th>变更类型</th><th>变更内容</th><th>操作人</th></tr></thead>
        <tbody>
          <tr><td>2026-06-18</td><td>ADD COLUMN</td><td>新增 {table.schema[table.schema.length - 1].col} 字段</td><td>{table.owner}</td></tr>
          <tr><td>2026-03-02</td><td>MODIFY COMMENT</td><td>更新 gmv_amt 字段注释（明确不含退款）</td><td>{table.owner}</td></tr>
          <tr><td>2025-11-20</td><td>CREATE TABLE</td><td>建表</td><td>{table.owner}</td></tr>
        </tbody>
      </table>
    );
  }
  return <LogsTab />;
}

function AssetTabContent({ tab, asset }: { tab: string; asset: AssetCard }) {
  if (tab === 'definition') {
    return (
      <>
        <dl className="ai-drawer__kv">
          <dt>英文标识</dt><dd className="ai-find__code">{asset.enName}</dd>
          <dt>所属系统</dt><dd>BI 平台</dd>
          <dt>更新频率</dt><dd>{asset.freq}</dd>
          <dt>内容说明</dt><dd>{asset.desc}</dd>
        </dl>
        <div className="ai-find__caliber-box"><strong>📐 指标口径：</strong>{asset.caliber}</div>
      </>
    );
  }
  if (tab === 'lineage') return <LineageTab name={asset.enName ?? asset.name} />;
  if (tab === 'manage') {
    return (
      <ul className="ai-drawer__notes">
        <li>数据以每日更新后的版本为准，跨日对比注意口径一致。</li>
        <li>如需导出明细数据，请走底层表权限申请。</li>
        <li>遇到数据异常请联系负责人 {asset.owner}。</li>
      </ul>
    );
  }
  return <LogsTab />;
}

function LineageTab({ name }: { name: string }) {
  const lin = aiFindLineage[name] ?? { up: ['—'], down: ['—'] };
  return (
    <div>
      <div className="ai-drawer__lineage">
        {lin.up.map((n) => <span key={n} className="ai-drawer__lineage-node">{n}</span>)}
        <span className="ai-drawer__lineage-arrow">→</span>
        <span className="ai-drawer__lineage-node ai-drawer__lineage-node--cur">{name}</span>
        <span className="ai-drawer__lineage-arrow">→</span>
        {lin.down.map((n) => <span key={n} className="ai-drawer__lineage-node">{n}</span>)}
      </div>
      <Button size="sm" onClick={() => toast.info('已跳转到血缘追溯模块，定位到该节点（演示）')}>在血缘追溯中查看完整链路 →</Button>
    </div>
  );
}

function LogsTab() {
  return (
    <table className="ai-find__table">
      <thead><tr><th>时间</th><th>操作</th><th>操作人</th></tr></thead>
      <tbody>
        <tr><td>2026-07-13 10:24</td><td>查看详情</td><td>你</td></tr>
        <tr><td>2026-07-12 16:02</td><td>权限审批通过</td><td>系统</td></tr>
        <tr><td>2026-07-10 09:15</td><td>被 AI 找数推荐并使用</td><td>业务运营-小李</td></tr>
      </tbody>
    </table>
  );
}

/* ── 右侧信息栏（对齐 detail-sidebar 分区） ─────────────────── */

function SideSection({ title, kvs }: { title: string; kvs: Array<[string, string]> }) {
  return (
    <div className="ai-drawer__side-section">
      <h4>{title}</h4>
      <dl>
        {kvs.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function TableSidebar({ table, perm, tags }: { table: TableAsset; perm: string; tags: string[] }) {
  return (
    <>
      <SideSection title="基本信息" kvs={[['中文名', table.cnName], ['数据层级', table.layer], ['是否核心', '是'], ['我的权限', perm === 'ok' ? '已有权限' : '无权限']]} />
      <SideSection title="业务/管理信息" kvs={[['业务域', table.domain], ['业务负责人', '刘七'], ['数据分类', tags.join('、')], ['技术负责人', table.owner]]} />
      <SideSection title="技术信息" kvs={[['平台来源', 'MaxCompute'], ['库名', 'dw'], ['是否分区', '是'], ['存储格式', 'ORC'], ['生命周期', '365 天'], ['更新时间', '2026-07-12']]} />
      <SideSection title="使用统计" kvs={[['近30天查询量', table.heat], ['近30天浏览量', '5,102 次']]} />
    </>
  );
}

function AssetSidebar({ asset }: { asset: AssetCard }) {
  return (
    <>
      <SideSection title="基本信息" kvs={[['中文名', asset.name], ['所属系统', 'BI 平台'], ['更新频率', asset.freq ?? '—'], ['访问方式', '平台内嵌 / 原系统']]} />
      <SideSection title="业务/管理信息" kvs={[['技术负责人', asset.owner ?? '—'], ['业务负责人', '刘七'], ['业务域', asset.domain ?? '—'], ['更新时间', '2026-07-12']]} />
      <SideSection title="使用统计" kvs={[['近30天查看量', asset.heat ?? '—'], ['近30天浏览量', '8,931 次']]} />
    </>
  );
}
