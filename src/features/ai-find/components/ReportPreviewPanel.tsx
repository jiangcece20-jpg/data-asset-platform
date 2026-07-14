import { Button } from '../../../components/base/Button';
import { Tag } from '../../../components/base/Tag';
import { toast } from '../../../components/feedback/Toast';
import type { AssetCard } from '../../../types/aiFind';

type Props = {
  asset: AssetCard;
  onOpenDetail: () => void;
};

/** 报表 / 看板嵌入预览：筛选条 + KPI + 趋势 + 口径 */
export function ReportPreviewPanel({ asset, onOpenDetail }: Props) {
  const typeLabel = asset.typeLabel;
  const openOrigin = () => toast.info(`已在新页签打开「${asset.name}」（演示：跳转 BI 平台并携带当前筛选条件）`);

  return (
    <div className="ai-find__panel">
      <div className="ai-find__panel-header">
        <Tag tone={asset.type === 'dashboard' ? 'purple' : 'success'}>{typeLabel}</Tag>
        <div>
          <div className="ai-find__panel-title">{asset.name}</div>
          <div className="ai-find__panel-sub">{asset.enName} · {asset.source} · {asset.freq}</div>
        </div>
        <div className="ai-find__panel-actions">
          <button type="button" className="ai-find__btn-outline" onClick={onOpenDetail}>完整详情</button>
          <Button variant="primary" size="sm" onClick={openOrigin}>打开原{typeLabel} →</Button>
        </div>
      </div>

      <div className="ai-find__panel-body">
        <div className="ai-find__preview-filter">
          <span>时间</span>
          <select defaultValue="近 7 天"><option>近 7 天</option><option>近 30 天</option><option>本月</option></select>
          <span>渠道</span>
          <select defaultValue="全部"><option>全部</option><option>APP</option><option>小程序</option><option>H5</option></select>
          <span className="ai-find__hint ai-find__btn-right">嵌入预览（演示数据），完整交互请打开原{typeLabel}</span>
        </div>

        <div className="ai-find__metric-cards">
          <div className="ai-find__metric-card ai-find__metric-card--primary"><div className="ai-find__metric-label">GMV（昨日）</div><div className="ai-find__metric-value">1.23 亿</div><div className="ai-find__metric-change ai-find__metric-change--up">↑8.2% 对比上周同日</div></div>
          <div className="ai-find__metric-card"><div className="ai-find__metric-label">订单量（昨日）</div><div className="ai-find__metric-value">86.4 万</div><div className="ai-find__metric-change ai-find__metric-change--up">↑5.6%</div></div>
          <div className="ai-find__metric-card"><div className="ai-find__metric-label">退款率（昨日）</div><div className="ai-find__metric-value">2.31%</div><div className="ai-find__metric-change ai-find__metric-change--down">↓0.2pp</div></div>
        </div>

        <PreviewTrend />

        <div className="ai-find__card ai-find__card--padded">
          <div className="ai-find__card-title">📐 指标口径</div>
          <div className="ai-find__caliber-box">{asset.caliber}</div>
        </div>
      </div>
    </div>
  );
}

const VALUES = [820, 910, 880, 1050, 980, 1120, 1080, 1150, 1090, 1200, 1180, 1250, 1220, 1300, 1280, 1350, 1320, 1400, 1380, 1450, 1420, 1480, 1460, 1520, 1500, 1550, 1530, 1580, 1560, 1580];

function PreviewTrend() {
  const w = 560; const h = 140; const pad = 20;
  const min = Math.min(...VALUES); const max = Math.max(...VALUES);
  const pts = VALUES.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (VALUES.length - 1);
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <div className="ai-find__card ai-find__card--padded">
      <div className="ai-find__card-title">📈 核心指标趋势（近 30 天）</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="核心指标近 30 天趋势">
        <path d={`M${pts.join(' L')}`} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
