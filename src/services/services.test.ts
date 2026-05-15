import { aiService } from './aiService';
import { permissionService } from './permissionService';
import { queryService } from './queryService';
import { resourceService } from './resourceService';

describe('mock service boundaries', () => {
  it('searches resources by keyword', async () => {
    const results = await resourceService.searchResources('订单');

    expect(results.some((item) => item.displayName?.includes('订单'))).toBe(true);
  });

  it('returns permission status', async () => {
    const status = await permissionService.getPermissionStatus('resource-table-order-detail');

    expect(status.status).toBe('granted');
  });

  it('returns query result rows', async () => {
    const result = await queryService.previewSql('select * from dwd_trade_order limit 10');

    expect(result.rowCount).toBeGreaterThan(0);
  });

  it('exposes AI protocol events without implementing standalone AI page', async () => {
    const events = await aiService.createMockRecommendation('订单');

    expect(events.at(-1)?.type).toBe('done');
  });
});
