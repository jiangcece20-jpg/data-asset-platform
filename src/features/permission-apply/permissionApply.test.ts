import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPermissionCartItem,
  clearPermissionCart,
  getPermissionAction,
  getPermissionCartItems,
  removePermissionCartItem,
} from './permissionApply';

describe('permission apply rules', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearPermissionCart();
  });

  it.each(['table', 'view', 'api', 'report', 'label'] as const)('allows %s assets to enter the platform cart', (type) => {
    const action = getPermissionAction({ id: `r-${type}`, name: `asset_${type}`, type, permissionStatus: 'none' });

    expect(action.state).toBe('applyable');
    expect(action.label).toBe('申请权限');
    expect(action.disabled).toBe(false);
  });

  it('blocks metric assets with source guidance', () => {
    const action = getPermissionAction({ id: 'metric-1', name: 'metric_gmv', type: 'metric', permissionStatus: 'none' });

    expect(action.state).toBe('blocked');
    expect(action.reason).toContain('指标权限依赖底层表或 API');
  });

  it('blocks business database or MySQL sources before type allow rules', () => {
    const businessDb = getPermissionAction({ id: 'biz-1', name: 'mysql_order', type: 'table', sourceType: 'business_db', permissionStatus: 'none' });
    const mysql = getPermissionAction({ id: 'mysql-1', name: 'mysql_order', type: 'label', sourceSystem: 'MySQL', permissionStatus: 'none' });

    expect(businessDb.state).toBe('blocked');
    expect(mysql.state).toBe('blocked');
    expect(mysql.reason).toContain('权限不由本平台管理');
  });

  it('maps granted and pending statuses to non-submit states', () => {
    expect(getPermissionAction({ id: 'g1', name: 'granted', type: 'table', permissionStatus: 'granted' }).state).toBe('granted');
    expect(getPermissionAction({ id: 'p1', name: 'pending', type: 'table', permissionStatus: 'pending' }).state).toBe('pending');
    expect(getPermissionAction({ id: 'a1', name: 'applying', type: 'table', permission_status: 'applying' }).state).toBe('pending');
  });
});

describe('permission cart store', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearPermissionCart();
  });

  it('adds applyable records to the cart with default approval preview', () => {
    const result = addPermissionCartItem({
      id: 'asset-1',
      name: 'dwd_trade_order',
      displayName: '交易订单宽表',
      type: 'table',
      sourceSystem: 'MaxCompute',
      owner: '李四',
      catalogPath: '交易域/订单/订单明细',
      permissionStatus: 'none',
    });

    expect(result.status).toBe('added');
    expect(getPermissionCartItems()).toEqual([
      expect.objectContaining({
        id: 'asset-1',
        name: 'dwd_trade_order',
        display: '交易订单宽表',
        typeLabel: '数据表',
        sourceLabel: 'MaxCompute',
        owner: '李四',
        matchedRoute: '标准权限申请（兜底）',
      }),
    ]);
  });

  it('deduplicates repeated records and supports remove and clear', () => {
    addPermissionCartItem({ id: 'asset-1', name: 'dwd_trade_order', type: 'table', permissionStatus: 'none' });
    const duplicate = addPermissionCartItem({ id: 'asset-1', name: 'dwd_trade_order', type: 'table', permissionStatus: 'none' });

    expect(duplicate.status).toBe('exists');
    expect(getPermissionCartItems()).toHaveLength(1);

    removePermissionCartItem('asset-1');
    expect(getPermissionCartItems()).toHaveLength(0);

    addPermissionCartItem({ id: 'asset-2', name: 'api_trade_query', type: 'api', permissionStatus: 'none' });
    clearPermissionCart();
    expect(getPermissionCartItems()).toHaveLength(0);
  });
});
