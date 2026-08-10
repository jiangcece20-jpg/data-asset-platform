import { useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { MOCK_TABLES, type TableListItem } from './mockTables';
import './table-builder.css';

type TagTone = 'blue' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'cyan';

type Filter = 'all' | 'builder' | 'external';

const FILTER_LABELS: Record<Filter, string> = {
  all: '全部',
  builder: '标准建表',
  external: '外部导入',
};

export function TableListPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    let list = MOCK_TABLES;
    if (filter === 'builder') list = list.filter((t) => t.createdByBuilder);
    if (filter === 'external') list = list.filter((t) => !t.createdByBuilder);
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (t) =>
          t.nameZh.toLowerCase().includes(kw) ||
          t.nameEn.toLowerCase().includes(kw) ||
          t.database.toLowerCase().includes(kw),
      );
    }
    return list;
  }, [filter, keyword]);

  const builderCount = MOCK_TABLES.filter((t) => t.createdByBuilder).length;
  const externalCount = MOCK_TABLES.length - builderCount;

  return (
    <section className="tb-page">
      <div className="tb-header">
        <div className="tb-header__row">
          <div>
            <h1 className="tb-header__title">表管理</h1>
            <p className="tb-header__note">
              原型演示：共 {MOCK_TABLES.length} 张表 · 标准建表 {builderCount} · 外部导入 {externalCount}
            </p>
          </div>
          <Button variant="primary" onClick={() => { window.location.hash = '#table-builder/new'; }}>
            创建数据表
          </Button>
        </div>
      </div>

      <div className="tb-list-toolbar">
        <div className="tb-list-filter">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? 'tb-list-filter__btn tb-list-filter__btn--active' : 'tb-list-filter__btn'}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>
        <input
          className="tb-list-search"
          placeholder="搜索表名 / 库名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="tb-fields-table-wrap">
        <table className="tb-fields-table tb-list-table">
          <thead>
            <tr>
              <th>表中文名</th>
              <th>英文表名</th>
              <th>库</th>
              <th>引擎</th>
              <th>字段数</th>
              <th>创建方式</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="tb-fields-table__empty">
                  暂无匹配的表
                </td>
              </tr>
            ) : (
              filtered.map((table) => (
                <TableListRow key={table.id} table={table} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableListRow({ table }: { table: TableListItem }) {
  const tone: TagTone = table.createdByBuilder ? 'success' : 'gray';
  const label = table.createdByBuilder ? '标准建表' : '外部导入';

  return (
    <tr>
      <td className="tb-list-table__name-zh">{table.nameZh}</td>
      <td className="tb-list-table__name-en">{table.nameEn}</td>
      <td>{table.database}</td>
      <td>{table.engine}</td>
      <td>{table.fieldCount}</td>
      <td>
        <Tag tone={tone}>{label}</Tag>
      </td>
      <td className="tb-list-table__time">{table.createdAt}</td>
    </tr>
  );
}
