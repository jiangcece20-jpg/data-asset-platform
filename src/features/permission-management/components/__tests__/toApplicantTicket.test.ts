import { toApplicantTicket } from '../toApplicantTicket';

describe('toApplicantTicket', () => {
  it('maps a perm detailItem into a Ticket with category=perm and reason preserved', () => {
    const result = toApplicantTicket({
      id: 'PA-2026032500008',
      detailType: 'perm',
      detailData: { applicant: '张三', applyTime: '2026-03-25 16:40', reason: '需要查询订单' },
    });
    expect(result).toMatchObject({
      id: 'PA-2026032500008',
      category: 'perm',
      type: '权限申请',
      applicant: '张三',
      applyTime: '2026-03-25 16:40',
      reason: '需要查询订单',
    });
  });

  it('maps a catalog detailItem into a Ticket with category=gov and type=目录修改', () => {
    const result = toApplicantTicket({
      id: 'GA-2026032900035',
      detailType: 'catalog',
      detailData: { applicant: '张三', applyTime: '2026-03-29 11:30', asset: 'dwd_click_stream', from: 'A/B', to: 'A/C', reason: '目录调整' },
    });
    expect(result).toMatchObject({
      id: 'GA-2026032900035',
      category: 'gov',
      type: '目录修改',
      applicant: '张三',
      applyTime: '2026-03-29 11:30',
      assetName: 'dwd_click_stream',
      reason: '目录调整',
    });
  });

  it('maps a transfer detailItem into a Ticket with category=gov and type=负责人交接', () => {
    const result = toApplicantTicket({
      id: 'PA-2026041000007',
      detailType: 'transfer',
      detailData: { applicant: '赵六', applyTime: '2026-04-10 14:20', asset: 'dwd_user_behavior', assignee: '钱七', reason: '原负责人离职' },
    });
    expect(result).toMatchObject({
      id: 'PA-2026041000007',
      category: 'gov',
      type: '负责人交接',
      applicant: '赵六',
      applyTime: '2026-04-10 14:20',
      assetName: 'dwd_user_behavior',
      reason: '原负责人离职',
    });
  });

  it('defaults reason to undefined when source detailData has no reason', () => {
    const result = toApplicantTicket({
      id: 'PA-2026032500008',
      detailType: 'perm',
      detailData: { applicant: '张三', applyTime: '2026-03-25 16:40' },
    });
    expect(result.reason).toBeUndefined();
  });
});
