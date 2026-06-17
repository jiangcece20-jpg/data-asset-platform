import type { ResourceType } from '../../types/resources';

export const PERMISSION_CART_STORAGE_KEY = 'dap.permissionCart.v1';

type PermissionStatus = 'granted' | 'none' | 'pending' | 'unknown' | 'applying' | string;

export type PermissionRecord = {
  id: string;
  name: string;
  type: ResourceType | string;
  displayName?: string;
  display?: string;
  sourceSystem?: string;
  source_system?: string;
  sourceType?: string;
  source_type?: string;
  permissionStatus?: PermissionStatus;
  permission_status?: PermissionStatus;
  owner?: string;
  businessOwner?: string;
  tech_owner?: string;
  biz_owner?: string;
  catalogPath?: string;
  catalog?: string | null;
  databaseName?: string;
};

export type PermissionActionState = 'granted' | 'pending' | 'applyable' | 'blocked';

export type PermissionAction = {
  state: PermissionActionState;
  label: string;
  disabled: boolean;
  reason: string;
  targetHash?: string;
};

export type PermissionCartItem = {
  id: string;
  name: string;
  display: string;
  type: ResourceType | string;
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

type AddCartResult = {
  status: 'added' | 'exists' | 'blocked';
  item?: PermissionCartItem;
  reason?: string;
};

const applyableTypes = new Set(['table', 'view', 'api', 'report', 'label']);
const listeners = new Set<(items: PermissionCartItem[]) => void>();
let memoryCart: PermissionCartItem[] = [];

export function getPermissionAction(record?: PermissionRecord | null): PermissionAction {
  if (!record) {
    return blockedAction('当前对象信息缺失，暂不支持申请。');
  }

  const sourceType = normalizeText(record.sourceType ?? record.source_type);
  const sourceSystem = normalizeText(record.sourceSystem ?? record.source_system);

  if (sourceType === 'business_db' || sourceType === 'biz_database' || sourceSystem === 'mysql') {
    return blockedAction('该对象权限不由本平台管理，请查看来源或血缘关系，前往来源平台或对应数仓表申请。');
  }

  if (record.type === 'metric') {
    return blockedAction('指标权限依赖底层表或 API，请查看指标来源后申请对应表/API 权限。');
  }

  const status = normalizeStatus(record.permissionStatus ?? record.permission_status);
  if (status === 'granted') {
    return { state: 'granted', label: '已有权限', disabled: true, reason: '当前用户已有权限。' };
  }
  if (status === 'pending') {
    return { state: 'pending', label: '申请中', disabled: true, reason: '当前资产权限申请审批中，请勿重复提交。' };
  }

  if (applyableTypes.has(String(record.type))) {
    return {
      state: 'applyable',
      label: '申请权限',
      disabled: false,
      reason: '',
      targetHash: 'my?section=cart',
    };
  }

  return blockedAction('该对象暂不支持在本平台内直接申请权限，请查看来源说明后处理。');
}

export function addPermissionCartItem(record: PermissionRecord): AddCartResult {
  const action = getPermissionAction(record);
  if (action.state !== 'applyable') {
    return { status: 'blocked', reason: action.reason };
  }

  const item = toCartItem(record);
  const current = getPermissionCartItems();
  const exists = current.some((cartItem) => cartItem.id === item.id);
  if (exists) {
    return { status: 'exists', item };
  }

  const nextItems = [item, ...current];
  writeCartItems(nextItems);
  notify();
  return { status: 'added', item };
}

export function getPermissionCartItems(): PermissionCartItem[] {
  const stored = readStoredItems();
  memoryCart = stored;
  return [...memoryCart];
}

export function removePermissionCartItem(id: string) {
  const nextItems = getPermissionCartItems().filter((item) => item.id !== id);
  writeCartItems(nextItems);
  notify();
}

export function clearPermissionCart() {
  writeCartItems([]);
  notify();
}

export function subscribePermissionCart(listener: (items: PermissionCartItem[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function blockedAction(reason: string): PermissionAction {
  return { state: 'blocked', label: '申请权限', disabled: true, reason };
}

function normalizeStatus(status?: PermissionStatus): 'granted' | 'pending' | 'none' | 'unknown' {
  if (status === 'granted') return 'granted';
  if (status === 'pending' || status === 'applying') return 'pending';
  if (status === 'none') return 'none';
  return 'unknown';
}

function normalizeText(value?: string) {
  return String(value ?? '').trim().toLowerCase();
}

function toCartItem(record: PermissionRecord): PermissionCartItem {
  const owner = record.owner ?? record.tech_owner ?? record.businessOwner ?? record.biz_owner ?? '-';
  const display = record.displayName ?? record.display ?? record.name;
  return {
    id: record.id,
    name: record.databaseName && (record.type === 'table' || record.type === 'view') && !record.name.includes('.')
      ? `${record.databaseName}.${record.name}`
      : record.name,
    display,
    type: record.type,
    typeLabel: typeLabel(record.type),
    catalog: record.catalogPath ?? record.catalog ?? '-',
    security: 'S2 内部级',
    sourceLabel: sourceLabel(record),
    owner,
    matchedRoute: '标准权限申请（兜底）',
    approvalCode: '7C468A54-PER-2024',
    isFallback: true,
    flowPreview: ['① 上级审批 → 王经理', `② 负责人审批（或签） → ${owner}`],
  };
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    table: '数据表',
    view: '视图',
    api: 'API',
    report: '报表',
    label: '标签',
  };
  return labels[type] ?? type;
}

function sourceLabel(record: PermissionRecord) {
  return record.sourceSystem ?? record.source_system ?? record.sourceType ?? record.source_type ?? '-';
}

function readStoredItems() {
  try {
    const text = window.sessionStorage.getItem(PERMISSION_CART_STORAGE_KEY);
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

function writeCartItems(items: PermissionCartItem[]) {
  memoryCart = [...items];
  try {
    window.sessionStorage.setItem(PERMISSION_CART_STORAGE_KEY, JSON.stringify(memoryCart));
  } catch {
    // Keep the in-memory copy when storage is unavailable.
  }
}

function notify() {
  const items = getPermissionCartItems();
  listeners.forEach((listener) => listener(items));
}

function isCartItem(item: unknown): item is PermissionCartItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<PermissionCartItem>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}
