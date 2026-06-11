import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { SubmittedPanel } from '../approval-integration/components/SubmittedPanel';
import { PendingPanel, ApprovalActionModal } from '../approval-integration/components/PendingPanel';
import type { ActionDialog, PendingTask } from '../approval-integration/components/PendingPanel';
import { initialBatches, initialPendingTasks } from '../approval-integration/approvalData';
import type { ApprovalInstance } from '../approval-integration/approvalData';
import './my-page.css';

type MySection = 'favorites' | 'applies' | 'submitted' | 'pending' | 'permissions' | 'owned' | 'cart';
type ApplyStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
type AssetType = 'all' | 'table' | 'api' | 'report' | 'metric' | 'label';
type SourcePlatform = 'all' | 'warehouse_engine' | 'biz_database' | 'report_system' | 'api_service' | 'metric_platform' | 'label_system' | 'message_stream';
type OwnedStatus = 'all' | 'listed' | 'pending' | 'unlisted';
type OwnedRole = 'all' | 'tech' | 'biz' | 'both';
type PermType = 'all' | 'read' | 'readwrite';

type FavoriteItem = {
  id: string;
  name: string;
  display: string;
  type: AssetType;
  source: SourcePlatform;
  sourceLabel: string;
  catalog: string;
  owner: string;
  favTime: string;
};

type ApplyItem = {
  id: string;
  assetName: string;
  assetDisplay: string;
  type: AssetType;
  sourceLabel: string;
  reason: string;
  applyTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  ticketId: string;
  ticketType: string;
  subOrders: ApplySubOrder[];
};

type ApplySubOrder = {
  assetName: string;
  assetDisplay: string;
  status: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  timeline: Array<{ label: string; time: string; status: 'done' | 'rejected' | 'waiting' }>;
};

type PermItem = {
  id: string;
  name: string;
  display: string;
  type: AssetType;
  sourceLabel: string;
  catalog: string;
  permType: 'read' | 'readwrite';
  effectiveTime: string;
  ticketId: string;
};

type OwnedItem = {
  id: string;
  name: string;
  display: string;
  type: AssetType;
  sourceLabel: string;
  status: 'listed' | 'pending' | 'unlisted';
  statusLabel: string;
  catalog: string;
  role: 'tech' | 'biz' | 'both';
  roleLabel: string;
  updateTime: string;
};

type CartItem = {
  id: string;
  name: string;
  display: string;
  type: AssetType;
  typeLabel: string;
  catalog: string;
  security: string;
  sourceLabel: string;
  owner: string;
  matchedRoute: string;
  approvalCode: string;
  isFallback: boolean;
  flowPreview: string[];
};

const navItems: Array<{ key: MySection; label: string; icon: string }> = [
  { key: 'favorites', label: '我收藏的', icon: '☆' },
  { key: 'applies', label: '我申请的', icon: '📋' },
  { key: 'submitted', label: '我提交的申请', icon: '📝' },
  { key: 'pending', label: '待我审批', icon: '🔔' },
  { key: 'permissions', label: '我有权限的', icon: '🔑' },
  { key: 'owned', label: '我负责的', icon: '👤' },
  { key: 'cart', label: '申请单', icon: '🛒' },
];

const ALL_NAV_KEYS: string[] = navItems.map(item => item.key);

function getMySectionFromHash(): MySection {
  const [, query = ''] = window.location.hash.replace(/^#/, '').split('?');
  const section = new URLSearchParams(query).get('section');
  return ALL_NAV_KEYS.includes(section ?? '') ? section as MySection : 'favorites';
}

const favoritesData: FavoriteItem[] = [
  { id: 'f1', name: 'dwd_trade_order', display: '交易订单宽表', type: 'table', source: 'warehouse_engine', sourceLabel: '数仓引擎', catalog: '交易域/订单/订单明细', owner: '张三', favTime: '2026-04-02 09:15' },
  { id: 'f2', name: 'dwd_user_behavior_log', display: '用户行为日志', type: 'table', source: 'message_stream', sourceLabel: '消息队列', catalog: '用户域/行为/行为日志', owner: '李四', favTime: '2026-04-01 14:30' },
  { id: 'f3', name: 'rpt_gmv_daily', display: 'GMV 日报', type: 'report', source: 'report_system', sourceLabel: '报表系统', catalog: '财务域/报表/日报', owner: '王五', favTime: '2026-03-30 11:20' },
  { id: 'f4', name: 'api_trade_query', display: '交易查询接口', type: 'api', source: 'api_service', sourceLabel: 'API服务', catalog: '交易域/API/查询服务', owner: '孙工', favTime: '2026-03-29 16:45' },
  { id: 'f5', name: 'metric_gmv_core', display: 'GMV 核心指标', type: 'metric', source: 'metric_platform', sourceLabel: '指标平台', catalog: '财务域/指标/核心', owner: '赵六', favTime: '2026-03-28 10:00' },
  { id: 'f6', name: 'tag_user_profile', display: '用户画像标签', type: 'label', source: 'label_system', sourceLabel: '画像标签系统', catalog: '用户域/画像/用户标签', owner: '钱七', favTime: '2026-03-27 08:30' },
];

const appliesData: ApplyItem[] = [
  { id: 'a1', assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', type: 'table', sourceLabel: '数仓引擎', reason: '需要查询金融业务线的交易数据用于月度分析报告', applyTime: '2026-04-01 09:30', status: 'pending', ticketId: 'PA-2026040100003', ticketType: '权限申请', subOrders: [
    { assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', status: 'pending', timeline: [{ label: '上级审批 → 王经理', time: '2026-04-01 10:02', status: 'done' }, { label: '负责人审批 → 张三', time: '等待审批中...', status: 'waiting' }] },
    { assetName: 'dwd_trade_payment', assetDisplay: '交易支付明细表', status: 'pending', timeline: [{ label: '上级审批 → 王经理', time: '2026-04-01 10:02', status: 'done' }, { label: '负责人审批 → 李四', time: '等待审批中...', status: 'waiting' }] },
    { assetName: 'rpt_finance_monthly', assetDisplay: '金融月度报表', status: 'rejected', timeline: [{ label: '金融业务线审批人 → 赵总', time: '2026-04-01 11:45', status: 'rejected' }] },
  ]},
  { id: 'a2', assetName: 'api_trade_query', assetDisplay: '交易查询接口', type: 'api', sourceLabel: 'API服务', reason: '需要调用交易查询接口进行实时数据查询', applyTime: '2026-03-28 15:10', status: 'approved', ticketId: 'PA-2026032800012', ticketType: '权限申请', subOrders: [
    { assetName: 'api_trade_query', assetDisplay: '交易查询接口', status: 'approved', timeline: [{ label: 'API负责人 → 孙工', time: '2026-03-28 16:30', status: 'done' }] },
  ]},
  { id: 'a3', assetName: 'rpt_finance_monthly', assetDisplay: '金融月度报表', type: 'report', sourceLabel: '报表系统', reason: '用于季度业务复盘报告', applyTime: '2026-03-25 11:00', status: 'rejected', ticketId: 'PA-2026032500008', ticketType: '权限申请', subOrders: [
    { assetName: 'rpt_finance_monthly', assetDisplay: '金融月度报表', status: 'rejected', timeline: [{ label: '金融业务线审批人 → 赵总', time: '2026-03-25 14:20', status: 'rejected' }] },
  ]},
  { id: 'a4', assetName: 'dim_user_profile', assetDisplay: '用户画像维表', type: 'table', sourceLabel: '数仓引擎', reason: '用于用户分群分析', applyTime: '2026-03-22 09:15', status: 'withdrawn', ticketId: 'PA-2026032200003', ticketType: '权限申请', subOrders: [
    { assetName: 'dim_user_profile', assetDisplay: '用户画像维表', status: 'withdrawn', timeline: [{ label: '申请人撤回', time: '2026-03-22 10:30', status: 'done' }] },
  ]},
  // 上架审批
  { id: 'a5', assetName: 'dwd_user_behavior_log', assetDisplay: '用户行为日志', type: 'table', sourceLabel: '数仓引擎', reason: '数据已通过质量校验，申请上架到资产目录供业务使用', applyTime: '2026-04-02 10:00', status: 'pending', ticketId: 'SL-2026040200001', ticketType: '上架审批', subOrders: [
    { assetName: 'dwd_user_behavior_log', assetDisplay: '用户行为日志', status: 'pending', timeline: [{ label: '上级审批 → 王经理', time: '2026-04-02 10:30', status: 'done' }, { label: '目录管理员审批', time: '等待审批中...', status: 'waiting' }] },
  ]},
  { id: 'a6', assetName: 'api_product_catalog', assetDisplay: '商品目录查询接口', type: 'api', sourceLabel: 'API服务', reason: 'API已完成测试并通过安全审查，申请上架开放给下游调用', applyTime: '2026-03-30 14:20', status: 'approved', ticketId: 'SL-2026033000015', ticketType: '上架审批', subOrders: [
    { assetName: 'api_product_catalog', assetDisplay: '商品目录查询接口', status: 'approved', timeline: [{ label: 'API网关管理员', time: '2026-03-30 16:00', status: 'done' }] },
  ]},
  // 下架审批
  { id: 'a7', assetName: 'rpt_sales_temp', assetDisplay: '临时销售报表', type: 'report', sourceLabel: '报表系统', reason: '该报表数据源已下线，申请下架避免误导用户', applyTime: '2026-03-28 09:45', status: 'approved', ticketId: 'UL-2026032800010', ticketType: '下架审批', subOrders: [
    { assetName: 'rpt_sales_temp', assetDisplay: '临时销售报表', status: 'approved', timeline: [{ label: '上级审批 → 王经理', time: '2026-03-28 11:00', status: 'done' }] },
  ]},
  { id: 'a8', assetName: 'metric_dau_temp', assetDisplay: '临时DAU指标', type: 'metric', sourceLabel: '指标平台', reason: '临时指标已过期，需要下架', applyTime: '2026-03-25 16:30', status: 'pending', ticketId: 'UL-2026032500012', ticketType: '下架审批', subOrders: [
    { assetName: 'metric_dau_temp', assetDisplay: '临时DAU指标', status: 'pending', timeline: [{ label: '指标平台管理员', time: '等待审批中...', status: 'waiting' }] },
  ]},
  // 目录修改
  { id: 'a9', assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', type: 'table', sourceLabel: '数仓引擎', reason: '业务划分调整，将目录从"交易域/订单"迁移至"财务域/交易"', applyTime: '2026-04-01 11:00', status: 'pending', ticketId: 'CM-2026040100018', ticketType: '目录修改', subOrders: [
    { assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', status: 'pending', timeline: [{ label: '目录管理员审批', time: '等待审批中...', status: 'waiting' }] },
  ]},
  { id: 'a10', assetName: 'rpt_gmv_daily', assetDisplay: 'GMV 日报', type: 'report', sourceLabel: '报表系统', reason: '目录结构调整，从"财务域/报表/日报"迁移至"业务域/财务/日报"', applyTime: '2026-03-20 14:00', status: 'approved', ticketId: 'CM-2026032000007', ticketType: '目录修改', subOrders: [
    { assetName: 'rpt_gmv_daily', assetDisplay: 'GMV 日报', status: 'approved', timeline: [{ label: '目录管理员 → 刘管理员', time: '2026-03-20 15:30', status: 'done' }] },
  ]},
  // 负责人交接
  { id: 'a11', assetName: 'api_payment_query', assetDisplay: '支付查询接口', type: 'api', sourceLabel: 'API服务', reason: '原负责人张工离职，工作交接给王工', applyTime: '2026-04-02 08:00', status: 'approved', ticketId: 'HO-2026040200002', ticketType: '负责人交接', subOrders: [
    { assetName: 'api_payment_query', assetDisplay: '支付查询接口', status: 'approved', timeline: [{ label: '上级审批 → 陈总', time: '2026-04-02 09:30', status: 'done' }] },
  ]},
  { id: 'a12', assetName: 'dim_merchant_info', assetDisplay: '商户信息维表', type: 'table', sourceLabel: '数仓引擎', reason: '业务调整，商户域负责人从李经理变更为赵经理', applyTime: '2026-03-26 10:00', status: 'pending', ticketId: 'HO-2026032600009', ticketType: '负责人交接', subOrders: [
    { assetName: 'dim_merchant_info', assetDisplay: '商户信息维表', status: 'pending', timeline: [{ label: '上级审批', time: '等待审批中...', status: 'waiting' }] },
  ]},
  // 血缘修正
  { id: 'a13', assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', type: 'table', sourceLabel: '数仓引擎', reason: '数据仓库重构，上游表从ods_trade_src变更为ods_trade_v2，需修正血缘关系', applyTime: '2026-04-01 15:00', status: 'pending', ticketId: 'LC-2026040100020', ticketType: '血缘修正', subOrders: [
    { assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', status: 'pending', timeline: [{ label: '血缘治理管理员', time: '等待审批中...', status: 'waiting' }] },
  ]},
  { id: 'a14', assetName: 'rpt_revenue_summary', assetDisplay: '营收汇总报表', type: 'report', sourceLabel: '报表系统', reason: '报表底层表结构变更，需要更新血缘链路', applyTime: '2026-03-18 13:00', status: 'approved', ticketId: 'LC-2026031800005', ticketType: '血缘修正', subOrders: [
    { assetName: 'rpt_revenue_summary', assetDisplay: '营收汇总报表', status: 'approved', timeline: [{ label: '血缘治理管理员 → 周工', time: '2026-03-18 14:30', status: 'done' }] },
  ]},
];

const permData: PermItem[] = [
  { id: 'p1', name: 'dwd_trade_order', display: '交易订单宽表', type: 'table', sourceLabel: '数仓引擎', catalog: '交易域/订单/订单明细', permType: 'read', effectiveTime: '2026-03-28 17:00', ticketId: 'PA-2026032800012' },
  { id: 'p2', name: 'api_trade_query', display: '交易查询接口', type: 'api', sourceLabel: 'API服务', catalog: '交易域/API/查询服务', permType: 'readwrite', effectiveTime: '2026-03-28 17:00', ticketId: 'PA-2026032800012' },
  { id: 'p3', name: 'rpt_gmv_daily', display: 'GMV 日报', type: 'report', sourceLabel: '报表系统', catalog: '财务域/报表/日报', permType: 'read', effectiveTime: '2026-03-20 09:00', ticketId: 'PA-2026032000005' },
  { id: 'p4', name: 'metric_gmv_core', display: 'GMV 核心指标', type: 'metric', sourceLabel: '指标平台', catalog: '财务域/指标/核心', permType: 'read', effectiveTime: '2026-03-15 14:00', ticketId: 'PA-2026031500001' },
];

const ownedData: OwnedItem[] = [
  { id: 'o1', name: 'dwd_trade_order', display: '交易订单宽表', type: 'table', sourceLabel: '数仓引擎', status: 'listed', statusLabel: '已上架', catalog: '交易域/订单/订单明细', role: 'tech', roleLabel: '技术负责人', updateTime: '2026-04-01 10:00' },
  { id: 'o2', name: 'dwd_user_behavior_log', display: '用户行为日志', type: 'table', sourceLabel: '消息队列', status: 'listed', statusLabel: '已上架', catalog: '用户域/行为/行为日志', role: 'both', roleLabel: '技术+业务', updateTime: '2026-03-30 14:20' },
  { id: 'o3', name: 'rpt_gmv_daily', display: 'GMV 日报', type: 'report', sourceLabel: '报表系统', status: 'pending', statusLabel: '待维护', catalog: '财务域/报表/日报', role: 'biz', roleLabel: '业务负责人', updateTime: '2026-03-28 09:00' },
  { id: 'o4', name: 'metric_gmv_core', display: 'GMV 核心指标', type: 'metric', sourceLabel: '指标平台', status: 'unlisted', statusLabel: '不上架', catalog: '财务域/指标/核心', role: 'tech', roleLabel: '技术负责人', updateTime: '2026-03-25 16:00' },
];

const initialCartItems: CartItem[] = [
  { id: 'c1', name: 'dwd_trade_order', display: '交易订单宽表', type: 'table', typeLabel: '数据表', catalog: '交易域/订单/订单明细', security: 'S3 秘密级', sourceLabel: 'Hive', owner: '张三', matchedRoute: '标准权限申请（兜底）', approvalCode: '7C468A54-PER-2024', isFallback: true, flowPreview: ['① 上级审批 → 王经理', '② 负责人审批（或签） → 张三'] },
  { id: 'c2', name: 'dwd_trade_payment', display: '交易支付明细表', type: 'table', typeLabel: '数据表', catalog: '交易域/支付/支付流水', security: 'S3 秘密级', sourceLabel: 'Hive', owner: '李四', matchedRoute: '标准权限申请（兜底）', approvalCode: '7C468A54-PER-2024', isFallback: true, flowPreview: ['① 上级审批 → 王经理', '② 负责人审批（或签） → 李四'] },
  { id: 'c3', name: 'rpt_finance_monthly', display: '金融月度报表', type: 'report', typeLabel: '报表', catalog: '财务域/报表/月报', security: 'S2 内部级', sourceLabel: '报表平台', owner: '王五', matchedRoute: '跨部门申请审批', approvalCode: '7C468A54-CROSS-2024', isFallback: false, flowPreview: ['① 金融业务线审批人 → 赵总'] },
  { id: 'c4', name: 'api_trade_query', display: '交易查询接口', type: 'api', typeLabel: 'API', catalog: '交易域/API/查询服务', security: 'S2 内部级', sourceLabel: 'API网关', owner: '孙工', matchedRoute: '标准权限申请（兜底）', approvalCode: '7C468A54-PER-2024', isFallback: true, flowPreview: ['① API负责人 → 孙工'] },
];

const assetTypeOptions: Array<{ value: AssetType; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'table', label: '表' },
  { value: 'api', label: 'API' },
  { value: 'report', label: '报表' },
  { value: 'metric', label: '指标' },
  { value: 'label', label: '标签' },
];

const sourceOptions: Array<{ value: SourcePlatform; label: string }> = [
  { value: 'all', label: '全部来源' },
  { value: 'warehouse_engine', label: '数仓引擎' },
  { value: 'biz_database', label: '业务数据库' },
  { value: 'report_system', label: '报表系统' },
  { value: 'api_service', label: 'API服务' },
  { value: 'metric_platform', label: '指标平台' },
  { value: 'label_system', label: '画像标签系统' },
  { value: 'message_stream', label: '消息队列' },
];

const statusLabels: Record<string, string> = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  withdrawn: '已撤回',
};

const subStatusLabels: Record<string, string> = {
  approved: '✅ 已通过',
  rejected: '❌ 已驳回',
  pending: '⏳ 审批中',
  withdrawn: '已撤回',
};

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'gray' {
  if (s === 'approved' || s === 'listed' || s === '已通过') return 'success';
  if (s === 'pending' || s === '审批中' || s === '待维护') return 'warning';
  if (s === 'rejected' || s === '已拒绝') return 'danger';
  return 'gray';
}

function typeTone(t: AssetType): 'blue' | 'gray' | 'warning' | 'purple' | 'cyan' {
  if (t === 'table') return 'blue';
  if (t === 'api') return 'gray';
  if (t === 'report') return 'warning';
  if (t === 'metric') return 'purple';
  return 'cyan';
}

function typeLabel(t: AssetType): string {
  const m: Record<string, string> = { table: '数据表', api: 'API', report: '报表', metric: '指标', label: '标签' };
  return m[t] || t;
}

function permTypeLabel(p: string): string {
  return p === 'readwrite' ? '读写' : '读';
}

function TimelineDot({ status }: { status: 'done' | 'rejected' | 'waiting' }) {
  return <div className={`my-page__timeline-dot ${status}`} />;
}

function TimelineEntry({ label, time, status }: { label: string; time: string; status: 'done' | 'rejected' | 'waiting' }) {
  const actionTag = status === 'done' ? <Tag tone="success">通过</Tag> : status === 'rejected' ? <Tag tone="danger">驳回</Tag> : <Tag tone="warning">待审批</Tag>;
  return (
    <div className="my-page__timeline-item">
      <TimelineDot status={status} />
      <div className="my-page__timeline-content">{label} {actionTag}</div>
      <div className="my-page__timeline-time">{time}</div>
    </div>
  );
}

/* ================================================================
   Favorites Panel
   ================================================================ */
function FavoritesPanel() {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType>('all');
  const [sourceFilter, setSourceFilter] = useState<SourcePlatform>('all');
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return favoritesData.filter(f => {
      if (removedIds.has(f.id)) return false;
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && f.source !== sourceFilter) return false;
      if (kw && !f.name.toLowerCase().includes(kw) && !f.display.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [keyword, typeFilter, sourceFilter, removedIds]);

  const removeFav = (id: string) => setRemovedIds(prev => new Set(prev).add(id));

  return (
    <section className="my-page__panel">
      <div className="my-page__content-header">
        <div className="my-page__content-title-wrap">
          <div className="my-page__content-icon">⭐</div>
          <div><div className="my-page__content-title">我收藏的</div><div className="my-page__content-sub">管理您收藏的资产与资源</div></div>
        </div>
      </div>
      <div className="my-page__filters">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索资源名称…" />
        <select aria-label="类型筛选" value={typeFilter} onChange={e => setTypeFilter(e.target.value as AssetType)}>
          {assetTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="来源筛选" value={sourceFilter} onChange={e => setSourceFilter(e.target.value as SourcePlatform)}>
          {sourceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="my-page__table-wrap">
        <table>
          <thead><tr><th>名称</th><th>类型</th><th>平台/来源</th><th>目录</th><th>负责人</th><th>收藏时间</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.id}>
                <td><strong>{f.name}</strong><span>{f.display}</span></td>
                <td><Tag tone={typeTone(f.type)}>{typeLabel(f.type)}</Tag></td>
                <td>{f.sourceLabel}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{f.catalog}</td>
                <td>{f.owner}</td>
                <td>{f.favTime}</td>
                <td><div className="my-page__row-actions"><button type="button" className="danger" onClick={() => removeFav(f.id)}>取消收藏</button></div></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={7} className="my-page__empty">暂无收藏记录</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ================================================================
   Applies Panel
   ================================================================ */
function AppliesPanel() {
  const [tab, setTab] = useState<ApplyStatus>('all');
  const [keyword, setKeyword] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return appliesData.filter(a => {
      if (tab !== 'all' && a.status !== tab) return false;
      if (ticketTypeFilter !== 'all' && a.ticketType !== ticketTypeFilter) return false;
      if (kw && !a.assetName.toLowerCase().includes(kw) && !a.assetDisplay.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [tab, keyword, ticketTypeFilter]);

  const detailItem = detailId ? appliesData.find(a => a.id === detailId) : null;

  if (detailItem) {
    return (
      <section className="my-page__panel">
        <button type="button" className="my-page__back-btn" onClick={() => setDetailId(null)}>← 返回列表</button>
        <span className="my-page__detail-title">{detailItem.ticketType}详情 — {detailItem.ticketId}</span>
        <a className="my-page__detail-link" href="#my?section=submitted">查看工单视图</a>
        <div className="my-page__card">
          <div className="my-page__card-body">
            <div className="my-page__info-grid">
              <div><div className="my-page__info-label">工单编号</div><div className="my-page__info-value primary">{detailItem.ticketId}</div></div>
              <div><div className="my-page__info-label">申请时间</div><div className="my-page__info-value">{detailItem.applyTime}</div></div>
              <div><div className="my-page__info-label">整体状态</div><div className="my-page__info-value"><Tag tone={statusTone(detailItem.status)}>{statusLabels[detailItem.status]}</Tag></div></div>
              <div style={{ gridColumn: '1/-1' }}><div className="my-page__info-label">申请理由</div><div className="my-page__info-value">{detailItem.reason}</div></div>
            </div>
          </div>
        </div>
        <h3>子单审批进度（{detailItem.subOrders.length} 个子单）</h3>
        {detailItem.subOrders.map((sub, i) => (
          <div key={i} className={`my-page__sub-order status-${sub.status}`}>
            <div className="my-page__sub-order-header">
              <div><Tag tone={statusTone(sub.status)}>{subStatusLabels[sub.status]}</Tag> <strong>{sub.assetName}</strong> <span className="my-page__sub-order-secondary">{sub.assetDisplay}</span></div>
            </div>
            <div className="my-page__sub-order-body">
              <div className="my-page__timeline">
                {sub.timeline.map((t, j) => <TimelineEntry key={j} {...t} />)}
              </div>
            </div>
          </div>
        ))}
        <div className="my-page__detail-actions">
          {detailItem.status === 'pending' ? <Button variant="danger" size="sm">撤回申请</Button> : null}
          {detailItem.status === 'rejected' ? (
            <Button variant="primary" size="sm" onClick={() => { window.location.hash = 'my?section=cart'; }}>重新申请</Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="my-page__panel">
      <div className="my-page__content-header">
        <div className="my-page__content-title-wrap">
          <div className="my-page__content-icon">📝</div>
          <div><div className="my-page__content-title">我申请的</div><div className="my-page__content-sub">按资产查看我发起的权限申请过程</div></div>
        </div>
      </div>
      <div className="my-page__filters">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索资产名称…" />
        <select aria-label="工单类型筛选" value={ticketTypeFilter} onChange={e => setTicketTypeFilter(e.target.value)}>
          <option value="all">全部类型</option>
          <option value="权限申请">权限申请</option>
          <option value="上架审批">上架审批</option>
          <option value="下架审批">下架审批</option>
          <option value="目录修改">目录修改</option>
          <option value="负责人交接">负责人交接</option>
          <option value="血缘修正">血缘修正</option>
        </select>
        <div className="my-page__filter-tabs">
          {([['all', '全部'], ['pending', '审批中'], ['approved', '已通过'], ['rejected', '已拒绝'], ['withdrawn', '已撤回']] as const).map(([key, label]) => (
            <button key={key} type="button" className={`my-page__filter-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key as ApplyStatus)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="my-page__table-wrap">
        <table>
          <thead><tr><th>资产名称</th><th>类型</th><th>工单类型</th><th>平台/来源</th><th>申请原因</th><th>申请时间</th><th>状态</th><th>工单</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(a.id)}>
                <td><strong>{a.assetName}</strong><span>{a.assetDisplay}</span></td>
                <td><Tag tone={typeTone(a.type)}>{typeLabel(a.type)}</Tag></td>
                <td><Tag tone="blue">{a.ticketType}</Tag></td>
                <td>{a.sourceLabel}</td>
                <td className="my-page__reason-cell">{a.reason}</td>
                <td>{a.applyTime}</td>
                <td><Tag tone={statusTone(a.status)}>{statusLabels[a.status]}</Tag></td>
                <td className="primary">{a.ticketId}</td>
                <td>
                  <div className="my-page__row-actions">
                    <button type="button" onClick={e => { e.stopPropagation(); setDetailId(a.id); }}>查看详情</button>
                    {a.status === 'pending' ? <button type="button" className="danger" onClick={e => e.stopPropagation()}>撤回</button> : null}
                    {a.status === 'rejected' ? (
                      <button
                        type="button"
                        className="success"
                        onClick={e => {
                          e.stopPropagation();
                          window.location.hash = 'my?section=cart';
                        }}
                      >
                        重新申请
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={9} className="my-page__empty">暂无申请记录</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <a href="#my?section=submitted" style={{ color: 'var(--primary)', fontSize: '13px', textDecoration: 'none' }}>查看全部工单（含治理操作申请） →</a>
      </div>
    </section>
  );
}

/* ================================================================
   Permissions Panel
   ================================================================ */
function PermissionsPanel() {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType>('all');
  const [permTypeFilter, setPermTypeFilter] = useState<PermType>('all');

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return permData.filter(p => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (permTypeFilter !== 'all' && p.permType !== permTypeFilter) return false;
      if (kw && !p.name.toLowerCase().includes(kw) && !p.display.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [keyword, typeFilter, permTypeFilter]);

  return (
    <section className="my-page__panel">
      <div className="my-page__content-header">
        <div className="my-page__content-title-wrap">
          <div className="my-page__content-icon">🔑</div>
          <div><div className="my-page__content-title">我有权限的</div><div className="my-page__content-sub">查看您已授权的资产</div></div>
        </div>
      </div>
      <div className="my-page__filters">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索资产名称…" />
        <select aria-label="类型筛选" value={typeFilter} onChange={e => setTypeFilter(e.target.value as AssetType)}>
          {assetTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="权限类型" value={permTypeFilter} onChange={e => setPermTypeFilter(e.target.value as PermType)}>
          <option value="all">全部权限</option>
          <option value="read">读权限</option>
          <option value="readwrite">读写权限</option>
        </select>
      </div>
      <div className="my-page__table-wrap">
        <table>
          <thead><tr><th>名称</th><th>类型</th><th>平台/来源</th><th>目录</th><th>权限类型</th><th>生效时间</th><th>授权工单</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong><span>{p.display}</span></td>
                <td><Tag tone={typeTone(p.type)}>{typeLabel(p.type)}</Tag></td>
                <td>{p.sourceLabel}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{p.catalog}</td>
                <td><Tag tone={p.permType === 'readwrite' ? 'warning' : 'blue'}>{permTypeLabel(p.permType)}</Tag></td>
                <td>{p.effectiveTime}</td>
                <td className="primary">{p.ticketId}</td>
                <td><div className="my-page__row-actions"><button type="button">查看详情</button></div></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={8} className="my-page__empty">暂无已授权资产</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ================================================================
   Owned Panel
   ================================================================ */
function OwnedPanel() {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType>('all');
  const [statusFilter, setStatusFilter] = useState<OwnedStatus>('all');
  const [roleFilter, setRoleFilter] = useState<OwnedRole>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTransfer, setShowTransfer] = useState(false);

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return ownedData.filter(o => {
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (roleFilter !== 'all' && o.role !== roleFilter) return false;
      if (kw && !o.name.toLowerCase().includes(kw) && !o.display.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [keyword, typeFilter, statusFilter, roleFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };

  return (
    <section className="my-page__panel">
      <div className="my-page__tip-bar">
        <span>💡</span>
        <span>需要对资源进行上下架、信息修改等管理操作？</span>
        <a href="#management">前往资源管理 →</a>
      </div>
      <div className="my-page__filters">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索资源名称…" />
        <select aria-label="类型筛选" value={typeFilter} onChange={e => setTypeFilter(e.target.value as AssetType)}>
          {assetTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="状态筛选" value={statusFilter} onChange={e => setStatusFilter(e.target.value as OwnedStatus)}>
          <option value="all">全部状态</option>
          <option value="listed">已上架</option>
          <option value="pending">待维护</option>
          <option value="unlisted">不上架</option>
        </select>
        <select aria-label="角色筛选" value={roleFilter} onChange={e => setRoleFilter(e.target.value as OwnedRole)}>
          <option value="all">全部角色</option>
          <option value="tech">技术负责人</option>
          <option value="biz">业务负责人</option>
          <option value="both">技术+业务</option>
        </select>
      </div>
      {selected.size > 0 ? (
        <div className="my-page__batch-bar">
          <span>已选 {selected.size} 条</span>
          <Button size="sm" onClick={() => setShowTransfer(true)}>批量交接负责人</Button>
          <Button size="sm" onClick={() => setSelected(new Set())}>取消选择</Button>
        </div>
      ) : null}
      <div className="my-page__table-wrap">
        <table>
          <thead><tr><th style={{ width: 36 }}><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} /></th><th>资源名称</th><th>类型</th><th>平台/来源</th><th>当前状态</th><th>目录归属</th><th>我的角色</th><th>最近更新</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map(o => (
              <tr key={o.id}>
                <td><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} /></td>
                <td><strong>{o.name}</strong><span>{o.display}</span></td>
                <td><Tag tone={typeTone(o.type)}>{typeLabel(o.type)}</Tag></td>
                <td>{o.sourceLabel}</td>
                <td><Tag tone={statusTone(o.status)}>{o.statusLabel}</Tag></td>
                <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{o.catalog}</td>
                <td><Tag tone="blue">{o.roleLabel}</Tag></td>
                <td>{o.updateTime}</td>
                <td><div className="my-page__row-actions"><button type="button" onClick={() => setShowTransfer(true)}>交接</button></div></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={9} className="my-page__empty">暂无负责资源</td></tr> : null}
          </tbody>
        </table>
      </div>
      {showTransfer ? (
        <div className="my-page__modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="my-page__modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="my-page__modal-header">
              <strong>交接负责人</strong>
              <button type="button" className="my-page__modal-close" onClick={() => setShowTransfer(false)}>×</button>
            </div>
            <div className="my-page__modal-body">
              <div className="my-page__form-group">
                <label className="my-page__form-label">新负责人 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="my-page__form-input" placeholder="搜索姓名或工号..." />
              </div>
              <div className="my-page__form-group">
                <label className="my-page__form-label">交接原因</label>
                <textarea className="my-page__form-textarea" placeholder="请填写交接原因..." />
              </div>
            </div>
            <div className="my-page__modal-footer">
              <Button onClick={() => setShowTransfer(false)}>取消</Button>
              <Button variant="primary" onClick={() => setShowTransfer(false)}>确认交接</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ================================================================
   Cart Panel
   ================================================================ */
function CartPanel({ cartCount }: { cartCount: number }) {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [reason, setReason] = useState('需要查询金融业务线的交易数据用于月度分析报告');
  const [showIndividual, setShowIndividual] = useState(false);
  const [individualReasons, setIndividualReasons] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  void cartCount;

  const removeItem = (id: string) => setCartItems(prev => prev.filter(c => c.id !== id));
  const clearCart = () => setCartItems([]);

  const handleSubmit = () => {
    if (!reason.trim() || reason.trim().length < 10) return;
    setSubmitted(true);
    setCartItems([]);
    setReason('');
  };

  if (submitted) {
    return (
      <section className="my-page__panel">
        <div className="my-page__content-header">
          <div className="my-page__content-title-wrap">
            <div className="my-page__content-icon">🛒</div>
            <div><div className="my-page__content-title">权限申请单</div><div className="my-page__content-sub">在资源发现、资产目录或详情页中将资产加入申请单，统一提交审批</div></div>
          </div>
        </div>
        <div className="my-page__empty" style={{ padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>申请已提交</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>您可在「我申请的」中按资产查看审批进度</div>
          <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => setSubmitted(false)}>继续添加资产</Button>
        </div>
      </section>
    );
  }

  if (cartItems.length === 0) {
    return (
      <section className="my-page__panel">
        <div className="my-page__content-header">
          <div className="my-page__content-title-wrap">
            <div className="my-page__content-icon">🛒</div>
            <div><div className="my-page__content-title">权限申请单</div><div className="my-page__content-sub">在资源发现、资产目录或详情页中将资产加入申请单，统一提交审批</div></div>
          </div>
        </div>
        <div className="my-page__empty" style={{ padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>暂无待申请资产，去资源发现浏览</div>
        </div>
      </section>
    );
  }

  return (
    <section className="my-page__panel">
      <div className="my-page__content-header">
        <div className="my-page__content-title-wrap">
          <div className="my-page__content-icon">🛒</div>
          <div><div className="my-page__content-title">权限申请单</div><div className="my-page__content-sub">在资源发现、资产目录或详情页中将资产加入申请单，统一提交审批</div></div>
        </div>
        <div className="my-page__content-actions">
          <Button size="sm" onClick={clearCart}>清空申请单</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!reason.trim() || reason.trim().length < 10}>提交申请</Button>
        </div>
      </div>
      <div className="my-page__card">
        <div className="my-page__card-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600 }}>已添加的资产 <Tag tone="blue">{cartItems.length}</Tag></div>
            <Button size="sm">+ 继续添加资产</Button>
          </div>
        </div>
        <div style={{ padding: 0 }}>
          <table>
            <thead><tr><th>资产名称</th><th>类型</th><th>目录</th><th>安全等级</th><th>来源平台</th><th>负责人</th><th>操作</th></tr></thead>
            <tbody>
              {cartItems.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong><span>{c.display}</span></td>
                  <td><Tag tone={typeTone(c.type)}>{c.typeLabel}</Tag></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{c.catalog}</td>
                  <td>{c.security}</td>
                  <td>{c.sourceLabel}</td>
                  <td>{c.owner}</td>
                  <td><div className="my-page__row-actions"><button type="button" className="danger" onClick={() => removeItem(c.id)}>移除</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="my-page__card">
        <div className="my-page__card-header"><strong>审批流预览</strong> <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>系统根据资产属性自动拆分为以下审批流</span></div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cartItems.map(c => (
            <div key={c.id} className="my-page__flow-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag tone={typeTone(c.type)}>{c.typeLabel}</Tag>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: 'var(--text-quaternary)' }}>·</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{c.display}</span>
                <span className="my-page__flow-route">匹配路由：{c.matchedRoute}</span>
                <span className="my-page__flow-code">{c.approvalCode}</span>
                {c.isFallback ? <Tag tone="gray">兜底</Tag> : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                {c.flowPreview.map((step, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {i > 0 ? <span style={{ color: 'var(--text-quaternary)' }}>→</span> : null}
                    <span className="my-page__flow-step">{step.split(' → ')[0]}</span>
                    <span>→ {step.split(' → ')[1]}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="my-page__card">
        <div style={{ padding: 16 }}>
          <label className="my-page__form-label">统一申请理由 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea className="my-page__form-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="请填写申请理由，说明使用目的（至少 10 字）" rows={3} />
          {reason.trim().length > 0 && reason.trim().length < 10 ? <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: 4 }}>申请理由至少 10 字</div> : null}
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showIndividual} onChange={e => setShowIndividual(e.target.checked)} />
              为各审批流单独填写理由
            </label>
          </div>
          {showIndividual ? (
            <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
              {cartItems.map((c, i) => (
                <div key={c.id} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>审批流 {i + 1}：{c.name}</label>
                  <textarea className="my-page__form-textarea" rows={2} placeholder="默认使用统一理由，可单独修改" value={individualReasons[c.id] || ''} onChange={e => setIndividualReasons(prev => ({ ...prev, [c.id]: e.target.value }))} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Main Page
   ================================================================ */
export function MyPage() {
  const [activeSection, setActiveSection] = useState<MySection>(() => getMySectionFromHash());
  const [cartCount] = useState(initialCartItems.length);
  const [batches] = useState(initialBatches);
  const [tasks, setTasks] = useState(initialPendingTasks);
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      const nextSection = getMySectionFromHash();
      if (nextSection !== activeSection) setActiveSection(nextSection);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeSection]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  }

  function handleSubmitApproval(task: PendingTask, type: 'approve' | 'reject', comment: string) {
    if (type === 'reject' && !comment.trim()) {
      flash('拒绝时必须填写审批意见');
      return;
    }
    setTasks(prev => prev.filter(item => item.id !== task.id));
    setActionDialog(null);
    flash(type === 'approve' ? '已审批通过，飞书同步中...' : '已审批拒绝，飞书同步中...');
  }

  function handleSubmittedView(_instance: ApprovalInstance) {
    // Instance detail drawer — future: open a drawer/modal showing full batch instance detail
  }

  return (
    <section className="my-page">
      <aside className="my-page__sidebar">
        <div className="my-page__sidebar-title">我的</div>
        <nav aria-label="我的导航">
          {navItems.map(item => (
            <button key={item.key} type="button" className={activeSection === item.key ? 'active' : ''} onClick={() => setActiveSection(item.key)}>
              <span className="my-page__sidebar-item-icon">{item.icon}</span>{item.label}
              {item.key === 'cart' && cartCount > 0 ? <b>{cartCount}</b> : null}
              {item.key === 'pending' && tasks.length > 0 ? <b>{tasks.length}</b> : null}
            </button>
          ))}
        </nav>
      </aside>
      <main className="my-page__main">
        <header className="my-page__header">
          <div>
            <h1>我的</h1>
            <p>管理收藏、权限资产、负责资源，并从资产视角提交和查看权限申请。</p>
          </div>
        </header>
        {toast ? <div className="my-page__toast" role="status">{toast}</div> : null}
        {activeSection === 'favorites' ? <FavoritesPanel /> : null}
        {activeSection === 'applies' ? <AppliesPanel /> : null}
        {activeSection === 'submitted' ? (
          <SubmittedPanel
            batches={batches}
            onView={handleSubmittedView}
          />
        ) : null}
        {activeSection === 'pending' ? (
          <PendingPanel
            tasks={tasks}
            onOpenAction={setActionDialog}
            onFeishu={() => flash('跳转飞书审批（演示）')}
          />
        ) : null}
        {activeSection === 'permissions' ? <PermissionsPanel /> : null}
        {activeSection === 'owned' ? <OwnedPanel /> : null}
        {activeSection === 'cart' ? <CartPanel cartCount={cartCount} /> : null}
      </main>
      {actionDialog ? (
        <ApprovalActionModal
          action={actionDialog}
          onClose={() => setActionDialog(null)}
          onSubmit={handleSubmitApproval}
        />
      ) : null}
    </section>
  );
}
