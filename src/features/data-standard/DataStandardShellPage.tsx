import { Tag } from '../../components/base/Tag';
import { Button } from '../../components/base/Button';
import { PUBLISHED_STANDARDS } from '../table-builder/mockStandards';
import { STANDARD_SETS } from './mockCatalog';
import './data-standard.css';

export function DataStandardShellPage() {
  return (
    <section className="dstd-page">
      <div className="dstd-header">
        <div>
          <h1 className="dstd-header__title">数据标准</h1>
          <p className="dstd-header__note">原型：标准分组与已发布标准仅作演示，暂不支持真实审批发布</p>
        </div>
        <Button
          variant="primary"
          onClick={() => { window.location.hash = 'data-standard/draft'; }}
        >
          + 新建标准草稿
        </Button>
      </div>

      <div className="dstd-section">
        <h2 className="dstd-section__title">标准分组</h2>
        <div className="dstd-table-wrap">
          <table className="dstd-table">
            <thead>
              <tr>
                <th>分组名称</th>
                <th>所属域</th>
                <th>标准数</th>
                <th>已发布</th>
                <th>草稿中</th>
                <th>负责人</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_SETS.map((set) => (
                <tr key={set.id}>
                  <td className="dstd-table__name">{set.name}</td>
                  <td>{set.domain}</td>
                  <td>{set.standardCount}</td>
                  <td>{set.publishedCount}</td>
                  <td>
                    {set.draftCount > 0 ? <Tag tone="warning">{set.draftCount} 个草稿</Tag> : '-'}
                  </td>
                  <td>{set.owner}</td>
                  <td>{set.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dstd-section">
        <h2 className="dstd-section__title">已发布标准</h2>
        <div className="dstd-table-wrap">
          <table className="dstd-table">
            <thead>
              <tr>
                <th>标准编码</th>
                <th>中文名</th>
                <th>英文名</th>
                <th>数据类型</th>
                <th>分类</th>
                <th>密级</th>
              </tr>
            </thead>
            <tbody>
              {PUBLISHED_STANDARDS.map((std) => (
                <tr key={std.code}>
                  <td className="dstd-table__code">{std.code}</td>
                  <td className="dstd-table__name">{std.nameZh}</td>
                  <td className="dstd-table__mono">{std.nameEn}</td>
                  <td>
                    {std.dataType}
                    {std.length ? `(${std.length})` : ''}
                  </td>
                  <td>{std.classificationPath}</td>
                  <td>
                    <Tag tone={std.grade === 'L1' ? 'danger' : 'blue'}>{std.grade}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
