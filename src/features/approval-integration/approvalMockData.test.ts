import { describe, expect, it } from 'vitest';
import { initialBatches, initialPendingTasks, ticketTypes } from './approvalData';

const expectedTicketTypes = ['权限申请', '上架审批', '下架审批', '目录修改', '目录编辑审批', '负责人交接', '血缘修正'];
const statuses = ['approving', 'approved', 'rejected', 'cancelled'] as const;

describe('approval mock data coverage', () => {
  it('registers every approval ticket type', () => {
    expect(ticketTypes).toEqual(expectedTicketTypes);
  });

  it('covers every ticket type in pending approvals', () => {
    const pendingTypes = new Set(initialPendingTasks.map(task => task.ticketType ?? '权限申请'));

    expect(pendingTypes).toEqual(new Set(expectedTicketTypes));
  });

  it('covers every ticket type and major status in submitted approval batches', () => {
    const instances = initialBatches.flatMap(batch => batch.instances.map(instance => ({
      ticketType: instance.ticketType ?? batch.ticketType,
      status: instance.status,
      reason: instance.reason,
      assets: instance.assets,
    })));

    for (const ticketType of expectedTicketTypes) {
      const instancesForType = instances.filter(instance => instance.ticketType === ticketType);
      expect(instancesForType.length).toBeGreaterThanOrEqual(statuses.length);

      for (const status of statuses) {
        expect(instancesForType.some(instance => instance.status === status)).toBe(true);
      }

      expect(instancesForType.every(instance => instance.reason && !instance.reason.includes('测试'))).toBe(true);
      expect(instancesForType.every(instance => instance.reason && !instance.reason.includes('示例'))).toBe(true);
      expect(instancesForType.every(instance => instance.assets.length > 0)).toBe(true);
    }
  });

  it('projects submitted batches with every major status available for filters', () => {
    for (const status of statuses) {
      expect(initialBatches.some(batch => batch.status === status)).toBe(true);
    }
  });

  it('keeps pending tasks as active approval work only', () => {
    expect(initialPendingTasks.every(task => task.nodeName.length > 0)).toBe(true);
    expect(initialPendingTasks.every(task => task.waitingHours > 0)).toBe(true);
    expect(initialPendingTasks.every(task => task.subOrderNo.startsWith('SUB-'))).toBe(true);
  });
});
