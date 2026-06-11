import { useState } from 'react';
import { Button } from '../../components/base/Button';
import { Modal } from '../../components/feedback/Modal';
import { toast } from '../../components/feedback/Toast';
import type { CatalogNode } from './ResourceManagementPage';
import './resource-management.css';

/* ─── Types ─────────────────────────────── */

export type ActiveAction = {
  resourceId: string;
  action: string;
} | null;

import type { ManagedResource } from './ResourceManagementPage';

const PEOPLE = ['张三', '李四', '王五', '赵六', '孙七'];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ─── Confirm Dialog ─────────────────────── */

function ConfirmDialog({ title, message, requireReason, onConfirm, onClose }: {
  title: string;
  message: string;
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal open title={title} onClose={onClose}>
      <div className="resource-management__dialog-form">
        <p className="resource-management__confirm-message">{message}</p>
        {requireReason ? (
          <div className="resource-management__dialog-field">
            <label>下架原因</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入下架原因…" rows={3} />
          </div>
        ) : null}
        <div className="resource-management__dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onConfirm(reason || undefined)}>确认</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Edit Resource Dialog ───────────────── */

function EditResourceDialog({ resource, onConfirm, onClose }: {
  resource: ManagedResource;
  onConfirm: (patch: Partial<ManagedResource>) => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(resource.displayName ?? '');
  const [summary, setSummary] = useState(resource.summary);
  const [techOwner, setTechOwner] = useState(resource.techOwner);
  const [bizOwner, setBizOwner] = useState(resource.bizOwner ?? '');
  return (
    <Modal open title="编辑资源" onClose={onClose}>
      <div className="resource-management__dialog-form">
        <div className="resource-management__dialog-field">
          <label>资源英文名</label>
          <input type="text" value={resource.name} readOnly className="readonly" />
        </div>
        <div className="resource-management__dialog-field">
          <label>资源中文名</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="输入业务可读名称" />
        </div>
        <div className="resource-management__dialog-field">
          <label>摘要描述</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
        </div>
        <div className="resource-management__dialog-field">
          <label>技术负责人</label>
          <select value={techOwner} onChange={(e) => setTechOwner(e.target.value)}>
            {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-field">
          <label>业务负责人</label>
          <select value={bizOwner} onChange={(e) => setBizOwner(e.target.value)}>
            <option value="">未指定</option>
            {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onConfirm({ displayName: displayName || undefined, summary, techOwner, bizOwner: bizOwner || undefined, updated: today() })}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Catalog Select Dialog ──────────────── */

export function CatalogTreeRadio({ nodes, depth, selectedId, onSelect }: { nodes: CatalogNode[]; depth: number; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <label className="resource-management__catalog-radio-item" style={{ paddingLeft: 8 + depth * 16 }}>
            <input type="radio" name="catalog" checked={selectedId === node.id} onChange={() => onSelect(node.id)} />
            <span>{node.name}</span>
          </label>
          {node.children.length > 0 ? <CatalogTreeRadio nodes={node.children} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} /> : null}
        </div>
      ))}
    </>
  );
}

export function CatalogSelectDialog({ resource, catalogTree, onConfirm, onClose }: {
  resource: ManagedResource;
  catalogTree: CatalogNode[];
  onConfirm: (catalogId: string, catalogPath: string) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const path = selectedId ? getCatalogPathSimple(catalogTree, selectedId) : null;
  return (
    <Modal open title={resource.status === 'published' ? '修改目录' : '选择目录'} onClose={onClose}>
      <div className="resource-management__dialog-form">
        <div className="resource-management__catalog-dialog-tree">
          <CatalogTreeRadio nodes={catalogTree} depth={0} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        {path ? <div className="resource-management__catalog-dialog-path">已选择：{path.join(' / ')}</div> : null}
        <div className="resource-management__dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={!selectedId} onClick={() => { if (selectedId && path) onConfirm(selectedId, path.join('/')); }}>确认</Button>
        </div>
      </div>
    </Modal>
  );
}

export function getCatalogPathSimple(nodes: CatalogNode[], id: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const next = [...path, node.name];
    if (node.id === id) return next;
    const found = getCatalogPathSimple(node.children, id, next);
    if (found) return found;
  }
  return null;
}

/* ─── Tag Edit Dialog ────────────────────── */

function TagEditDialog({ resource, onConfirm, onClose }: {
  resource: ManagedResource;
  onConfirm: (tags: string[]) => void;
  onClose: () => void;
}) {
  const [tags, setTags] = useState<string[]>([...resource.tags]);
  const [input, setInput] = useState('');
  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setInput('');
    }
  };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));
  return (
    <Modal open title="编辑标签" onClose={onClose}>
      <div className="resource-management__dialog-form">
        <div className="resource-management__tag-editor-list">
          {tags.map((tag) => (
            <span key={tag} className="resource-management__tag-editor-chip">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>×</button>
            </span>
          ))}
        </div>
        <div className="resource-management__tag-editor-input-row">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入新标签" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
          <Button size="sm" onClick={addTag}>添加</Button>
        </div>
        <div className="resource-management__dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onConfirm(tags)}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Transfer Owner Dialog ──────────────── */

export function TransferOwnerDialog({ resource, onConfirm, onClose }: {
  resource: ManagedResource;
  onConfirm: (techOwner: string, bizOwner: string) => void;
  onClose: () => void;
}) {
  const [techOwner, setTechOwner] = useState(resource.techOwner);
  const [bizOwner, setBizOwner] = useState(resource.bizOwner ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ownerChanged = techOwner !== resource.techOwner || bizOwner !== (resource.bizOwner ?? '');
  const needsApproval = resource.status === 'published' || resource.status === 'maintain' || resource.status === 'no-list';

  const handleFinalConfirm = () => {
    onConfirm(techOwner, bizOwner);
    setConfirmOpen(false);
  };

  return (
    <>
      <Modal open={!confirmOpen} title="交接负责人" onClose={onClose}>
        <div className="resource-management__dialog-form">
          <div className="resource-management__dialog-field">
            <label>技术负责人</label>
            <select value={techOwner} onChange={(e) => setTechOwner(e.target.value)}>
              {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="resource-management__dialog-field">
            <label>业务负责人</label>
            <select value={bizOwner} onChange={(e) => setBizOwner(e.target.value)}>
              <option value="">未指定</option>
              {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="resource-management__dialog-footer">
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" disabled={!ownerChanged} onClick={() => setConfirmOpen(true)}>下一步</Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmOpen} title="确认交接申请" onClose={() => setConfirmOpen(false)}>
        <div className="resource-management__dialog-form">
          <p className="resource-management__confirm-message">
            确定提交负责人交接申请？
          </p>
          <dl className="resource-management__approval-status-list" style={{ marginTop: 12 }}>
            <dt>资源名称</dt><dd>{resource.name}</dd>
            <dt>技术负责人</dt><dd>{resource.techOwner} → {techOwner}</dd>
            <dt>业务负责人</dt><dd>{(resource.bizOwner ?? '未指定')} → {(bizOwner || '未指定')}</dd>
            <dt>申请结果</dt><dd style={{ color: needsApproval ? '#d97706' : '#16a34a' }}>
              {needsApproval ? '需审批，接收人确认后生效' : '直接生效'}
            </dd>
          </dl>
          <div className="resource-management__dialog-footer">
            <Button onClick={() => setConfirmOpen(false)}>上一步</Button>
            <Button variant="primary" onClick={handleFinalConfirm}>确认提交</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ─── Approval Status Dialog ─────────────── */

function ApprovalStatusDialog({ resource, onClose }: { resource: ManagedResource; onClose: () => void }) {
  let approvalType = '';
  if (resource.status === 'reviewing') approvalType = '上架申请';
  else if (resource.status === 'unlisting') approvalType = '下架申请';
  else if (resource.status === 'catalog_reviewing') approvalType = '目录修改申请';
  return (
    <Modal open title="审批状态" onClose={onClose}>
      <div className="resource-management__dialog-form">
        <dl className="resource-management__approval-status-list">
          <dt>审批类型</dt>
          <dd>{approvalType}</dd>
          <dt>资源名称</dt>
          <dd>{resource.name}</dd>
          <dt>提交时间</dt>
          <dd>{resource.updated}</dd>
          <dt>当前审批人</dt>
          <dd>管理员-王敏</dd>
          <dt>审批状态</dt>
          <dd>审批中</dd>
          {resource.pendingCatalog ? (
            <>
              <dt>目标目录</dt>
              <dd>{resource.pendingCatalog}</dd>
            </>
          ) : null}
        </dl>
        <div className="resource-management__dialog-footer">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Metric Edit Dialog (FR-MGT-17) ─────────── */

const METRIC_LEVELS = ['1级', '2级', '3级'] as const;
const SECURITY_LEVELS = ['公开级', '内部级', '秘密级', '绝密级'] as const;
const FRESHNESS_OPTIONS = ['实时', '离线'] as const;

function MetricEditDialog({ resource, catalogTree, onConfirm, onClose }: {
  resource: ManagedResource;
  catalogTree: CatalogNode[];
  onConfirm: (patch: Partial<ManagedResource>) => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(resource.displayName ?? '');
  const [summary, setSummary] = useState(resource.summary);
  const [metricLevel, setMetricLevel] = useState(resource.metricLevel ?? '1级');
  const [securityLevel, setSecurityLevel] = useState(resource.securityLevel ?? '秘密级');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([...resource.tags]);
  const [tagInput, setTagInput] = useState('');
  const [techOwner, setTechOwner] = useState(resource.techOwner);
  const [bizOwner, setBizOwner] = useState(resource.bizOwner ?? '');
  const [freshness, setFreshness] = useState(resource.freshness ?? '离线');
  const [expression, setExpression] = useState(resource.expression ?? '');
  const [specification, setSpecification] = useState(resource.specification ?? '');
  const [usageMd, setUsageMd] = useState(resource.usageMd ?? '');

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setTagInput('');
    }
  };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const catalogPath = selectedCatalogId ? getCatalogPathSimple(catalogTree, selectedCatalogId) : null;

  return (
    <Modal open title="编辑指标资源" onClose={onClose}>
      <div className="resource-management__dialog-form">
        <div className="resource-management__dialog-field">
          <label>指标英文名</label>
          <input type="text" value={resource.name} readOnly className="readonly" />
        </div>
        <div className="resource-management__dialog-field">
          <label>资源中文名</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="输入业务可读名称" />
        </div>
        <div className="resource-management__dialog-field">
          <label>描述</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
        </div>
        <div className="resource-management__dialog-field">
          <label>指标等级</label>
          <select value={metricLevel} onChange={(e) => setMetricLevel(e.target.value)}>
            {METRIC_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-field">
          <label>安全等级</label>
          <select value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value)}>
            {SECURITY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-field">
          <label>指标目录</label>
          <div className="resource-management__catalog-dialog-tree" style={{ maxHeight: 160 }}>
            <CatalogTreeRadio nodes={catalogTree} depth={0} selectedId={selectedCatalogId} onSelect={setSelectedCatalogId} />
          </div>
          {catalogPath ? <div className="resource-management__catalog-dialog-path">已选择：{catalogPath.join(' / ')}</div> : null}
        </div>
        <div className="resource-management__dialog-field">
          <label>标签</label>
          <div className="resource-management__tag-editor-list">
            {tags.map((tag) => (
              <span key={tag} className="resource-management__tag-editor-chip">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
          </div>
          <div className="resource-management__tag-editor-input-row">
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="输入新标签" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
            <Button size="sm" onClick={addTag}>添加</Button>
          </div>
        </div>
        <div className="resource-management__dialog-field">
          <label>技术负责人</label>
          <select value={techOwner} onChange={(e) => setTechOwner(e.target.value)}>
            {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-field">
          <label>业务负责人</label>
          <select value={bizOwner} onChange={(e) => setBizOwner(e.target.value)}>
            <option value="">未指定</option>
            {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-field">
          <label>指标时效性</label>
          <select value={freshness} disabled className="readonly">
            {FRESHNESS_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="resource-management__dialog-field">
          <label>表达式</label>
          <textarea value={expression} onChange={(e) => setExpression(e.target.value)} rows={2} placeholder="输入指标计算表达式" />
        </div>
        <div className="resource-management__dialog-field">
          <label>口径说明</label>
          <textarea value={specification} onChange={(e) => setSpecification(e.target.value)} rows={2} placeholder="输入指标口径定义" />
        </div>
        <div className="resource-management__dialog-field">
          <label>使用说明（Markdown）</label>
          <div className="resource-management__markdown-editor">
            <textarea value={usageMd} onChange={(e) => setUsageMd(e.target.value)} rows={4} placeholder="支持 Markdown 语法" />
            {usageMd ? (
              <div className="resource-management__markdown-preview">
                <div className="resource-management__markdown-preview-label">预览</div>
                <div className="resource-management__markdown-preview-content">{usageMd}</div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="resource-management__dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => {
            const patch: Partial<ManagedResource> = {
              displayName: displayName || undefined,
              summary,
              tags,
              techOwner,
              bizOwner: bizOwner || undefined,
              expression,
              specification,
              usageMd,
              updated: today(),
            };
            if (metricLevel !== resource.metricLevel) patch.metricLevel = metricLevel;
            if (securityLevel !== resource.securityLevel) patch.securityLevel = securityLevel;
            if (catalogPath) patch.catalog = catalogPath.join('/');
            onConfirm(patch);
          }}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Action Dialog Router ───────────────── */

export function ActionDialogRouter({ activeAction, resources, catalogTree, onUpdateResource, onAddLog, onClose }: {
  activeAction: ActiveAction;
  resources: ManagedResource[];
  catalogTree: CatalogNode[];
  onUpdateResource: (id: string, patch: Partial<ManagedResource>) => void;
  onAddLog: (entry: { action: string; resource: string; result: string; detail: string }) => void;
  onClose: () => void;
}) {
  if (!activeAction) return null;
  const resource = resources.find((r) => r.id === activeAction.resourceId);
  if (!resource) return null;
  const action = activeAction.action;

  /* ── Direct transitions (no dialog) ── */
  if (action === '撤回上架申请') return null;
  if (action === '撤回下架申请') return null;

  /* ── Confirm dialogs ── */
  if (action === '提交上架') {
    return (
      <ConfirmDialog
        title="确认提交上架"
        message={`确定将「${resource.name}」提交上架申请？提交后将进入审批流程。`}
        onConfirm={() => {
          onUpdateResource(resource.id, { status: 'reviewing', updated: today() });
          onAddLog({ action: '提交上架', resource: resource.name, result: '待审核', detail: '状态：待维护 → 上架审批中' });
          toast.success('已提交上架申请');
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '不上架') {
    return (
      <ConfirmDialog
        title="确认不上架"
        message={`确定将「${resource.name}」标记为不上架？该资源将不会出现在资产目录中。`}
        onConfirm={() => {
          onUpdateResource(resource.id, { status: 'no-list', updated: today() });
          onAddLog({ action: '标记不上架', resource: resource.name, result: '保留资源态', detail: '状态：待维护 → 不上架' });
          toast.success('已标记为不上架');
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '申请下架') {
    return (
      <ConfirmDialog
        title="确认申请下架"
        message={`确定将「${resource.name}」申请下架？提交后将进入审批流程。`}
        requireReason
        onConfirm={(reason) => {
          onUpdateResource(resource.id, { status: 'unlisting', updated: today() });
          onAddLog({ action: '申请下架', resource: resource.name, result: '待审核', detail: reason ? `原因：${reason}` : '状态：已上架 → 下架审批中' });
          toast.success('已提交下架申请');
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '转待维护') {
    return (
      <ConfirmDialog
        title="确认转待维护"
        message={`确定将「${resource.name}」转为待维护状态？`}
        onConfirm={() => {
          onUpdateResource(resource.id, { status: 'maintain', updated: today() });
          onAddLog({ action: '转待维护', resource: resource.name, result: '已恢复为待维护', detail: '状态：不上架 → 待维护' });
          toast.success('已转为待维护');
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  /* ── Form dialogs ── */
  if (action === '编辑') {
    if (resource.type === 'metric') {
      return (
        <MetricEditDialog
          resource={resource}
          catalogTree={catalogTree}
          onConfirm={(patch) => {
            onUpdateResource(resource.id, patch);
            onAddLog({ action: '编辑指标', resource: resource.name, result: '修改指标信息', detail: '修改指标配置/负责人' });
            toast.success('指标信息已更新');
            onClose();
          }}
          onClose={onClose}
        />
      );
    }
    return (
      <EditResourceDialog
        resource={resource}
        onConfirm={(patch) => {
          onUpdateResource(resource.id, patch);
          onAddLog({ action: '编辑', resource: resource.name, result: '修改资源信息', detail: '修改资源描述/负责人' });
          toast.success('资源信息已更新');
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '目录' || action === '修改目录') {
    return (
      <CatalogSelectDialog
        resource={resource}
        catalogTree={catalogTree}
        onConfirm={(_catalogId, catalogPath) => {
          if (resource.status === 'published') {
            onUpdateResource(resource.id, { pendingCatalog: catalogPath, status: 'catalog_reviewing', updated: today() });
            onAddLog({ action: '修改目录', resource: resource.name, result: '待审批', detail: `申请迁移至「${catalogPath}」` });
            toast.success('已提交目录修改申请');
          } else {
            const oldCatalog = resource.catalog ?? '未归属';
            onUpdateResource(resource.id, { catalog: catalogPath, updated: today() });
            onAddLog({ action: '修改目录', resource: resource.name, result: '已生效', detail: `从「${oldCatalog}」迁移至「${catalogPath}」` });
            toast.success('目录已更新');
          }
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '标签') {
    return (
      <TagEditDialog
        resource={resource}
        onConfirm={(newTags) => {
          onUpdateResource(resource.id, { tags: newTags, updated: today() });
          onAddLog({ action: '打标签', resource: resource.name, result: '标签已更新', detail: `标签：${newTags.join('、')}` });
          toast.success('标签已更新');
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '交接') {
    return (
      <TransferOwnerDialog
        resource={resource}
        onConfirm={(newTech, newBiz) => {
          const needsApproval = resource.status === 'published' || resource.status === 'maintain' || resource.status === 'no-list';
          if (needsApproval) {
            onUpdateResource(resource.id, { pendingHandover: { techOwner: newTech, bizOwner: newBiz || undefined }, status: 'handover_reviewing', updated: today() });
            onAddLog({ action: '交接负责人', resource: resource.name, result: '待审批', detail: `申请交接至 ${newTech}` });
            toast.success('已提交负责人交接申请');
          } else {
            onUpdateResource(resource.id, { techOwner: newTech, bizOwner: newBiz || undefined, updated: today() });
            onAddLog({ action: '交接负责人', resource: resource.name, result: '已交接', detail: `技术负责人：${resource.techOwner}→${newTech}` });
            toast.success('负责人已交接');
          }
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (action === '查看审批状态') {
    return <ApprovalStatusDialog resource={resource} onClose={onClose} />;
  }

  return null;
}

/* ── Handle direct actions (withdrawals) ── */

export function handleDirectAction(action: string, resource: ManagedResource, onUpdateResource: (id: string, patch: Partial<ManagedResource>) => void, onAddLog: (entry: { action: string; resource: string; result: string; detail: string }) => void) {
  if (action === '撤回上架申请') {
    onUpdateResource(resource.id, { status: 'maintain', updated: today() });
    onAddLog({ action: '撤回上架申请', resource: resource.name, result: '已恢复为待维护', detail: '状态：上架审批中 → 待维护' });
    toast.success('已撤回上架申请');
  } else if (action === '撤回下架申请') {
    onUpdateResource(resource.id, { status: 'published', updated: today() });
    onAddLog({ action: '撤回下架申请', resource: resource.name, result: '已恢复为已上架', detail: '状态：下架审批中 → 已上架' });
    toast.success('已撤回下架申请');
  }
}

export function isDirectAction(action: string) {
  return action === '撤回上架申请' || action === '撤回下架申请';
}
