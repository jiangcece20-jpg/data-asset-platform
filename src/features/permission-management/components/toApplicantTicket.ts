import type { Ticket } from '../PermissionManagementPage';

type PermDetailData = {
  applicant: string;
  applyTime: string;
  reason?: string;
  dataTable?: string;
  usagePeriod?: string;
  dataScope?: string;
  permissionJudgment?: string;
  transactionOrder?: string;
};
type CatalogDetailData = { applicant: string; applyTime: string; asset: string; from: string; to: string; reason: string };
type TransferDetailData = { transferor: string; applyTime: string; asset: string; assignee: string; reason: string };

export function toApplicantTicket(
  item: { id: string; detailType?: string; detailData?: Record<string, unknown> }
): Ticket {
  const base = {
    id: item.id,
    feishuDefinition: '',
    approvalCode: '',
    instanceCode: '',
    feishuUrl: '',
    syncText: '实时同步',
    syncMode: 'event' as const,
    assetType: '数据表',
    status: 'pending' as const,
  };

  switch (item.detailType) {
    case 'perm': {
      const d = item.detailData as PermDetailData;
      return {
        ...base,
        category: 'perm',
        type: '权限申请',
        applicant: d?.applicant ?? '',
        applyTime: d?.applyTime ?? '',
        reason: d?.reason,
        dataTable: d?.dataTable,
        usagePeriod: d?.usagePeriod,
        dataScope: d?.dataScope,
        permissionJudgment: d?.permissionJudgment,
        transactionOrder: d?.transactionOrder,
        assetName: '',
        assetDisplay: '',
      } as Ticket;
    }
    case 'catalog': {
      const d = item.detailData as CatalogDetailData;
      return {
        ...base,
        category: 'gov',
        type: '目录修改',
        applicant: d?.applicant ?? '',
        applyTime: d?.applyTime ?? '',
        reason: d?.reason ?? '',
        assetName: d?.asset ?? '',
        assetDisplay: d?.asset ?? '',
      } as Ticket;
    }
    case 'transfer': {
      const d = item.detailData as TransferDetailData;
      return {
        ...base,
        category: 'gov',
        type: '负责人交接' as Ticket['type'],
        applicant: d?.transferor ?? '',
        applyTime: d?.applyTime ?? '',
        reason: d?.reason ?? '',
        assetName: d?.asset ?? '',
        assetDisplay: d?.asset ?? '',
      } as Ticket;
    }
    default:
      return {
        ...base,
        category: 'perm',
        type: '权限申请',
        applicant: '',
        applyTime: '',
        reason: undefined,
        assetName: '',
        assetDisplay: '',
      } as Ticket;
  }
}
