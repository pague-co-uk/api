import { describe, expect, it } from '@jest/globals';
import { TransactionsRepository } from './repositories/transactions.repository.js';
import { MessageRepository } from '../../repositories/messageRepository.js';
import { PaginatedResponse } from '../../common/interfaces/paginated.response.js';
import { messageDateRange } from '../messages/dto/message-date-range.js';
const range = { createdFrom: new Date('2026-11-13T10:00:00Z'), createdTo: new Date('2026-11-13T12:00:00Z') };
const direct = async (_operation: unknown, _table: unknown, query: () => Promise<{ result: unknown }>) => (await query()).result;
describe('filtered status totals before pagination', () => {
  it('uses identical tenant, search, status and date constraints for transaction rows and counts', async () => {
    let list: any, aggregate: any;
    const repo = Object.assign(Object.create(TransactionsRepository.prototype), { execute: direct, db: { transaction: {
      findMany: async (args: any) => { list = args; return []; },
      groupBy: async (args: any) => { aggregate = args; return [{ status: 'PROCESSING', _count: { _all: 42 } }]; },
    } } }) as TransactionsRepository;
    const result = await repo.findManyPlatform({ page: 3, pageSize: 10, clientId: 'client', search: 'Airtel', status: 'PROCESSING', ...range });
    expect(aggregate.where).toEqual(list.where);
    expect(aggregate.where).toMatchObject({ clientId: 'client', status: 'PROCESSING', createdAt: { gte: range.createdFrom, lt: range.createdTo } });
    expect(aggregate.where.OR.length).toBeGreaterThan(0);
    expect(aggregate.take).toBeUndefined();
    expect(list).toMatchObject({ skip: 20, take: 10 });
    expect(result.totalItems).toBe(42);
    expect(result.statusCounts).toMatchObject({ PROCESSING: 42, SUCCESS: 0, FAILED: 0 });
  });
  for (const platform of [true, false]) it(`splits message routing failures without double counting (${platform ? 'platform' : 'client'})`, async () => {
    let list: any, aggregate: any, routing: any;
    const repo = Object.assign(Object.create(MessageRepository.prototype), { execute: direct, db: { message: {
      findMany: async (args: any) => { list = args; return []; },
      groupBy: async (args: any) => { aggregate = args; return [{ currentStatus: 'DELIVERED', segmentCount: 2, _count: { _all: 20 } }, { currentStatus: 'DELIVERED', segmentCount: 3, _count: { _all: 10 } }, { currentStatus: 'FAILED', segmentCount: 1, _count: { _all: 5 } }, { currentStatus: 'SUBMITTED', segmentCount: 2, _count: { _all: 7 } }]; },
      count: async (args: any) => { routing = args; return 2; },
    } } }) as MessageRepository;
    const options = { page: 2, pageSize: 10, clientId: 'client', senderIdId: 'sender', search: 'receipt', ...range };
    const result = platform ? await repo.findManyPlatform(options) : await repo.findByClient('client', options);
    expect(aggregate.where).toEqual(list.where);
    expect(routing.where.AND[0]).toEqual(list.where);
    expect(routing.where.AND[1]).toEqual({ currentStatus: 'FAILED', routeAttempts: { none: {} } });
    expect(result.totalItems).toBe(42);
    expect(result.totalSegments).toBe(89);
    expect(result.segmentBreakdown).toEqual([{ segmentCount: 1, messageCount: 5, totalSegments: 5 }, { segmentCount: 2, messageCount: 27, totalSegments: 54 }, { segmentCount: 3, messageCount: 10, totalSegments: 30 }]);
    expect(result.statusCounts).toMatchObject({ DELIVERED: 30, FAILED: 3, ROUTING_FAILED: 2, SUBMITTED: 7, QUEUED: 0 });
    expect(Object.values(result.statusCounts!).reduce((sum, value) => sum + value, 0)).toBe(42);
    const response = new PaginatedResponse([], result).toResponse({ requestId: 'test', timestamp: new Date().toISOString() });
    expect(response.pagination.statusCounts).toEqual(result.statusCounts);
    expect(response.pagination.totalSegments).toBe(89);
  });
  it('preserves exact instants and excludes the upper boundary', () => {
    const parsed = messageDateRange({ createdFrom: '2026-11-13T12:00:00+02:00', createdTo: '2026-11-13T14:00:00+02:00' });
    expect(parsed).toEqual(range);
    expect(() => messageDateRange({ createdFrom: '2026-11-13T12:00:00', createdTo: '2026-11-13T14:00:00' })).toThrow(/timezone/);
  });
});
