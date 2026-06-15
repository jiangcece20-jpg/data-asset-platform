import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../components/base/Button';
import { Tag } from '../../../components/base/Tag';
import { Modal } from '../../../components/feedback/Modal';
import type { PendingTask } from '../approvalData';
// re-export for consumers
export type { PendingTask };

const sourceTypeOptions = [
  { value: 'warehouse_engine', label: '数仓引擎' },
  { value: 'analytic_db', label: '分析型数据库' },
  { value: 'biz_database', label: '业务数据库' },
  { value: 'report_system', label: '报表系统' },
  { value: 'api_service', label: 'API服务' },
  { value: 'message_stream', label: '消息队列' },
  { value: 'file_storage', label: '文件存储' },
  { value: 'metric_platform', label: '指标平台' },
];

function sourceTypeLabel(value: string) {
  return sourceTypeOptions.find(item => item.value === value)?.label ?? value;
}

type ApprovalActionType = 'approve' | 'reject';
export type ActionDialog =
  | { mode?: 'single'; task: PendingTask; type: ApprovalActionType }
  | { mode: 'batch'; tasks: PendingTask[]; type: ApprovalActionType }
  | null;

interface PendingPanelProps {
  tasks: PendingTask[];
  onOpenAction: (action: ActionDialog) => void;
}

export function PendingPanel({ tasks, onOpenAction }: PendingPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailTask, setDetailTask] = useState<PendingTask | null>(null);
  const selectedTasks = useMemo(() => tasks.filter(task => selectedIds.includes(task.id)), [tasks, selectedIds]);
  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => tasks.some(task => task.id === id)));
    setDetailTask(prev => prev && tasks.some(task => task.id === prev.id) ? prev : null);
  }, [tasks]);

  function toggleTask(taskId: string, checked: boolean) {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, taskId])) : prev.filter(id => id !== taskId));
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? tasks.map(task => task.id) : []);
  }

  function openBatchAction(type: ApprovalActionType) {
    if (!selectedTasks.length) return;
    onOpenAction({ mode: 'batch', tasks: selectedTasks, type });
  }

  if (tasks.length === 0) {
    return (
      <section>
        <div className="approval-v6__page-header">
          <div>
            <h1>待我审批</h1>
            <p>可在平台直接审批通过或拒绝，结果将同步至飞书审批实例。</p>
          </div>
        </div>
        <div className="approval-v6__empty">暂无待审批任务</div>
      </section>
    );
  }

  return (
    <section>
      <div className="approval-v6__page-header">
        <div>
          <h1>待我审批</h1>
          <p>可在平台直接审批通过或拒绝，结果将同步至飞书审批实例。</p>
        </div>
        <div className="approval-v6__pending-count">{tasks.length} 条待处理</div>
      </div>

      <div className="approval-v6__pending-bulkbar">
        <span>{selectedTasks.length ? `已选择 ${selectedTasks.length} 项` : `待处理 ${tasks.length} 项`}</span>
        <div>
          <Button size="sm" variant="primary" disabled={!selectedTasks.length} onClick={() => openBatchAction('approve')}>批量通过</Button>
          <Button size="sm" variant="danger" disabled={!selectedTasks.length} onClick={() => openBatchAction('reject')}>批量拒绝</Button>
          {selectedTasks.length ? <Button size="sm" onClick={() => setSelectedIds([])}>清空选择</Button> : null}
        </div>
      </div>

      <div className="approval-v6__pending-table-card">
        <div className="approval-v6__table-wrap">
          <table className="approval-v6__pending-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="选择全部待审批任务" checked={allSelected} onChange={event => toggleAll(event.target.checked)} /></th>
                <th>工单号</th>
                <th>申请人</th>
                <th>工单类型</th>
                <th>资产摘要</th>
                <th>等级/权限</th>
                <th>等待时长</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <PendingTaskRow
                  key={task.id}
                  task={task}
                  selected={selectedIds.includes(task.id)}
                  onSelect={(checked) => toggleTask(task.id, checked)}
                  onView={setDetailTask}
                  onOpenAction={onOpenAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {detailTask ? (
        <PendingTaskDrawer
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onOpenAction={onOpenAction}
        />
      ) : null}
    </section>
  );
}

interface PendingTaskRowProps {
  task: PendingTask;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onView: (task: PendingTask) => void;
  onOpenAction: (action: ActionDialog) => void;
}

function assetSummary(task: PendingTask) {
  if (!task.assets.length) return '暂无资产';
  if (task.assets.length === 1) return task.assets[0];
  return `${task.assets[0]} 等 ${task.assets.length} 个资产`;
}

export function PendingTaskRow({ task, selected, onSelect, onView, onOpenAction }: PendingTaskRowProps) {
  const ticketType = task.ticketType ?? '权限申请';

  return (
    <tr className={selected ? 'selected' : ''}>
      <td><input type="checkbox" aria-label={`选择 ${task.subOrderNo}`} checked={selected} onChange={event => onSelect(event.target.checked)} /></td>
      <td><button type="button" className="approval-v6__text-link strong" onClick={() => onView(task)}>{task.subOrderNo}</button><span>{task.instanceCode}</span></td>
      <td><strong>{task.applicant}</strong><span>{task.applicantDept}</span></td>
      <td><Tag tone="warning">{ticketType}</Tag><span>{task.nodeName}</span></td>
      <td><strong className="approval-v6__route-name">{assetSummary(task)}</strong><span>{task.directory}</span></td>
      <td><Tag tone={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? 'danger' : 'blue'}>{task.securityLevel}</Tag>{ticketType !== '目录修改' && ticketType !== '血缘修正' && ticketType !== '下架审批' ? <span>{task.permissionType}</span> : null}</td>
      <td><strong>{task.waitingHours}h</strong></td>
      <td>{task.createdAt}</td>
      <td>
        <div className="approval-v6__row-actions">
          <button type="button" onClick={() => onView(task)} aria-label={`查看 ${task.subOrderNo}`}>查看</button>
          <button type="button" onClick={() => onOpenAction({ task, type: 'approve' })}>通过</button>
          <button type="button" className="danger" onClick={() => onOpenAction({ task, type: 'reject' })}>拒绝</button>
        </div>
      </td>
    </tr>
  );
}

function PendingTaskDrawer({ task, onClose, onOpenAction }: { task: PendingTask; onClose: () => void; onOpenAction: (action: ActionDialog) => void }) {
  const ticketType = task.ticketType ?? '权限申请';

  return (
    <div className="approval-v6__drawer-mask" onClick={onClose}>
      <aside className="approval-v6__drawer approval-v6__drawer--approval-detail" aria-label="待审批详情" onClick={event => event.stopPropagation()}>
        <header>
          <h2>待审批详情</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="approval-v6__instance-detail">
          <PendingDetailMeta task={task} ticketType={ticketType} />
          <PendingApplicantSummary task={task} />

          {ticketType === '血缘修正' ? (
            <PendingLineageDetail task={task} />
          ) : (
            <PendingTypedDetail task={task} ticketType={ticketType} />
          )}

          <h3>审批操作</h3>
          <div className="approval-v6__drawer-actions approval-v6__drawer-actions--sticky">
            <Button variant="primary" onClick={() => onOpenAction({ task, type: 'approve' })}>通过</Button>
            <Button variant="danger" onClick={() => onOpenAction({ task, type: 'reject' })}>拒绝</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function detailSectionTitle(ticketType: string) {
  if (ticketType === '上架审批') return '上架审批判断';
  if (ticketType === '下架审批') return '下架审批判断';
  if (ticketType === '目录修改') return '资源目录修改判断';
  if (ticketType === '目录编辑审批') return '目录编辑审批判断';
  if (ticketType === '负责人交接') return '负责人交接判断';
  if (ticketType === '血缘修正') return '血缘变更详情';
  return '权限申请判断';
}

function PendingDetailMeta({ task, ticketType }: { task: PendingTask; ticketType: string }) {
  return (
    <div className="approval-v6__detail-meta" aria-label="审批元信息">
      <Tag tone="warning">{ticketType}</Tag>
      <Tag tone={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? 'danger' : 'blue'}>{task.securityLevel}</Tag>
      <span><strong>{task.subOrderNo}</strong></span>
      <span>{task.nodeName}</span>
      <span>{task.createdAt}</span>
      <code title={`实例号：${task.instanceCode}`}>{task.instanceCode}</code>
    </div>
  );
}

function PendingApplicantSummary({ task }: { task: PendingTask }) {
  return (
    <section className="approval-v6__applicant-summary" aria-label="申请摘要">
      <div><span>申请人</span><strong>{task.applicant}</strong><em>{task.applicantDept}</em></div>
      <div><span>命中流程</span><strong>{task.matchedFlow}</strong><em>{task.matchedRoute}</em></div>
      <div className="wide"><span>申请理由</span><strong>{task.reason}</strong></div>
    </section>
  );
}

function TypeDetailGrid({ children }: { children: ReactNode }) {
  return <div className="approval-v6__type-grid">{children}</div>;
}

function DetailItem({ label, value, tone }: { label: string; value: ReactNode; tone?: 'risk' | 'success' }) {
  return (
    <div className={tone ? `approval-v6__detail-item approval-v6__detail-item--${tone}` : 'approval-v6__detail-item'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailLinkItem({ label = '操作', text = '查看详情' }: { label?: string; text?: string }) {
  return <DetailItem label={label} value={<button type="button" className="approval-v6__inline-action">{text}</button>} />;
}

function mockOriginalCatalog(task: PendingTask) {
  if (task.ticketType === '目录修改' && task.reason.includes('迁移至')) {
    const match = task.reason.match(/从[“"]?(.+?)[”"]?迁移至/);
    return match?.[1] ?? 'mock 原目录 / 待迁移';
  }
  return 'mock 原目录 / 待迁移';
}

function directoryEditAction(task: PendingTask) {
  if (task.reason.includes('新增')) return '新增目录';
  if (task.reason.includes('改名') || task.reason.includes('重命名')) return '改名目录';
  if (task.reason.includes('删除')) return '删除目录';
  return '移动目录';
}

function PendingTypedDetail({ task, ticketType }: { task: PendingTask; ticketType: string }) {
  if (ticketType === '权限申请') {
    return (
      <section className="approval-v6__type-detail">
        <h3>{detailSectionTitle(ticketType)}</h3>
        <TypeDetailGrid>
          <DetailItem label="申请资产" value={assetSummary(task)} />
          <DetailItem label="权限类型" value={task.permissionType} />
          <DetailItem label="安全等级" value={<Tag tone={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? 'danger' : 'blue'}>{task.securityLevel}</Tag>} tone={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? 'risk' : undefined} />
          <DetailItem label="目录" value={task.directory} />
          <DetailItem label="来源系统" value={`${sourceTypeLabel(task.sourceType)} / ${task.sourceSystem}`} />
          <DetailItem label="判断重点" value={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? '高安全等级权限申请，重点核验申请用途和最小授权范围' : '核验申请用途与资产范围是否匹配'} />
        </TypeDetailGrid>
      </section>
    );
  }

  if (ticketType === '上架审批') {
    return (
      <section className="approval-v6__type-detail">
        <h3>{detailSectionTitle(ticketType)}</h3>
        <TypeDetailGrid>
          <DetailItem label="上架对象" value={assetSummary(task)} />
          <DetailItem label="目录" value={task.directory} />
          <DetailItem label="负责人" value={task.applicant} />
          <DetailItem label="元数据完整性" value="已完成基础信息、字段说明、质量规则校验" tone="success" />
          <DetailItem label="来源" value={`${sourceTypeLabel(task.sourceType)} / ${task.sourceSystem}`} />
          <DetailLinkItem />
        </TypeDetailGrid>
      </section>
    );
  }

  if (ticketType === '下架审批') {
    return (
      <section className="approval-v6__type-detail">
        <h3>{detailSectionTitle(ticketType)}</h3>
        <TypeDetailGrid>
          <DetailItem label="下架对象" value={assetSummary(task)} />
          <DetailItem label="下架原因" value={task.reason} />
          <DetailItem label="影响范围" value={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? '高安全等级资产，需重点核验引用方' : '影响当前目录可见与检索'} tone="risk" />
          <DetailItem label="下游依赖" value="mock 依赖：2 个应用、1 个报表" />
          <DetailItem label="目录" value={task.directory} />
          <DetailLinkItem />
        </TypeDetailGrid>
      </section>
    );
  }

  if (ticketType === '目录修改') {
    return (
      <section className="approval-v6__type-detail">
        <h3>{detailSectionTitle(ticketType)}</h3>
        <TypeDetailGrid>
          <DetailItem label="资产或资源" value={assetSummary(task)} />
          <DetailItem label="原目录" value={mockOriginalCatalog(task)} />
          <DetailItem label="目标目录" value={task.directory} />
          <DetailItem label="变更原因" value={task.reason} />
          <DetailItem label="变更类型" value="资源目录修改" />
          <DetailItem label="判断重点" value="核验目标目录归属和目录负责人是否匹配" />
        </TypeDetailGrid>
      </section>
    );
  }

  if (ticketType === '目录编辑审批') {
    return (
      <section className="approval-v6__type-detail">
        <h3>{detailSectionTitle(ticketType)}</h3>
        <TypeDetailGrid>
          <DetailItem label="编辑动作" value={directoryEditAction(task)} />
          <DetailItem label="旧目录结构" value="mock 旧目录结构 / 待确认" />
          <DetailItem label="新目录结构" value={task.directory} />
          <DetailItem label="影响子目录数量" value="mock 影响 3 个子目录" />
          <DetailItem label="影响资源数量" value={`mock 影响 ${Math.max(1, task.assets.length)} 个资源`} />
          <DetailLinkItem />
        </TypeDetailGrid>
      </section>
    );
  }

  if (ticketType === '负责人交接') {
    return (
      <section className="approval-v6__type-detail">
        <h3>{detailSectionTitle(ticketType)}</h3>
        <TypeDetailGrid>
          <DetailItem label="原负责人" value={task.applicant} />
          <DetailItem label="新负责人" value="mock 接收人" />
          <DetailItem label="交接范围" value={assetSummary(task)} />
          <DetailItem label="接收确认" value={task.nodeName.includes('接收') ? '等待接收人确认' : '需审批节点确认'} />
          <DetailItem label="目录" value={task.directory} />
          <DetailItem label="交接说明" value={task.reason} />
        </TypeDetailGrid>
      </section>
    );
  }

  return (
    <section className="approval-v6__type-detail">
      <h3>{detailSectionTitle(ticketType)}</h3>
      <TypeDetailGrid>
        <DetailItem label="审批对象" value={assetSummary(task)} />
        <DetailItem label="目录" value={task.directory} />
        <DetailItem label="来源" value={`${sourceTypeLabel(task.sourceType)} / ${task.sourceSystem}`} />
        <DetailItem label="申请说明" value={task.reason} />
      </TypeDetailGrid>
    </section>
  );
}

function nodeUnitLabel(nodeId: string, nodeName: string) {
  const value = `${nodeId} ${nodeName}`.toLowerCase();
  if (value.includes('api') || value.includes('kafka') || value.includes('topic')) return '参数';
  if (value.includes('metric')) return '指标';
  if (value.includes('label')) return '标签';
  if (value.includes('report') || value.includes('rpt')) return '报表口径';
  return '字段';
}

function endpointLabel(task: PendingTask, nodeId: string, nodeName: string, value: string | undefined) {
  if (!value) return '';
  const side = nodeId === task.lineageApproval?.objectId ? '当前节点' : '目标节点';
  return `${side}${nodeUnitLabel(nodeId, nodeName)}：${value}`;
}

function lineageModeText(task: PendingTask) {
  if (task.lineageApproval?.correctionMode === 'initialize') return '初始化血缘';
  const hasAdd = task.lineageApproval?.changes.some(change => change.action === 'add');
  const hasDelete = task.lineageApproval?.changes.some(change => change.action === 'delete');
  if (hasAdd && hasDelete) return '手工新增/删除';
  if (hasAdd) return '手工新增';
  if (hasDelete) return '手工删除';
  return '手工修正';
}

function PendingLineageDetail({ task }: { task: PendingTask }) {
  const approval = task.lineageApproval;
  const changes = approval?.changes ?? [];
  const relationChanges = changes.filter(change => change.kind === 'relation');
  const fieldChanges = changes.filter(change => change.kind === 'field');
  const addCount = approval?.initStats?.add ?? relationChanges.filter(change => change.action === 'add').length;
  const deleteCount = approval?.initStats?.delete ?? relationChanges.filter(change => change.action === 'delete').length;
  const effectMode = approval?.effectMode === 'full_rebuild' ? '全量重建' : '增量修正';

  return (
    <section className="approval-v6__type-detail">
      <h3>血缘变更详情</h3>
      <div className="approval-v6__summary approval-v6__summary--typed">
        <div><span>修正方式</span><strong>{lineageModeText(task)}</strong></div>
        <div><span>生效方式</span><strong>{effectMode}</strong></div>
        <div><span>新增数量</span><strong>{addCount}</strong></div>
        <div><span>删除数量</span><strong>{deleteCount}</strong></div>
        <div><span>端点关系</span><strong>{fieldChanges.length}</strong></div>
        <div><span>当前节点</span><strong>{approval?.objectDisplay ?? task.assets[0] ?? '暂无对象'}</strong></div>
      </div>
      {approval?.effectMode === 'full_rebuild' ? (
        <div className="approval-v6__risk-note">初始化血缘：审批通过后将覆盖当前资产已有血缘。</div>
      ) : (
        <div className="approval-v6__risk-note">手工新增/删除：审批通过后仅生效本次提交变更。</div>
      )}
      <h3>本次提交变更数据</h3>
      <div className="approval-v6__change-list">
        {changes.length ? changes.map(change => (
          <article key={change.id} className="approval-v6__change-card">
            <header>
              <Tag tone={change.action === 'add' ? 'success' : 'danger'}>{change.action === 'add' ? '新增' : '删除'}</Tag>
              <strong>{change.sourceName} → {change.targetName}</strong>
              <span>{change.direction === 'upstream' ? '目标节点到当前节点' : '当前节点到目标节点'}</span>
            </header>
            {change.kind === 'field' ? (
              <div className="approval-v6__endpoint-config">
                <span>{endpointLabel(task, change.targetId, change.targetName, change.targetField)}</span>
                <span>{endpointLabel(task, change.sourceId, change.sourceName, change.sourceField)}</span>
              </div>
            ) : (
              <div className="approval-v6__endpoint-config"><span>关系级变更</span></div>
            )}
            <p>{change.reason || '暂无修正说明'}</p>
          </article>
        )) : <div className="approval-v6__empty-row">暂无提交变更数据</div>}
      </div>
    </section>
  );
}

interface ApprovalActionModalProps {
  action: Exclude<ActionDialog, null>;
  onClose: () => void;
  onSubmit: (target: PendingTask | PendingTask[], type: ApprovalActionType, comment: string) => void;
}

export function ApprovalActionModal({ action, onClose, onSubmit }: ApprovalActionModalProps) {
  const [comment, setComment] = useState('');
  const isBatch = action.mode === 'batch';
  const actionTypeLabel = action.type === 'approve' ? '通过' : '拒绝';
  const title = isBatch ? `确认批量审批${actionTypeLabel}` : action.type === 'approve' ? '确认审批通过' : '确认审批拒绝';
  const tasks = isBatch ? action.tasks : [action.task];

  return (
    <Modal open title={title} onClose={onClose}>
      <div className="approval-v6__form">
        <div className="approval-v6__summary">
          {isBatch ? <div className="wide"><span>批量范围</span><strong>将批量处理 {tasks.length} 条待审批任务</strong></div> : null}
          <div>
            <span>申请人</span>
            <strong>{isBatch ? tasks.map(task => task.applicant).join('、') : action.task.applicant}</strong>
          </div>
          <div>
            <span>申请资产</span>
            <strong>{isBatch ? tasks.map(task => assetSummary(task)).join('；') : action.task.assets.join('、')}</strong>
          </div>
          <div>
            <span>安全等级</span>
            <strong>{isBatch ? Array.from(new Set(tasks.map(task => task.securityLevel))).join('、') : action.task.securityLevel}</strong>
          </div>
          <div>
            <span>当前节点</span>
            <strong>{isBatch ? Array.from(new Set(tasks.map(task => task.nodeName))).join('、') : action.task.nodeName}</strong>
          </div>
        </div>

        <label>
          审批意见{action.type === 'reject' ? ' *' : ''}
          <textarea
            value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder={
              action.type === 'approve'
                ? '可选，填写审批意见'
                : '必填，请说明拒绝原因'
            }
          />
        </label>

        <div className="approval-v6__modal-actions">
          <Button onClick={onClose}>取消</Button>
          <Button
            variant={action.type === 'approve' ? 'primary' : 'danger'}
            onClick={() => isBatch ? onSubmit(action.tasks, action.type, comment) : onSubmit(action.task, action.type, comment)}
          >
            {action.type === 'approve' ? '确认通过' : '确认拒绝'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
