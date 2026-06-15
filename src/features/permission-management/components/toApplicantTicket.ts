import type { Ticket } from '../PermissionManagementPage';

type PermDetailData = { applicant: string; applyTime: string; reason?: string };
type CatalogDetailData = { applicant: string; applyTime: string; asset: string; from: string; to: string; reason: string };
type TransferDetailData = { applicant: string; applyTime: string; asset: string; assignee: string; reason: string };

type ApproverDetailItem =
  | { id: string; detailType: 'perm'; detailData: PermDetailData }
  | { id: string; detailType: 'catalog'; detailData: CatalogDetailData }
  | { id: string; detailType: 'transfer'; detailData: TransferDetailData };

export function toApplicantTicket(item: ApproverDetailItem): Ticket {
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
    case 'perm':
      return {
        ...base,
        category: 'perm',
        type: '权限申请',
        applicant: item.detailData.applicant,
        applyTime: item.detailData.applyTime,
        reason: item.detailData.reason,
        assetName: '',
        assetDisplay: '',
      };
    case 'catalog':
      return {
        ...base,
        category: 'gov',
        type: '目录修改',
        applicant: item.detailData.applicant,
        applyTime: item.detailData.applyTime,
        reason: item.detailData.reason,
        assetName: item.detailData.asset,
        assetDisplay: item.detailData.asset,
      };
    case 'transfer':
      return {
        ...base,
        category: 'gov',
        type: '负责人交接',
        applicant: item.detailData.applicant,
        applyTime: item.detailData.applyTime,
        reason: item.detailData.reason,
        assetName: item.detailData.asset,
        assetDisplay: item.detailData.asset,
      };
  }
}
