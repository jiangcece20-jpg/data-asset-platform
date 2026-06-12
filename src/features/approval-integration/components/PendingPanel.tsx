import { useEffect, useMemo, useState } from 'react';
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
          <div className="approval-v6__instance-header">
            <Tag tone="warning">{ticketType}</Tag>
            <Tag tone={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? 'danger' : 'blue'}>{task.securityLevel}</Tag>
            <code>{task.instanceCode}</code>
          </div>
          <div className="approval-v6__summary">
            <div><span>申请人</span><strong>{task.applicant}</strong></div>
            <div><span>所属部门</span><strong>{task.applicantDept}</strong></div>
            <div><span>当前节点</span><strong>{task.nodeName}</strong></div>
            <div><span>等待时长</span><strong>{task.waitingHours}h</strong></div>
          </div>

          <h3>申请信息</h3>
          <PendingInfoTable task={task} ticketType={ticketType} />

          <h3>申请资产明细</h3>
          <PendingAssetsTable task={task} ticketType={ticketType} />

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

function supportsPermissionType(ticketType: string) {
  return ticketType !== '目录修改' && ticketType !== '血缘修正' && ticketType !== '下架审批';
}

function PendingInfoTable({ task, ticketType }: { task: PendingTask; ticketType: string }) {
  const permissionType = supportsPermissionType(ticketType) ? task.permissionType : '—';
  const rows = [
    ['工单号', task.subOrderNo, '实例号', task.instanceCode],
    ['申请人', task.applicant, '所属部门', task.applicantDept],
    ['当前节点', task.nodeName, '等待时长', `${task.waitingHours}h`],
    ['目录路径', task.directory, '来源', `${sourceTypeLabel(task.sourceType)} / ${task.sourceSystem}`],
    ['命中流程', task.matchedFlow, '命中规则', task.matchedRoute],
    ['创建时间', task.createdAt, '权限类型', permissionType],
  ];

  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-info-table" aria-label="申请信息表">
        <tbody>
          {rows.map(row => (
            <tr key={row[0]}>
              <th scope="row">{row[0]}</th>
              <td>{row[1]}</td>
              <th scope="row">{row[2]}</th>
              <td>{row[3]}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">申请理由</th>
            <td colSpan={3} className="approval-v6__reason-cell">{task.reason}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PendingAssetsTable({ task, ticketType }: { task: PendingTask; ticketType: string }) {
  const permissionType = supportsPermissionType(ticketType) ? task.permissionType : '—';

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
          {task.assets.map(asset => (
            <tr key={asset}>
              <td><strong>{asset}</strong><span className="approval-v6__asset-subtext">{task.directory}</span></td>
              <td>{sourceTypeLabel(task.sourceType)}</td>
              <td>{task.sourceSystem}</td>
              <td>{task.directory}</td>
              <td><Tag tone={task.securityLevel === 'S4' || task.securityLevel === 'S5' ? 'danger' : 'blue'}>{task.securityLevel}</Tag></td>
              <td>{permissionType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
