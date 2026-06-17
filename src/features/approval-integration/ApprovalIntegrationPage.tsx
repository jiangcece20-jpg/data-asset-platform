import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tabs } from '../../components/base/Tabs';
import { Tag } from '../../components/base/Tag';
import { Modal } from '../../components/feedback/Modal';
import {
  effectLabel,
  applicantDeptOptions,
  assetTypeOptions,
  catalogTree,
  initialBatches,
  initialFlows,
  initialFormMappings,
  initialNodeMappings,
  initialPendingTasks,
  initialRoles,
  initialRoutes,
  routeFields,
  routeOperators,
  permissionTypeOptions,
  securityLevelOptions,
  sourceSystemOptions,
  sourceTypeOptions,
  statusLabel,
  ticketTypes,
  type ApprovalBatch,
  type ApprovalInstance,
  type ApprovalRole,
  type CatalogNode,
  type DetailTab,
  type FlowConfig,
  type FlowRoute,
  type FormMapping,
  type NodeMapping,
  type PendingTask,
  type RouteCondition,
  type Section,
} from './approvalData';
import { SubmittedPanel } from './components/SubmittedPanel';
import { PendingPanel, ApprovalActionModal } from './components/PendingPanel';
import type { ActionDialog } from './components/PendingPanel';
import { ApprovalDetailTables } from './components/ApprovalDetailTables';
import {
  approveLineageApproval,
  lineageApprovalsToBatches,
  lineageApprovalsToPendingTasks,
  rejectLineageApproval,
  useLineageApprovals,
} from '../lineage/lineageApprovalStore';
import './approval-integration.css';

type DrawerState =
  | { kind: 'new-flow'; flow: FlowConfig }
  | { kind: 'edit-flow'; flow: FlowConfig }
  | { kind: 'form'; mapping: FormMapping; isNew: boolean }
  | { kind: 'node'; node: NodeMapping; isNew: boolean }
  | { kind: 'route'; route: FlowRoute; isNew: boolean }
  | { kind: 'role'; role: ApprovalRole; isNew: boolean }
  | { kind: 'instance'; instance: ApprovalInstance }
  | null;

const navGroups: Array<{ title: string; items: Array<{ key: Section; label: string; badge?: number }> }> = [
  { title: '配置管理', items: [{ key: 'flows', label: '飞书流程库' }, { key: 'roles', label: '审批角色管理' }] },
  { title: '审批工作台', items: [{ key: 'submitted', label: '我提交的申请' }, { key: 'pending', label: '待我审批' }] },
  { title: '运维监控', items: [{ key: 'monitor', label: '同步监控' }] },
];

function sectionFromHash(): Section {
  const [, query = ''] = window.location.hash.replace(/^#/, '').split('?');
  const value = new URLSearchParams(query).get('section');
  if (value === 'flow-detail') return 'flow-detail';
  if (value === 'roles') return 'roles';
  if (value === 'submitted') return 'submitted';
  if (value === 'pending') return 'pending';
  if (value === 'monitor') return 'monitor';
  return 'flows';
}

function queryParam(key: string) {
  const [, query = ''] = window.location.hash.replace(/^#/, '').split('?');
  return new URLSearchParams(query).get(key);
}

function detailTabFromHash(): DetailTab {
  const tab = queryParam('tab');
  if (tab === 'form-mapping' || tab === 'node-mapping' || tab === 'route-rules') return tab;
  return 'basic';
}

function setSectionHash(section: Section) {
  window.location.hash = section === 'flows' ? 'permissions?section=flows' : `permissions?section=${section}`;
}

function openFlowDetail(flowId: string, tab: DetailTab = 'basic') {
  window.location.hash = `permissions?section=flow-detail&id=${encodeURIComponent(flowId)}&tab=${tab}`;
}

function toneForStatus(status: string): 'success' | 'warning' | 'danger' | 'gray' | 'blue' {
  if (['enabled', 'passed', 'complete', 'approved', 'effective'].includes(status)) return 'success';
  if (['failed', 'rejected', 'sync_error', 'effect_failed'].includes(status)) return 'danger';
  if (['approving', 'effecting', 'incomplete'].includes(status)) return 'warning';
  if (status === 'pending_submit') return 'blue';
  return 'gray';
}

function flowStatusLabel(flow: FlowConfig) {
  return flow.status === 'enabled' ? '已启用' : '已停用';
}

function mappingLabel(status: FlowConfig['formMappingStatus']) {
  if (status === 'complete') return '完整';
  if (status === 'incomplete') return '不完整';
  return '未配置';
}

function validateLabel(status: FlowConfig['validateStatus']) {
  if (status === 'passed') return '校验通过';
  if (status === 'failed') return '校验失败';
  return '未校验';
}

function newFlow(): FlowConfig {
  return {
    id: '',
    ticketType: '权限申请',
    name: '',
    approvalCode: '',
    idType: 'open_id',
    status: 'disabled',
    description: '',
    formMappingStatus: 'not_configured',
    nodeMappingStatus: 'not_configured',
    lastValidatedAt: null,
    validateStatus: 'not_validated',
    createdAt: new Date().toLocaleString('zh-CN'),
    updatedAt: new Date().toLocaleString('zh-CN'),
  };
}

export function ApprovalIntegrationPage() {
  const lineageApprovals = useLineageApprovals();
  const [section, setSection] = useState<Section>(() => sectionFromHash());
  const [detailTab, setDetailTab] = useState<DetailTab>(() => detailTabFromHash());
  const [detailId, setDetailId] = useState(() => queryParam('id') ?? 'fc-001');
  const [flows, setFlows] = useState(initialFlows);
  const [routes, setRoutes] = useState(initialRoutes);
  const [formMappings, setFormMappings] = useState(initialFormMappings);
  const [nodeMappings, setNodeMappings] = useState(initialNodeMappings);
  const [roles, setRoles] = useState(initialRoles);
  const batches = useMemo(() => [...lineageApprovalsToBatches(), ...initialBatches], [lineageApprovals]);
  const [tasks, setTasks] = useState(initialPendingTasks);
  const pendingTasks = useMemo(() => [...lineageApprovalsToPendingTasks(), ...tasks], [lineageApprovals, tasks]);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [toast, setToast] = useState('');
  const [validatingId, setValidatingId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      setSection(sectionFromHash());
      setDetailTab(detailTabFromHash());
      setDetailId(queryParam('id') ?? 'fc-001');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  }

  const selectedFlow = flows.find(flow => flow.id === detailId) ?? flows[0];

  function saveFlow(flow: FlowConfig) {
    if (!flow.name || !flow.approvalCode) {
      flash('请填写审批名称和 approval_code');
      return;
    }
    if (flow.id) {
      setFlows(prev => prev.map(item => item.id === flow.id ? { ...flow, updatedAt: new Date().toLocaleString('zh-CN') } : item));
      flash('流程配置已保存');
      setDrawer(null);
      return;
    }
    const id = `fc-${Date.now()}`;
    const saved = { ...flow, id };
    setFlows(prev => [...prev, saved]);
    setDrawer(null);
    flash('流程配置已新增，请继续完成详情配置');
    openFlowDetail(id);
  }

  function validateFlow(flowId: string) {
    setValidatingId(flowId);
    window.setTimeout(() => {
      setFlows(prev => prev.map(flow => flow.id === flowId ? { ...flow, validateStatus: 'passed', lastValidatedAt: new Date().toLocaleString('zh-CN'), validateError: undefined } : flow));
      setValidatingId(null);
      flash('校验通过：approval_code 有效，字段映射完整，动态节点均已配置');
    }, 700);
  }

  function toggleFlowStatus(flowId: string) {
    setFlows(prev => prev.map(flow => flow.id === flowId ? { ...flow, status: flow.status === 'enabled' ? 'disabled' : 'enabled' } : flow));
  }

  function saveMapping(mapping: FormMapping, isNew: boolean) {
    if (!mapping.platformField || !mapping.feishuWidgetId) {
      flash('平台字段和飞书控件 ID 不能为空');
      return;
    }
    setFormMappings(prev => isNew ? [...prev, mapping] : prev.map(item => item.id === mapping.id ? mapping : item));
    setDrawer(null);
    flash('字段映射已保存');
  }

  function saveNode(node: NodeMapping, isNew: boolean) {
    if (!node.feishuNodeName || !node.feishuNodeId) {
      flash('节点名称和节点 ID 不能为空');
      return;
    }
    setNodeMappings(prev => isNew ? [...prev, node] : prev.map(item => item.id === node.id ? node : item));
    setDrawer(null);
    flash('节点映射已保存');
  }

  function saveRoute(route: FlowRoute, isNew: boolean) {
    if (!route.name) {
      flash('请填写规则名称');
      return;
    }
    if (!route.isDefault && route.conditions.length === 0) {
      flash('非兜底规则至少需要一个条件');
      return;
    }
    setRoutes(prev => isNew ? [...prev, route].sort((a, b) => a.priority - b.priority) : prev.map(item => item.id === route.id ? route : item));
    setDrawer(null);
    flash('路由规则已保存');
  }

  function saveRole(role: ApprovalRole, isNew: boolean) {
    if (!role.roleName || !role.roleCode) {
      flash('请填写角色名称和角色编码');
      return;
    }
    setRoles(prev => isNew ? [...prev, { ...role, id: `role-${Date.now()}` }] : prev.map(item => item.id === role.id ? role : item));
    setDrawer(null);
    flash(isNew ? '角色已新增' : '角色已保存');
  }

  function submitApprovalAction(target: PendingTask | PendingTask[], type: 'approve' | 'reject', comment: string) {
    if (type === 'reject' && !comment.trim()) {
      flash('拒绝时必须填写审批意见');
      return;
    }
    const targets = Array.isArray(target) ? target : [target];
    const targetIds = new Set(targets.map(task => task.id));
    targets.filter(task => task.ticketType === '血缘修正').forEach(task => {
      if (type === 'approve') approveLineageApproval(task.id);
      else rejectLineageApproval(task.id, comment);
    });
    setTasks(prev => prev.filter(item => !targetIds.has(item.id)));
    setActionDialog(null);
    flash(type === 'approve' ? '已审批通过，飞书同步中...' : '已审批拒绝，飞书同步中...');
  }

  return (
    <section className="approval-v6">
      <aside className="approval-v6__sidebar">
        <div className="approval-v6__brand"><span>审</span><div><strong>审批配置</strong><small>飞书审批集成</small></div></div>
        <nav aria-label="飞书审批集成导航">
          {navGroups.map(group => (
            <div key={group.title} className="approval-v6__nav-group">
              <div className="approval-v6__nav-title">{group.title}</div>
              {group.items.map(item => (
                <button key={item.key} type="button" className={section === item.key ? 'active' : ''} onClick={() => setSectionHash(item.key)}>
                  <span>{item.label}</span>{item.key === 'pending' && pendingTasks.length ? <b>{pendingTasks.length}</b> : item.badge ? <b>{item.badge}</b> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="approval-v6__main">
        {toast ? <div className="approval-v6__toast" role="status">{toast}</div> : null}
        <div className="approval-v6__content">
          {section === 'flows' ? <FlowsPanel flows={flows} routes={routes} validatingId={validatingId} onNew={() => setDrawer({ kind: 'new-flow', flow: newFlow() })} onEdit={openFlowDetail} onValidate={validateFlow} onToggle={toggleFlowStatus} /> : null}
          {section === 'flow-detail' ? <FlowDetailPanel flow={selectedFlow} tab={detailTab} routes={routes} formMappings={formMappings} nodeMappings={nodeMappings} validatingId={validatingId} onTabChange={(tab) => openFlowDetail(selectedFlow.id, tab)} onBack={() => setSectionHash('flows')} onValidate={validateFlow} onEdit={() => setDrawer({ kind: 'edit-flow', flow: selectedFlow })} onNewMapping={() => setDrawer({ kind: 'form', mapping: newMappingFor(selectedFlow.id), isNew: true })} onEditMapping={(mapping) => setDrawer({ kind: 'form', mapping, isNew: false })} onDeleteMapping={(id) => setFormMappings(prev => prev.filter(item => item.id !== id))} onNewNode={() => setDrawer({ kind: 'node', node: newNodeFor(selectedFlow.id), isNew: true })} onEditNode={(node) => setDrawer({ kind: 'node', node, isNew: false })} onDeleteNode={(id) => setNodeMappings(prev => prev.filter(item => item.id !== id))} onToggleNode={(id) => setNodeMappings(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item))} onNewRoute={() => setDrawer({ kind: 'route', route: newRouteFor(selectedFlow.ticketType, flows, routes, selectedFlow.id), isNew: true })} onEditRoute={(route) => setDrawer({ kind: 'route', route, isNew: false })} onDeleteRoute={(id) => setRoutes(prev => prev.filter(item => item.id !== id))} /> : null}
          {section === 'roles' ? <RolesPanel roles={roles} onNew={() => setDrawer({ kind: 'role', role: newRole(), isNew: true })} onEdit={(role) => setDrawer({ kind: 'role', role, isNew: false })} /> : null}
          {section === 'submitted' ? <SubmittedPanel batches={batches} onView={(instance) => setDrawer({ kind: 'instance', instance })} /> : null}
          {section === 'pending' ? <PendingPanel tasks={pendingTasks} onOpenAction={setActionDialog} /> : null}
          {section === 'monitor' ? <MonitorPanel /> : null}
        </div>
      </main>

      <DrawerHost drawer={drawer} setDrawer={setDrawer} onSaveFlow={saveFlow} onSaveMapping={saveMapping} onSaveNode={saveNode} onSaveRoute={saveRoute} onSaveRole={saveRole} />
      {actionDialog ? <ApprovalActionModal action={actionDialog} onClose={() => setActionDialog(null)} onSubmit={submitApprovalAction} /> : null}
    </section>
  );
}

function newMappingFor(flowId: string): FormMapping {
  return { id: `fm-${Date.now()}`, flowConfigId: flowId, platformField: '', feishuWidgetId: '', widgetType: 'input', transformRule: '原值传入', required: true, usedInCondition: false, exampleValue: '' };
}

function newNodeFor(flowId: string): NodeMapping {
  return { id: `nm-${Date.now()}`, flowConfigId: flowId, feishuNodeName: '', feishuNodeId: '', approverRuleType: 'direct_manager', multiApproverMode: 'single', missingAction: 'block', enabled: true, description: '' };
}

function newRouteFor(ticketType: string, flows: FlowConfig[], routes: FlowRoute[], flowId?: string): FlowRoute {
  return { id: `route-${Date.now()}`, flowConfigId: flowId ?? flows.find(flow => flow.ticketType === ticketType)?.id ?? '', ticketType, priority: routes.filter(route => route.ticketType === ticketType && !route.isDefault).length + 1, name: '', conditions: [], conditionLogic: 'AND', isDefault: false, enabled: true, description: '' };
}

function newRole(): ApprovalRole {
  return { id: '', roleCode: '', roleName: '', enabled: true, members: [] };
}

function routeValueText(condition: RouteCondition) {
  const values = Array.isArray(condition.valueLabel) ? condition.valueLabel : [condition.valueLabel || condition.value].flat();
  return values.filter(Boolean).join('、') || '未设置';
}

function sourceTypeLabel(value: string) {
  return sourceTypeOptions.find(item => item.value === value)?.label ?? value;
}

function normalizeConditionForField(condition: RouteCondition, fieldValue: string): RouteCondition {
  const field = routeFields.find(item => item.value === fieldValue)!;
  const base = { ...condition, field: field.value, fieldLabel: field.label, value: [], valueLabel: [], matchMode: undefined };
  if (field.value === 'is_cross_dept') return { ...base, operator: 'eq', operatorLabel: '等于', value: 'true', valueLabel: '是' };
  if (field.value === 'applicant_dept') return { ...base, operator: 'in', operatorLabel: '属于', value: ['数据分析部'], valueLabel: ['数据分析部'] };
  if (field.value === 'catalog_path') return { ...base, operator: 'in', operatorLabel: '属于', matchMode: 'include_descendants' };
  return { ...base, operator: 'in', operatorLabel: '属于' };
}

function updateMultiValue(condition: RouteCondition, options: Array<{ value: string; label: string }>, value: string, checked: boolean): Partial<RouteCondition> {
  const selected = new Set(Array.isArray(condition.value) ? condition.value : condition.value ? [condition.value] : []);
  checked ? selected.add(value) : selected.delete(value);
  const values = Array.from(selected);
  const labels = values.map(item => options.find(option => option.value === item)?.label ?? item);
  return { value: values, valueLabel: labels };
}

function flattenCatalog(nodes: CatalogNode[]): Array<{ value: string; label: string }> {
  return nodes.flatMap(node => [{ value: node.path, label: node.path }, ...(node.children ? flattenCatalog(node.children) : [])]);
}

function catalogDescendants(node: CatalogNode): string[] {
  return node.children?.flatMap(child => [child.path, ...catalogDescendants(child)]) ?? [];
}

function hasSelectedCatalogAncestor(path: string, selected: string[]) {
  return selected.some(value => path !== value && path.startsWith(`${value}/`));
}

function isCatalogPathChecked(path: string, selected: string[]) {
  return selected.includes(path) || hasSelectedCatalogAncestor(path, selected);
}

function updateCatalogSelection(selected: string[], node: CatalogNode, checked: boolean) {
  if (!checked) {
    return selected.filter(value => value !== node.path && !value.startsWith(`${node.path}/`));
  }

  const descendants = new Set(catalogDescendants(node));
  const withoutDescendants = selected.filter(value => !descendants.has(value));
  const withoutAncestors = withoutDescendants.filter(value => !node.path.startsWith(`${value}/`));
  return [...withoutAncestors, node.path];
}

export function matchesCatalogConditionValue(condition: Pick<RouteCondition, 'value' | 'matchMode'>, catalogPath: string) {
  const values = Array.isArray(condition.value) ? condition.value : condition.value ? [condition.value] : [];
  if (!values.length) return true;
  return values.some(value => value === catalogPath || (condition.matchMode === 'include_descendants' && catalogPath.startsWith(`${value}/`)));
}

function flowOwnerLabel(ticketType: string) {
  if (ticketType === '权限申请') return '数据安全组';
  if (ticketType === '上架审批' || ticketType === '下架审批' || ticketType === '目录修改') return '数据治理组';
  if (ticketType === '负责人交接') return '资产运营组';
  if (ticketType === '血缘修正') return '血缘治理组';
  return '平台治理组';
}

function flowResponsibleUser(ticketType: string) {
  if (ticketType === '权限申请') return '周安全';
  if (ticketType === '上架审批' || ticketType === '下架审批') return '李治理';
  if (ticketType === '目录修改') return '目录负责人';
  if (ticketType === '负责人交接') return '资产运营';
  if (ticketType === '血缘修正') return '血缘负责人';
  return '平台管理员';
}

function flowHealth(flow: FlowConfig) {
  if (flow.validateStatus === 'failed') return { label: '异常', className: 'danger' };
  if (flow.validateStatus === 'not_validated') return { label: '待校验', className: 'warning' };
  if (flow.formMappingStatus !== 'complete' || flow.nodeMappingStatus !== 'complete') return { label: '待配置', className: 'warning' };
  if (flow.status === 'disabled') return { label: '已停用', className: 'muted' };
  return { label: '健康', className: 'success' };
}

function primaryRouteFor(flow: FlowConfig, routes: FlowRoute[]) {
  const flowRoutes = routes.filter(route => route.flowConfigId === flow.id).sort((a, b) => a.priority - b.priority);
  const primary = flowRoutes.find(route => !route.isDefault) ?? flowRoutes.find(route => route.isDefault);
  const hasFallback = flowRoutes.some(route => route.isDefault);
  const rank = primary ? primary.isDefault ? 99999 : primary.priority : 90000;
  return {
    all: flowRoutes,
    extraCount: Math.max(0, flowRoutes.length - 1),
    hasFallback,
    label: primary ? primary.isDefault ? '兜底' : `P${primary.priority}` : '未配置',
    primary,
    rank,
  };
}

function FlowsPanel({ flows, routes, validatingId, onNew, onEdit, onValidate, onToggle }: { flows: FlowConfig[]; routes: FlowRoute[]; validatingId: string | null; onNew: () => void; onEdit: (id: string) => void; onValidate: (id: string) => void; onToggle: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [expandedTypes, setExpandedTypes] = useState(() => new Set(ticketTypes));
  const grouped = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = flows.filter(flow => {
      const health = flowHealth(flow).label;
      const matchKeyword = !keyword || flow.name.toLowerCase().includes(keyword) || flow.approvalCode.toLowerCase().includes(keyword) || flow.ticketType.toLowerCase().includes(keyword);
      const matchType = typeFilter === 'all' || flow.ticketType === typeFilter;
      const matchStatus = statusFilter === 'all' || flow.status === statusFilter;
      const matchHealth = healthFilter === 'all'
        || (healthFilter === 'healthy' && health === '健康')
        || (healthFilter === 'attention' && ['异常', '待校验', '待配置'].includes(health));
      return matchKeyword && matchType && matchStatus && matchHealth;
    });
    return ticketTypes.map(type => ({
      type,
      flows: filtered
        .filter(flow => flow.ticketType === type)
        .sort((a, b) => primaryRouteFor(a, routes).rank - primaryRouteFor(b, routes).rank || a.name.localeCompare(b.name, 'zh-CN')),
    }));
  }, [flows, routes, search, typeFilter, statusFilter, healthFilter]);

  return (
    <>
      <div className="approval-v6__page-header approval-v6__page-header--ops">
        <div>
          <h1>飞书流程库</h1>
          <p>维护不同工单类型对应的飞书审批定义；列表按路由优先级排序，具体路由条件在流程详情中配置。</p>
        </div>
      </div>
      <div className="approval-v6__toolbar approval-v6__toolbar--ops">
        <div className="approval-v6__searchbox"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索流程名称、approval_code、工单类型" /></div>
        <Button variant="primary" onClick={onNew}>新增流程</Button>
        <select aria-label="工单类型筛选" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
          <option value="all">全部工单类型</option>
          {ticketTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select aria-label="启用状态筛选" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="all">全部状态</option>
          <option value="enabled">启用中</option>
          <option value="disabled">已停用</option>
        </select>
        <select aria-label="配置健康筛选" value={healthFilter} onChange={event => setHealthFilter(event.target.value)}>
          <option value="all">全部健康状态</option>
          <option value="healthy">健康</option>
          <option value="attention">待治理</option>
        </select>
      </div>
      <div className="approval-v6__flow-groups">
        {grouped.map(group => (
          <section key={group.type} className="approval-v6__flow-group">
            <button type="button" className="approval-v6__flow-group-head" onClick={() => setExpandedTypes(prev => { const next = new Set(prev); next.has(group.type) ? next.delete(group.type) : next.add(group.type); return next; })}>
              <span>{expandedTypes.has(group.type) ? '⌄' : '›'}</span>
              <strong>{group.type}</strong>
              <small>{group.flows.length} 条流程</small>
              <small>{group.flows.filter(flow => flow.status === 'enabled').length} 启用</small>
            </button>
            {expandedTypes.has(group.type) ? <FlowTable flows={group.flows} routes={routes} validatingId={validatingId} onEdit={onEdit} onValidate={onValidate} onToggle={onToggle} /> : null}
          </section>
        ))}
      </div>
    </>
  );
}

function FlowTable({ flows, routes, validatingId, onEdit, onValidate, onToggle }: { flows: FlowConfig[]; routes: FlowRoute[]; validatingId: string | null; onEdit: (id: string) => void; onValidate: (id: string) => void; onToggle: (id: string) => void }) {
  if (!flows.length) return <div className="approval-v6__empty">该工单类型暂无流程配置，点击新增</div>;
  return (
    <div className="approval-v6__table-wrap">
      <table>
        <thead><tr><th>优先级</th><th>飞书审批定义</th><th>路由规则名称</th><th>approval_code</th><th>状态</th><th>配置状态</th><th>责任人</th><th>最近校验</th><th>操作</th></tr></thead>
        <tbody>
          {flows.map(flow => {
            const health = flowHealth(flow);
            const routeMeta = primaryRouteFor(flow, routes);
            return (
              <tr key={flow.id}>
                <td><Tag tone={routeMeta.primary ? routeMeta.primary.isDefault ? 'gray' : 'blue' : 'warning'}>{routeMeta.label}</Tag></td>
                <td><button type="button" className="approval-v6__text-link strong" onClick={() => onEdit(flow.id)}>{flow.name}</button><span>{flow.description}</span></td>
                <td><strong className="approval-v6__route-name">{routeMeta.primary?.name ?? '未配置'}</strong>{routeMeta.extraCount ? <span>{routeMeta.hasFallback ? `+${routeMeta.extraCount}，含兜底 ${routeMeta.all.find(route => route.isDefault)?.name}` : `+${routeMeta.extraCount}`}</span> : null}</td>
                <td><code>{flow.approvalCode}</code></td>
                <td><Tag tone={toneForStatus(flow.status)}>{flowStatusLabel(flow)}</Tag></td>
                <td>
                  <span className={`approval-v6__health-dot ${health.className}`}>{health.label}</span>
                  <div className="approval-v6__mapping-stack">
                    <Tag tone={toneForStatus(flow.formMappingStatus)}>字段 {mappingLabel(flow.formMappingStatus)}</Tag>
                    <Tag tone={toneForStatus(flow.nodeMappingStatus)}>节点 {mappingLabel(flow.nodeMappingStatus)}</Tag>
                  </div>
                </td>
                <td><strong className="approval-v6__owner-cell">{flowResponsibleUser(flow.ticketType)}</strong><span>{flowOwnerLabel(flow.ticketType)}</span></td>
                <td><Tag tone={toneForStatus(flow.validateStatus)}>{validateLabel(flow.validateStatus)}</Tag>{flow.lastValidatedAt ? <span>{flow.lastValidatedAt}</span> : null}{flow.validateError ? <span className="danger-text">{flow.validateError}</span> : null}</td>
                <td><div className="approval-v6__row-actions"><button type="button" onClick={() => onEdit(flow.id)}>编辑</button><button type="button" onClick={() => onValidate(flow.id)}>{validatingId === flow.id ? '校验中...' : '校验'}</button><button type="button" onClick={() => onToggle(flow.id)}>{flow.status === 'enabled' ? '停用' : '启用'}</button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FlowDetailPanel(props: { flow: FlowConfig; tab: DetailTab; routes: FlowRoute[]; formMappings: FormMapping[]; nodeMappings: NodeMapping[]; validatingId: string | null; onTabChange: (tab: DetailTab) => void; onBack: () => void; onValidate: (id: string) => void; onEdit: () => void; onNewMapping: () => void; onEditMapping: (mapping: FormMapping) => void; onDeleteMapping: (id: string) => void; onNewNode: () => void; onEditNode: (node: NodeMapping) => void; onDeleteNode: (id: string) => void; onToggleNode: (id: string) => void; onNewRoute: () => void; onEditRoute: (route: FlowRoute) => void; onDeleteRoute: (id: string) => void }) {
  const flowMappings = props.formMappings.filter(item => item.flowConfigId === props.flow.id);
  const flowNodes = props.nodeMappings.filter(item => item.flowConfigId === props.flow.id);
  const flowRoutes = props.routes.filter(item => item.flowConfigId === props.flow.id).sort((a, b) => a.priority - b.priority);
  return (
    <section className="approval-v6__flow-detail">
      <div className="approval-v6__detail-hero">
        <div className="approval-v6__detail-title">
          <Button size="sm" onClick={props.onBack}>返回流程库</Button>
          <span>/</span>
          <strong>{props.flow.name}</strong>
          <Tag tone={toneForStatus(props.flow.status)}>{flowStatusLabel(props.flow)}</Tag>
          <Tag tone={props.flow.validateStatus === 'passed' ? 'success' : props.flow.validateStatus === 'failed' ? 'danger' : 'warning'}>{validateLabel(props.flow.validateStatus)}</Tag>
        </div>
        <div className="approval-v6__detail-actions">
          <Button size="sm" onClick={() => props.onValidate(props.flow.id)}>{props.validatingId === props.flow.id ? '校验中...' : '校验'}</Button>
          <Button size="sm" variant="primary" onClick={props.onEdit}>编辑</Button>
        </div>
      </div>
      <div className="approval-v6__detail-summary">
        <InfoItem label="工单类型" value={props.flow.ticketType} />
        <InfoItem label="approval_code" value={props.flow.approvalCode} code />
        <InfoItem label="用户 ID 类型" value={props.flow.idType} />
        <InfoItem label="最近校验" value={props.flow.lastValidatedAt ?? '未校验'} />
        <InfoItem label="最近更新" value={props.flow.updatedAt} />
      </div>
      <RouteHitChain routes={flowRoutes} />
      <Tabs items={[{ key: 'basic', label: '配置详情' }, { key: 'form-mapping', label: `映射表 ${mappingLabel(props.flow.formMappingStatus)}` }, { key: 'node-mapping', label: `节点表 ${mappingLabel(props.flow.nodeMappingStatus)}` }, { key: 'route-rules', label: `路由规则 ${flowRoutes.length}` }]} activeKey={props.tab} onChange={(key) => props.onTabChange(key as DetailTab)} />
      {props.tab === 'basic' ? <BasicFlowTab flow={props.flow} validating={props.validatingId === props.flow.id} onValidate={() => props.onValidate(props.flow.id)} onEdit={props.onEdit} /> : null}
      {props.tab === 'form-mapping' ? <FormMappingTab mappings={flowMappings} onNew={props.onNewMapping} onEdit={props.onEditMapping} onDelete={props.onDeleteMapping} /> : null}
      {props.tab === 'node-mapping' ? <NodeMappingTab nodes={flowNodes} onNew={props.onNewNode} onEdit={props.onEditNode} onDelete={props.onDeleteNode} onToggle={props.onToggleNode} /> : null}
      {props.tab === 'route-rules' ? <RouteRulesTab routes={flowRoutes} onNew={props.onNewRoute} onEdit={props.onEditRoute} onDelete={props.onDeleteRoute} /> : null}
    </section>
  );
}

function RouteHitChain({ routes }: { routes: FlowRoute[] }) {
  return (
    <div className="approval-v6__detail-route-chain">
      <span>路由命中链</span>
      {routes.length ? (
        <div>
          {routes.map((route, index) => <Fragment key={route.id}><b className={route.isDefault ? 'fallback' : ''}>{route.isDefault ? '兜底' : `P${index + 1}`} {route.name}</b>{index < routes.length - 1 ? <i>→</i> : null}</Fragment>)}
        </div>
      ) : <em>当前流程暂无路由规则</em>}
    </div>
  );
}

function BasicFlowTab({ flow, validating, onValidate, onEdit }: { flow: FlowConfig; validating: boolean; onValidate: () => void; onEdit: () => void }) {
  return (
    <div className="approval-v6__panel-card">
      <div className="approval-v6__panel-head"><div><h2>配置详情</h2><p>维护平台与飞书审批定义之间的绑定关系。</p></div><div><Button size="sm" onClick={onValidate}>{validating ? '校验中...' : '校验'}</Button><Button size="sm" variant="primary" onClick={onEdit}>编辑</Button></div></div>
      <div className="approval-v6__detail-sections">
        <DetailSection title="基础信息">
          <InfoItem label="工单类型" value={flow.ticketType} />
          <InfoItem label="状态" value={flowStatusLabel(flow)} />
          <InfoItem label="描述" value={flow.description || '—'} wide />
        </DetailSection>
        <DetailSection title="飞书审批定义">
          <InfoItem label="飞书审批定义名称" value={flow.name} />
          <InfoItem label="approval_code" value={flow.approvalCode} code />
          <InfoItem label="用户 ID 类型" value={flow.idType} />
        </DetailSection>
        <DetailSection title="配置状态">
          <InfoItem label="字段映射" value={mappingLabel(flow.formMappingStatus)} />
          <InfoItem label="节点映射" value={mappingLabel(flow.nodeMappingStatus)} />
          <InfoItem label="最近校验" value={validateLabel(flow.validateStatus)} />
          <InfoItem label="校验时间" value={flow.lastValidatedAt ?? '未校验'} />
          <InfoItem label="创建时间" value={flow.createdAt} />
          <InfoItem label="最近更新" value={flow.updatedAt} />
          {flow.validateError ? <InfoItem label="校验异常" value={flow.validateError} wide /> : null}
        </DetailSection>
      </div>
      <div className="approval-v6__detail-note">飞书侧负责审批流程、节点顺序、条件分支和会签规则；平台只维护 approval_code 绑定、映射表、节点表和路由规则。</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="approval-v6__detail-section"><h3>{title}</h3><div className="approval-v6__info-grid">{children}</div></section>;
}

function InfoItem({ label, value, code, wide }: { label: string; value: string; code?: boolean; wide?: boolean }) {
  return <div className={wide ? 'wide' : ''}><span>{label}</span>{code ? <code>{value}</code> : <strong>{value}</strong>}</div>;
}

function FormMappingTab({ mappings, onNew, onEdit, onDelete }: { mappings: FormMapping[]; onNew: () => void; onEdit: (mapping: FormMapping) => void; onDelete: (id: string) => void }) {
  const [preview, setPreview] = useState(false);
  const jsonPreview = JSON.stringify(Object.fromEntries(mappings.map(item => [item.feishuWidgetId, item.exampleValue])), null, 2);
  return (
    <div className="approval-v6__panel-card"><div className="approval-v6__panel-head"><div><h2>映射表</h2><p>配置平台字段与飞书审批表单控件的对应关系，共 {mappings.length} 条。</p></div><div><Button size="sm" onClick={() => setPreview(true)}>预览 JSON</Button><Button size="sm" variant="primary" onClick={onNew}>新增映射</Button></div></div>
      <div className="approval-v6__table-wrap"><table><thead><tr><th>平台字段</th><th>飞书控件 ID</th><th>控件类型</th><th>转换规则</th><th>示例值</th><th>必填</th><th>用于条件</th><th>操作</th></tr></thead><tbody>{mappings.length ? mappings.map(mapping => <tr key={mapping.id}><td><strong>{mapping.platformField}</strong></td><td><code>{mapping.feishuWidgetId}</code></td><td>{mapping.widgetType}</td><td>{mapping.transformRule}</td><td>{mapping.exampleValue}</td><td><Tag tone={mapping.required ? 'blue' : 'gray'}>{mapping.required ? '必填' : '可选'}</Tag></td><td>{mapping.usedInCondition ? <Tag tone="warning">是</Tag> : '—'}</td><td><div className="approval-v6__row-actions"><button type="button" onClick={() => onEdit(mapping)}>编辑</button><button type="button" className="danger" onClick={() => onDelete(mapping.id)}>删除</button></div></td></tr>) : <tr><td colSpan={8}><div className="approval-v6__empty-row">暂无字段映射</div></td></tr>}</tbody></table></div>
      {preview ? <Modal open title="JSON 预览" onClose={() => setPreview(false)}><pre className="approval-v6__json">{jsonPreview}</pre></Modal> : null}
    </div>
  );
}

function NodeMappingTab({ nodes, onNew, onEdit, onDelete, onToggle }: { nodes: NodeMapping[]; onNew: () => void; onEdit: (node: NodeMapping) => void; onDelete: (id: string) => void; onToggle: (id: string) => void }) {
  return <div className="approval-v6__panel-card"><div className="approval-v6__panel-head"><div><h2>节点表</h2><p>将飞书动态审批节点映射到平台审批人解析规则。</p></div><Button size="sm" variant="primary" onClick={onNew}>新增节点映射</Button></div><div className="approval-v6__table-wrap"><table><thead><tr><th>节点名称</th><th>节点 ID</th><th>审批人规则</th><th>审批方式</th><th>缺失处理</th><th>状态</th><th>操作</th></tr></thead><tbody>{nodes.length ? nodes.map(node => <tr key={node.id}><td><strong>{node.feishuNodeName}</strong><span>{node.description}</span></td><td><code>{node.feishuNodeId}</code></td><td>{node.approverRuleType}</td><td>{node.multiApproverMode === 'countersign' ? '会签' : '单人审批'}</td><td>{node.missingAction === 'fallback' ? '使用兜底' : '阻断提交'}</td><td><Tag tone={node.enabled ? 'success' : 'gray'}>{node.enabled ? '启用' : '停用'}</Tag></td><td><div className="approval-v6__row-actions"><button type="button" onClick={() => onEdit(node)}>编辑</button><button type="button" onClick={() => onToggle(node.id)}>{node.enabled ? '停用' : '启用'}</button><button type="button" className="danger" onClick={() => onDelete(node.id)}>删除</button></div></td></tr>) : <tr><td colSpan={7}><div className="approval-v6__empty-row">暂无节点映射</div></td></tr>}</tbody></table></div></div>;
}

function RouteRulesTab({ routes, onNew, onEdit, onDelete }: { routes: FlowRoute[]; onNew: () => void; onEdit: (route: FlowRoute) => void; onDelete: (id: string) => void }) {
  return <div className="approval-v6__panel-card"><div className="approval-v6__panel-head"><div><h2>路由规则</h2><p>配置命中当前流程的路由条件和优先级。</p></div><Button size="sm" variant="primary" onClick={onNew}>新增路由规则</Button></div><div className="approval-v6__route-list">{routes.length ? routes.map((route, index) => <div key={route.id} className={`approval-v6__route-card ${route.isDefault ? 'default' : ''}`}><div><b>{route.isDefault ? '兜底' : `P${index + 1}`}</b><strong>{route.name}</strong><small>{route.description}</small></div><Tag tone={route.enabled ? 'success' : 'gray'}>{route.enabled ? '启用' : '停用'}</Tag><div className="approval-v6__route-conditions">{route.conditions.length ? route.conditions.map(condition => <span key={condition.id}>{condition.fieldLabel} {condition.operatorLabel} {routeValueText(condition)}{condition.matchMode === 'include_descendants' ? '（含子目录）' : ''}</span>) : <span>无条件命中</span>}</div><div className="approval-v6__row-actions"><button type="button" onClick={() => onEdit(route)}>编辑</button><button type="button" className="danger" onClick={() => onDelete(route.id)}>删除</button></div></div>) : <div className="approval-v6__empty-row">暂无路由规则</div>}</div></div>;
}

function RolesPanel({ roles, onNew, onEdit }: { roles: ApprovalRole[]; onNew: () => void; onEdit: (role: ApprovalRole) => void }) {
  return <section><div className="approval-v6__page-header"><div><h1>审批角色管理</h1><p>管理平台审批角色及其成员，固定角色类型的动态节点将从此处解析审批人。</p></div><Button variant="primary" onClick={onNew}>新增角色</Button></div><div className="approval-v6__role-grid">{roles.map(role => <article key={role.id} className="approval-v6__role-card"><header><div><strong>{role.roleName}</strong><code>{role.roleCode}</code></div><button type="button" onClick={() => onEdit(role)}>编辑</button></header><Tag tone={role.enabled ? 'success' : 'gray'}>{role.enabled ? '启用' : '停用'}</Tag><div className="approval-v6__member-list"><span>成员列表（{role.members.length} 人）</span>{role.members.length ? role.members.map(member => <div key={member.openId}><strong>{member.name}</strong><code>{member.openId}</code><Tag tone={member.feishuBound ? 'success' : 'danger'}>{member.feishuBound ? '已绑定' : '未绑定'}</Tag></div>) : <p>暂无成员，请添加</p>}</div></article>)}</div></section>;
}

function MonitorPanel() {
  return <section className="approval-v6__simple-panel"><h1>同步监控</h1><p>监控飞书审批定义、实例状态、回调事件和补偿同步。</p><div className="approval-v6__cards"><div><strong>今日回调</strong><span>128 次，失败 1 次</span><Tag tone="success">运行中</Tag></div><div><strong>补偿队列</strong><span>2 条待重试</span><Tag tone="warning">需关注</Tag></div></div></section>;
}

function DrawerHost({ drawer, setDrawer, onSaveFlow, onSaveMapping, onSaveNode, onSaveRoute, onSaveRole }: { drawer: DrawerState; setDrawer: (drawer: DrawerState) => void; onSaveFlow: (flow: FlowConfig) => void; onSaveMapping: (mapping: FormMapping, isNew: boolean) => void; onSaveNode: (node: NodeMapping, isNew: boolean) => void; onSaveRoute: (route: FlowRoute, isNew: boolean) => void; onSaveRole: (role: ApprovalRole, isNew: boolean) => void }) {
  if (!drawer) return null;
  if (drawer.kind === 'instance') return <InstanceDrawer instance={drawer.instance} onClose={() => setDrawer(null)} />;
  return <div className="approval-v6__drawer-mask" onClick={() => setDrawer(null)}><aside className="approval-v6__drawer" onClick={event => event.stopPropagation()}><DrawerContent drawer={drawer} setDrawer={setDrawer} onSaveFlow={onSaveFlow} onSaveMapping={onSaveMapping} onSaveNode={onSaveNode} onSaveRoute={onSaveRoute} onSaveRole={onSaveRole} /></aside></div>;
}

function DrawerContent(props: { drawer: Exclude<DrawerState, { kind: 'instance' } | null>; setDrawer: (drawer: DrawerState) => void; onSaveFlow: (flow: FlowConfig) => void; onSaveMapping: (mapping: FormMapping, isNew: boolean) => void; onSaveNode: (node: NodeMapping, isNew: boolean) => void; onSaveRoute: (route: FlowRoute, isNew: boolean) => void; onSaveRole: (role: ApprovalRole, isNew: boolean) => void }) {
  const { drawer, setDrawer } = props;
  const [memberName, setMemberName] = useState('');
  const [memberOpenId, setMemberOpenId] = useState('');

  if (drawer.kind === 'new-flow' || drawer.kind === 'edit-flow') {
    const title = drawer.kind === 'new-flow' ? '新增流程配置' : '编辑流程信息';
    return <EditableDrawer title={title} onClose={() => setDrawer(null)} onSave={() => props.onSaveFlow(drawer.flow)}><FlowForm flow={drawer.flow} onChange={(flow) => setDrawer({ ...drawer, flow })} /></EditableDrawer>;
  }
  if (drawer.kind === 'form') return <EditableDrawer title={drawer.isNew ? '新增字段映射' : '编辑字段映射'} onClose={() => setDrawer(null)} onSave={() => props.onSaveMapping(drawer.mapping, drawer.isNew)}><FormMappingForm mapping={drawer.mapping} onChange={(mapping) => setDrawer({ ...drawer, mapping })} /></EditableDrawer>;
  if (drawer.kind === 'node') return <EditableDrawer title={drawer.isNew ? '新增节点映射' : '编辑节点映射'} onClose={() => setDrawer(null)} onSave={() => props.onSaveNode(drawer.node, drawer.isNew)}><NodeForm node={drawer.node} onChange={(node) => setDrawer({ ...drawer, node })} /></EditableDrawer>;
  if (drawer.kind === 'route') return <EditableDrawer title={drawer.isNew ? `新增路由规则 · ${drawer.route.ticketType}` : `编辑路由规则 · ${drawer.route.ticketType}`} onClose={() => setDrawer(null)} onSave={() => props.onSaveRoute(drawer.route, drawer.isNew)}><RouteForm route={drawer.route} onChange={(route) => setDrawer({ ...drawer, route })} /></EditableDrawer>;
  return <EditableDrawer title={drawer.isNew ? '新增审批角色' : '编辑审批角色'} onClose={() => setDrawer(null)} onSave={() => props.onSaveRole(drawer.role, drawer.isNew)}><RoleForm role={drawer.role} memberName={memberName} memberOpenId={memberOpenId} onMemberName={setMemberName} onMemberOpenId={setMemberOpenId} onChange={(role) => setDrawer({ ...drawer, role })} /></EditableDrawer>;
}

function EditableDrawer({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return <><header><h2>{title}</h2><button type="button" onClick={onClose}>×</button></header><div className="approval-v6__drawer-body">{children}</div><footer className="approval-v6__drawer-footer"><Button onClick={onClose}>取消</Button><Button variant="primary" onClick={onSave}>保存</Button></footer></>;
}

function FlowForm({ flow, onChange }: { flow: FlowConfig; onChange: (flow: FlowConfig) => void }) {
  return <div className="approval-v6__form"><label>工单类型<select value={flow.ticketType} onChange={event => onChange({ ...flow, ticketType: event.target.value })}>{ticketTypes.map(type => <option key={type}>{type}</option>)}</select></label><label>飞书审批定义名称<input value={flow.name} onChange={event => onChange({ ...flow, name: event.target.value })} placeholder="如：权限申请_高安全等级版" /></label><label>approval_code<input value={flow.approvalCode} onChange={event => onChange({ ...flow, approvalCode: event.target.value })} placeholder="飞书审批定义 Code" /></label><label>描述<textarea value={flow.description} onChange={event => onChange({ ...flow, description: event.target.value })} /></label><label className="checkline"><input type="checkbox" checked={flow.status === 'enabled'} onChange={event => onChange({ ...flow, status: event.target.checked ? 'enabled' : 'disabled' })} />启用状态</label></div>;
}

function FormMappingForm({ mapping, onChange }: { mapping: FormMapping; onChange: (mapping: FormMapping) => void }) {
  return <div className="approval-v6__form"><label>平台字段名称<input value={mapping.platformField} onChange={event => onChange({ ...mapping, platformField: event.target.value })} placeholder="如：安全等级" /></label><label>飞书控件 ID<input value={mapping.feishuWidgetId} onChange={event => onChange({ ...mapping, feishuWidgetId: event.target.value })} placeholder="如：security_level" /></label><label>控件类型<select value={mapping.widgetType} onChange={event => onChange({ ...mapping, widgetType: event.target.value })}>{['input', 'textarea', 'select', 'date', 'contact', 'number'].map(type => <option key={type}>{type}</option>)}</select></label><label>转换规则<textarea value={mapping.transformRule} onChange={event => onChange({ ...mapping, transformRule: event.target.value })} /></label><label>示例值<input value={mapping.exampleValue} onChange={event => onChange({ ...mapping, exampleValue: event.target.value })} /></label><label className="checkline"><input type="checkbox" checked={mapping.required} onChange={event => onChange({ ...mapping, required: event.target.checked })} />必填</label><label className="checkline"><input type="checkbox" checked={mapping.usedInCondition} onChange={event => onChange({ ...mapping, usedInCondition: event.target.checked })} />用于飞书条件判断</label></div>;
}

function NodeForm({ node, onChange }: { node: NodeMapping; onChange: (node: NodeMapping) => void }) {
  return <div className="approval-v6__form"><label>飞书节点名称<input value={node.feishuNodeName} onChange={event => onChange({ ...node, feishuNodeName: event.target.value })} /></label><label>飞书节点 ID<input value={node.feishuNodeId} onChange={event => onChange({ ...node, feishuNodeId: event.target.value })} /></label><label>审批人规则<select value={node.approverRuleType} onChange={event => onChange({ ...node, approverRuleType: event.target.value as NodeMapping['approverRuleType'] })}><option value="direct_manager">直属上级</option><option value="resource_owner">资源负责人</option><option value="directory_owner">目录负责人</option><option value="fixed_role">固定角色</option></select></label><label>审批方式<select value={node.multiApproverMode} onChange={event => onChange({ ...node, multiApproverMode: event.target.value as NodeMapping['multiApproverMode'] })}><option value="single">单人审批</option><option value="countersign">会签</option></select></label><label>缺失处理<select value={node.missingAction} onChange={event => onChange({ ...node, missingAction: event.target.value as NodeMapping['missingAction'] })}><option value="block">阻断提交</option><option value="fallback">使用兜底</option></select></label><label>描述<textarea value={node.description} onChange={event => onChange({ ...node, description: event.target.value })} /></label><label className="checkline"><input type="checkbox" checked={node.enabled} onChange={event => onChange({ ...node, enabled: event.target.checked })} />启用</label></div>;
}

function RouteForm({ route, onChange }: { route: FlowRoute; onChange: (route: FlowRoute) => void }) {
  function addCondition() {
    onChange({ ...route, conditions: [...route.conditions, { id: `cond-${Date.now()}`, field: 'security_level', fieldLabel: '安全等级', operator: 'in', operatorLabel: '属于', value: [], valueLabel: [] }] });
  }
  function updateCondition(id: string, patch: Partial<RouteCondition>) {
    onChange({ ...route, conditions: route.conditions.map(condition => condition.id === id ? { ...condition, ...patch } : condition) });
  }
  return <div className="approval-v6__form"><label>规则名称<input value={route.name} onChange={event => onChange({ ...route, name: event.target.value })} /></label><label>优先级<input type="number" value={route.priority} onChange={event => onChange({ ...route, priority: Number(event.target.value) })} /></label><label>描述<textarea value={route.description} onChange={event => onChange({ ...route, description: event.target.value })} /></label><label className="checkline"><input type="checkbox" checked={route.isDefault} onChange={event => onChange({ ...route, isDefault: event.target.checked, conditions: event.target.checked ? [] : route.conditions })} />兜底规则</label><label className="checkline"><input type="checkbox" checked={route.enabled} onChange={event => onChange({ ...route, enabled: event.target.checked })} />启用</label>{!route.isDefault ? <div className="approval-v6__condition-editor"><div><strong>命中条件</strong><Button size="sm" onClick={addCondition}>添加条件</Button></div>{route.conditions.map(condition => <div key={condition.id} className="approval-v6__condition-row"><select value={condition.field} aria-label="条件字段" onChange={event => updateCondition(condition.id, normalizeConditionForField(condition, event.target.value))}>{routeFields.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}</select><select value={condition.operator} aria-label="条件操作符" onChange={event => { const operator = routeOperators.find(item => item.value === event.target.value)!; updateCondition(condition.id, { operator: operator.value, operatorLabel: operator.label }); }}>{routeOperators.map(operator => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select><ConditionValueEditor condition={condition} onChange={(patch) => updateCondition(condition.id, patch)} /><button type="button" onClick={() => onChange({ ...route, conditions: route.conditions.filter(item => item.id !== condition.id) })}>删除</button></div>)}</div> : null}</div>;
}

function ConditionValueEditor({ condition, onChange }: { condition: RouteCondition; onChange: (patch: Partial<RouteCondition>) => void }) {
  if (condition.field === 'catalog_path') {
    const options = flattenCatalog(catalogTree);
    const selected = Array.isArray(condition.value) ? condition.value : condition.value ? [condition.value] : [];
    return (
      <div className="approval-v6__catalog-picker" aria-label="目录多选">
        <CatalogTree
          nodes={catalogTree}
          selected={selected}
          onToggle={(node, checked) => {
            const values = updateCatalogSelection(selected, node, checked);
            const labels = values.map(item => options.find(option => option.value === item)?.label ?? item);
            onChange({ value: values, valueLabel: labels, matchMode: 'include_descendants' });
          }}
        />
        <small>选择父目录会自动覆盖当前和未来新增的子目录；选择叶子目录仅命中该目录。</small>
      </div>
    );
  }
  if (condition.field === 'is_cross_dept') {
    return <select value={String(condition.value || 'true')} aria-label="是否跨部门" onChange={event => onChange({ value: event.target.value, valueLabel: event.target.value === 'true' ? '是' : '否' })}><option value="true">是</option><option value="false">否</option></select>;
  }
  const optionsByField: Record<string, Array<{ value: string; label: string }>> = {
    security_level: securityLevelOptions,
    asset_type: assetTypeOptions,
    source_type: sourceTypeOptions,
    source_system: sourceSystemOptions,
    applicant_dept: applicantDeptOptions,
    permission_type: permissionTypeOptions,
  };
  const options = optionsByField[condition.field] ?? [];
  if (!options.length) {
    const value = Array.isArray(condition.valueLabel) ? condition.valueLabel.join('、') : condition.valueLabel || condition.value;
    return <input value={String(value)} onChange={event => onChange({ value: event.target.value, valueLabel: event.target.value })} placeholder="条件值" />;
  }
  const selected = new Set(Array.isArray(condition.value) ? condition.value : condition.value ? [condition.value] : []);
  return <div className="approval-v6__multi-options">{options.map(option => <label key={option.value}><input type="checkbox" checked={selected.has(option.value)} onChange={event => onChange(updateMultiValue(condition, options, option.value, event.target.checked))} />{option.label}</label>)}</div>;
}

function CatalogTree({ nodes, selected, onToggle }: { nodes: CatalogNode[]; selected: string[]; onToggle: (node: CatalogNode, checked: boolean) => void }) {
  return (
    <div className="approval-v6__catalog-tree">
      {nodes.map(node => {
        const checked = isCatalogPathChecked(node.path, selected);
        const inherited = checked && !selected.includes(node.path);
        return (
          <div key={node.id}>
            <label className={inherited ? 'is-inherited' : ''}>
              <input
                type="checkbox"
                checked={checked}
                aria-label={node.path}
                onChange={event => onToggle(node, inherited ? true : event.target.checked)}
              />
              {node.label}
              <span>{node.path}</span>
              {node.children?.length ? <em>含子目录</em> : null}
              {inherited ? <em>随父目录命中</em> : null}
            </label>
            {node.children ? <CatalogTree nodes={node.children} selected={selected} onToggle={onToggle} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function RoleForm({ role, onChange, memberName, memberOpenId, onMemberName, onMemberOpenId }: { role: ApprovalRole; onChange: (role: ApprovalRole) => void; memberName: string; memberOpenId: string; onMemberName: (value: string) => void; onMemberOpenId: (value: string) => void }) {
  return <div className="approval-v6__form"><label>角色名称<input value={role.roleName} onChange={event => onChange({ ...role, roleName: event.target.value })} placeholder="如：安全管理员" /></label><label>角色编码<input value={role.roleCode} onChange={event => onChange({ ...role, roleCode: event.target.value })} placeholder="如：security_admin" /></label><label className="checkline"><input type="checkbox" checked={role.enabled} onChange={event => onChange({ ...role, enabled: event.target.checked })} />启用状态</label><div className="approval-v6__member-editor"><strong>成员管理</strong>{role.members.map(member => <div key={member.openId}><span>{member.name}</span><code>{member.openId}</code><button type="button" onClick={() => onChange({ ...role, members: role.members.filter(item => item.openId !== member.openId) })}>移除</button></div>)}<div><input value={memberName} onChange={event => onMemberName(event.target.value)} placeholder="姓名" /><input value={memberOpenId} onChange={event => onMemberOpenId(event.target.value)} placeholder="open_id" /><button type="button" onClick={() => { if (!memberName || !memberOpenId) return; onChange({ ...role, members: [...role.members, { name: memberName, openId: memberOpenId, feishuBound: true }] }); onMemberName(''); onMemberOpenId(''); }}>添加</button></div></div></div>;
}

function InstanceDrawer({ instance, onClose }: { instance: ApprovalInstance; onClose: () => void }) {
  const ticketType = instance.ticketType ?? '权限申请';

  return (
    <div className="approval-v6__drawer-mask" onClick={onClose}>
      <aside className="approval-v6__drawer approval-v6__drawer--approval-detail" aria-label="工单详情" onClick={event => event.stopPropagation()}>
        <header>
          <h2>工单详情</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="approval-v6__instance-detail">
          <div className="approval-v6__instance-header">
            <Tag tone={toneForStatus(instance.status)}>{statusLabel(instance.status)}</Tag>
            <Tag tone={toneForStatus(instance.effectStatus)}>{effectLabel(instance.effectStatus)}</Tag>
            <code>{instance.instanceCode}</code>
          </div>

          <ApprovalDetailTables record={instance} />

          <h3>审批节点</h3>
          {instance.approvers.map(node => (
            <div key={node.nodeId} className="approval-v6__timeline">
              <strong>{node.nodeName}</strong>
              <span>{node.approvers.map(item => item.name).join('、')}{node.mode === 'countersign' ? '（会签）' : ''}</span>
            </div>
          ))}

          <h3>审批时间线</h3>
          {instance.timeline.map((item, index) => (
            <div key={index} className="approval-v6__timeline">
              <strong>{item.action}</strong>
              <span>{item.operator} · {item.time}</span>
              {item.comment ? <em>{item.comment}</em> : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function supportsInstancePermissionType(ticketType: string) {
  return ticketType !== '目录修改' && ticketType !== '血缘修正' && ticketType !== '下架审批';
}

function instanceSpecificRows(instance: ApprovalInstance, ticketType: string) {
  if (ticketType === '权限申请') return [['权限类型', instance.permissionType], ['申请期限', instance.expireDate]];
  if (ticketType === '上架审批') return [['上架说明', instance.permissionType || '—']];
  if (ticketType === '下架审批') return [['下架原因', instance.permissionType || '—'], ['影响使用方', instance.assets.length > 0 ? '见资产列表' : '—']];
  if (ticketType === '目录修改') return [['变更类型', '拖动目录'], ['原目录', instance.directory]];
  if (ticketType === '负责人交接') return [['交接类型', instance.permissionType || '—']];
  if (ticketType === '血缘修正') return [['变更说明', instance.permissionType || '—']];
  return [];
}

function pairRows(items: string[][]) {
  const rows: string[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    const current = items[index];
    const next = items[index + 1] ?? ['', ''];
    rows.push([current[0], current[1], next[0], next[1]]);
  }
  return rows;
}

function InstanceInfoTable({ instance, ticketType }: { instance: ApprovalInstance; ticketType: string }) {
  const rows = pairRows([
    ['申请资产', instance.assets.join('、')],
    ['安全等级', instance.securityLevel],
    ['目录路径', instance.directory],
    ['来源', `${sourceTypeLabel(instance.sourceType)} / ${instance.sourceSystem}`],
    ['命中流程', instance.matchedFlow],
    ['命中规则', instance.matchedRoute],
    ...instanceSpecificRows(instance, ticketType),
  ]);

  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-info-table" aria-label="申请信息表">
        <tbody>
          {rows.map(row => (
            <tr key={row[0]}>
              <th scope="row">{row[0]}</th>
              <td>{row[1]}</td>
              {row[2] ? (
                <>
                  <th scope="row">{row[2]}</th>
                  <td>{row[3]}</td>
                </>
              ) : <td colSpan={2} />}
            </tr>
          ))}
          <tr>
            <th scope="row">申请原因</th>
            <td colSpan={3} className="approval-v6__reason-cell">{instance.reason}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function InstanceAssetsTable({ instance, ticketType }: { instance: ApprovalInstance; ticketType: string }) {
  const permissionType = supportsInstancePermissionType(ticketType) ? instance.permissionType : '—';

  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-table" aria-label="申请资产明细表">
        <thead>
          <tr>
            <th>资产名称</th>
            <th>来源类型</th>
            <th>来源系统</th>
            <th>目录归属</th>
            <th>安全等级</th>
            <th>权限类型</th>
          </tr>
        </thead>
        <tbody>
          {instance.assets.map(asset => (
            <tr key={asset}>
              <td><strong>{asset}</strong><span className="approval-v6__asset-subtext">{instance.directory}</span></td>
              <td>{sourceTypeLabel(instance.sourceType)}</td>
              <td>{instance.sourceSystem}</td>
              <td>{instance.directory}</td>
              <td><Tag tone={instance.securityLevel === 'S4' || instance.securityLevel === 'S5' ? 'danger' : 'blue'}>{instance.securityLevel}</Tag></td>
              <td>{permissionType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
