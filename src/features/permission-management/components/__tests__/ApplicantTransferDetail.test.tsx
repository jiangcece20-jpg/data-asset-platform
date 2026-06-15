import { render, screen } from '@testing-library/react';
import { ApplicantTransferDetail } from '../ApplicantTransferDetail';

const timeline = [
  { label: '① 赵六的上级（王经理）', time: '2026-04-10 14:30', status: 'done' as const },
  { label: '② 被转交人确认（钱七 · 您）', time: '', status: 'waiting' as const },
  { label: '③ 钱七的上级（孙总）', time: '', status: 'waiting' as const },
];

describe('ApplicantTransferDetail', () => {
  it('renders title and core fields (transferor / asset / assignee / reason)', () => {
    render(
      <ApplicantTransferDetail
        ticket={{ id: 'PA-2026041000007' }}
        transferor="赵六"
        assignee="钱七"
        asset="dwd_user_behavior"
        applyTime="2026-04-10 14:20"
        reason="原负责人离职"
        timeline={timeline}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.getByText(/转交负责人详情 — PA-2026041000007/)).toBeInTheDocument();
    expect(screen.getByText('赵六')).toBeInTheDocument();
    expect(screen.getByText('钱七')).toBeInTheDocument();
    expect(screen.getByText('dwd_user_behavior')).toBeInTheDocument();
    expect(screen.getByText('原负责人离职')).toBeInTheDocument();
  });

  it('renders the 3-step timeline', () => {
    render(
      <ApplicantTransferDetail
        ticket={{ id: 'PA-2026041000007' }}
        transferor="赵六"
        assignee="钱七"
        asset="dwd_user_behavior"
        applyTime="2026-04-10 14:20"
        reason="原负责人离职"
        timeline={timeline}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.getByText('① 赵六的上级（王经理）')).toBeInTheDocument();
    expect(screen.getByText('② 被转交人确认（钱七 · 您）')).toBeInTheDocument();
    expect(screen.getByText('③ 钱七的上级（孙总）')).toBeInTheDocument();
  });

  it('renders the actions slot', () => {
    render(
      <ApplicantTransferDetail
        ticket={{ id: 'PA-2026041000007' }}
        transferor="赵六"
        assignee="钱七"
        asset="dwd_user_behavior"
        applyTime="2026-04-10 14:20"
        reason="原负责人离职"
        timeline={timeline}
        actions={[<button key="w" type="button">撤回转交</button>]}
      />
    );
    expect(screen.getByRole('button', { name: '撤回转交' })).toBeInTheDocument();
  });
});
