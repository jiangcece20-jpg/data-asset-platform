import { describe, expect, it, beforeEach } from 'vitest';
import {
  approveLineageApproval,
  getActiveLineageApproval,
  getLineageApprovals,
  resetLineageApprovalStore,
  submitLineageApproval,
  withdrawLineageApproval,
} from './lineageApprovalStore';

describe('lineageApprovalStore', () => {
  beforeEach(() => {
    resetLineageApprovalStore();
  });

  it('creates one active lineage approval per object and withdraw releases it', () => {
    const approval = submitLineageApproval({
      objectId: 'dwd_order_detail',
      objectName: 'dwd_order_detail',
      objectDisplay: '订单明细宽表',
      catalog: '交易域/订单/订单明细',
      securityLevel: 'S3',
      reason: '补齐订单血缘',
      changes: [
        {
          id: 'change-1',
          kind: 'relation',
          action: 'add',
          direction: 'upstream',
          sourceId: 'ods_order_raw',
          sourceName: 'ods_order_raw',
          targetId: 'dwd_order_detail',
          targetName: 'dwd_order_detail',
          reason: '补齐来源',
        },
      ],
    });

    expect(approval.status).toBe('approving');
    expect(getActiveLineageApproval('dwd_order_detail')?.approvalNo).toBe(approval.approvalNo);
    expect(() => submitLineageApproval({
      objectId: 'dwd_order_detail',
      objectName: 'dwd_order_detail',
      objectDisplay: '订单明细宽表',
      catalog: '交易域/订单/订单明细',
      securityLevel: 'S3',
      reason: '重复提交',
      changes: [],
    })).toThrow(/已有血缘修正审批中/);

    withdrawLineageApproval(approval.id);

    expect(getActiveLineageApproval('dwd_order_detail')).toBeUndefined();
    expect(getLineageApprovals()[0].status).toBe('withdrawn');
  });

  it('approves an approval and exposes an applied change set', () => {
    const approval = submitLineageApproval({
      objectId: 'dwd_order_detail',
      objectName: 'dwd_order_detail',
      objectDisplay: '订单明细宽表',
      catalog: '交易域/订单/订单明细',
      securityLevel: 'S3',
      reason: '补齐订单血缘',
      changes: [
        {
          id: 'change-1',
          kind: 'relation',
          action: 'add',
          direction: 'downstream',
          sourceId: 'dwd_order_detail',
          sourceName: 'dwd_order_detail',
          targetId: 'metric_gmv_daily',
          targetName: 'metric_gmv_daily',
          reason: '新增指标消费',
        },
      ],
    });

    approveLineageApproval(approval.id);

    expect(getLineageApprovals()[0].status).toBe('approved');
    expect(getLineageApprovals()[0].appliedAt).toBeTruthy();
  });
});
