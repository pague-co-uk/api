import { describe, expect, it, jest } from '@jest/globals';
import { PaymentDashboardService } from './services/payment-dashboard.service.js';
import { PaymentDashboardRepository } from '../../repositories/PaymentDashboardRepository.js';
import type { AuthenticatedUser } from '../../common/authorization/interfaces/authenticated-user.interface.js';
const user = (roles: string[], clientId = 'demo-client') => ({ clientId, roles: roles.map(name => ({ name })) }) as AuthenticatedUser;
const service = Object.assign(Object.create(PaymentDashboardService.prototype), { config: { app: { platformClient: 'obsolete-client' } } }) as PaymentDashboardService;
describe('payment dashboard visibility', () => {
  it('gives platform super-admins all clients regardless of configured client ID', () => {
    const viewer = user(['PLATFORM_SUPER_ADMIN']);
    const scope = service['resolveScope'](viewer);
    expect(scope).toBe('PLATFORM');
    expect(service['resolveClientIds'](viewer, scope)).toBeUndefined();
  });
  it('keeps ordinary users scoped even if their client matches platform configuration', () => {
    const viewer = user(['ADMIN'], 'obsolete-client');
    const scope = service['resolveScope'](viewer);
    expect(scope).toBe('CLIENT');
    expect(service['resolveClientIds'](viewer, scope)).toEqual(['obsolete-client']);
  });
  it('gives a clientless user an empty scope', () => expect(service['resolveClientIds'](user([], ''), 'CLIENT')).toEqual([]));
  it.each([['1d',1],['7d',7],['30d',30],['90d',90]] as const)('uses the requested %s window', (period, days) => {
    const value = service['resolvePeriod'](period);
    expect(value.days).toBe(days);
    const expected = new Date(value.end); expected.setHours(0,0,0,0); expected.setDate(expected.getDate() - days + 1);
    expect(value.start).toEqual(expected);
  });
  it('includes processing payments in the transaction total', () => expect(service['buildSummary']([{ status: 'PROCESSING', _count: { _all: 2 } }])).toMatchObject({ total: 2, processing: 2, successful: 0 }));
  it.each(['getTransactionTrend','getCurrencyVolume','getProviderPerformance','getTransactionTypeBreakdown'] as const)('%s does not broaden an empty client scope', async method => {
    const query = jest.fn(async (_sql: unknown) => []);
    const repository = Object.assign(Object.create(PaymentDashboardRepository.prototype), { db: { $queryRaw: query }, execute: async (_a: unknown, _b: unknown, run: () => Promise<{result: unknown}>) => (await run()).result }) as PaymentDashboardRepository;
    await repository[method]([], { start: new Date('2026-11-13T00:00:00Z'), end: new Date('2026-11-13T23:59:59Z') });
    expect((query.mock.calls[0][0] as { sql: string }).sql).toContain('AND 1 = 0');
  });
});
