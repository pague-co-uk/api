import { describe, expect, it } from '@jest/globals';
import { smsSegmentSummary } from '../../common/query/sms-segments.js';
import { DashboardService } from './dashboard.service.js';
import { PaymentDashboardService } from './services/payment-dashboard.service.js';
import { DashboardRepository } from '../../repositories/DashboardRepository.js';

describe('SMS segment volumes and daily defaults', () => {
  it('multiplies message counts by segment counts across all status groups', () => {
    expect(smsSegmentSummary([{ segmentCount: 1, _count: { _all: 4 } }, { segmentCount: 2, _count: { _all: 3 } }, { segmentCount: 2, _count: { _all: 7 } }, { segmentCount: 3, _count: { _all: 2 } }])).toEqual({ totalSegments: 30, segmentBreakdown: [{ segmentCount: 1, messageCount: 4, totalSegments: 4 }, { segmentCount: 2, messageCount: 10, totalSegments: 20 }, { segmentCount: 3, messageCount: 2, totalSegments: 6 }] });
  });
  it('returns zero for an empty filtered result', () => expect(smsSegmentSummary([])).toEqual({ totalSegments: 0, segmentBreakdown: [] }));
  for (const type of [DashboardService, PaymentDashboardService]) it(`defaults ${type.name} to today and retains explicit monthly ranges`, () => {
    const service = Object.create(type.prototype);
    expect(service['resolvePeriod'](undefined).days).toBe(1);
    expect(service['resolvePeriod']('1d').days).toBe(1);
    expect(service['resolvePeriod']('30d').days).toBe(30);
  });
  it('limits segment aggregation to the requested client and period without joining attempts', async () => {
    let query: any;
    const repo = Object.assign(Object.create(DashboardRepository.prototype), { db: { message: { groupBy: async (args: unknown) => { query = args; return []; } } }, execute: async (_a: unknown, _b: unknown, run: () => Promise<{ result: unknown }>) => (await run()).result }) as DashboardRepository;
    const period = { start: new Date('2026-11-13T00:00:00Z'), end: new Date('2026-11-13T12:00:00Z') };
    await repo.getMessageSegmentCounts(['client'], period);
    expect(query).toEqual({ by: ['segmentCount'], where: { clientId: { in: ['client'] }, createdAt: { gte: period.start, lte: period.end } }, _count: { _all: true } });
    await repo.getMessageSegmentCounts([], period);
    expect(query.where.clientId.in).toEqual([]);
  });
});
