import { describe, expect, it } from '@jest/globals';
import { DashboardRepository } from '../../repositories/DashboardRepository.js';
import type { Prisma } from '@prisma/client';

function repository() {
  const queries: Prisma.Sql[] = [];
  const repo = Object.create(
    DashboardRepository.prototype,
  ) as DashboardRepository;
  Object.assign(repo, {
    db: {
      $queryRaw: async (query: Prisma.Sql) => {
        queries.push(query);
        return [];
      },
    },
    execute: async (
      _operation: string,
      _table: string,
      run: () => Promise<{ result: unknown }>,
    ) => (await run()).result,
  });
  return { repo, queries };
}

describe('dashboard chart query invariants', () => {
  const period = {
    start: new Date('2026-11-01Z'),
    end: new Date('2026-11-13Z'),
  };
  it('uses one latest attempt per message and preserves unassigned traffic', async () => {
    const { repo, queries } = repository();
    await repo.getNetworkActivity(['client-a'], period);
    expect(queries[0].sql).toContain('LEFT JOIN message_route_attempts');
    expect(queries[0].sql).toContain(
      'ORDER BY latest.attemptNumber DESC LIMIT 1',
    );
    expect(queries[0].sql).toContain('COUNT(*) AS count');
    expect(queries[0].values).toContain('client-a');
  });
  it('does not turn an empty client scope into platform-wide charts', async () => {
    const { repo, queries } = repository();
    await repo.getNetworkActivity([], period);
    await repo.getMonthlyMessageOutcomes([], 2026);
    expect(queries.every((query) => query.sql.includes('AND 1 = 0'))).toBe(
      true,
    );
  });
  it('limits monthly outcomes to the chosen year and excludes failures with no route', async () => {
    const { repo, queries } = repository();
    await repo.getMonthlyMessageOutcomes(['client-a'], 2025);
    expect(queries[0].values).toEqual([
      new Date('2025-01-01Z'),
      new Date('2026-01-01Z'),
      'client-a',
    ]);
    expect(queries[0].sql).toContain("m.currentStatus = 'FAILED' AND EXISTS");
  });
});

describe('sender activity query', () => {
  const period = { start: new Date('2026-11-13T00:00:00Z'), end: new Date('2026-11-13T12:00:00Z') };
  it('groups message records by sender text and applies client/time filters', async () => {
    const { repo, queries } = repository();
    await repo.getSenderActivity(['client-a'], period);
    expect(queries[0].sql).toContain('LEFT JOIN sender_ids');
    expect(queries[0].sql).toContain('GROUP BY s.sender');
    expect(queries[0].sql).not.toContain('message_route_attempts');
    expect(queries[0].values).toEqual(expect.arrayContaining([period.start, period.end, 'client-a']));
  });
  it('returns no activity for an empty client scope', async () => {
    const { repo, queries } = repository();
    await repo.getSenderActivity([], period);
    expect(queries[0].sql).toContain('AND 1 = 0');
  });
});
