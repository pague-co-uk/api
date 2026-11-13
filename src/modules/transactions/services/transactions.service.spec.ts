import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { initTelemetry } from '@pague-co-uk/sms-gateway-telemetry';
import type { AuthenticatedUser } from '../../../common/authorization/interfaces/authenticated-user.interface.js';
import { TransactionsService } from './transactions.service.js';

beforeAll(() => initTelemetry({ enabled: false, service: { name: 'transactions-visibility-test', version: 'test' }, collector: { tracesEndpoint: 'http://localhost:4318/v1/traces', metricsEndpoint: 'http://localhost:4318/v1/metrics', logsEndpoint: 'http://localhost:4318/v1/logs' }, metrics: { exportIntervalMillis: 60000 }, registerShutdownHooks: false }));
const user = (role: string, clientId: string | undefined = 'demo-client') => ({ clientId, roles: [{ name: role }] }) as AuthenticatedUser;
function fixture() {
  const repository = {
    findManyPlatform: jest.fn(async (_options: unknown) => ({ items: [], page: 1, pageSize: 20, totalItems: 0 })),
    findByIdWithRelations: jest.fn(async (_id: string, _clientId: string | undefined) => null),
  };
  const service = Object.assign(Object.create(TransactionsService.prototype), {
    transactionsRepository: repository,
    config: { app: { platformClient: 'obsolete-client' } },
    logger: { info() {}, warn() {} }, transactionsListedMetric: { add() {} }, transactionsReadMetric: { add() {} },
  }) as TransactionsService;
  return { repository, service };
}
describe('transaction client visibility', () => {
  it('lists all clients for a platform super-admin, retaining status and search filters', async () => {
    const { service, repository } = fixture();
    await service.findMany(user('PLATFORM_SUPER_ADMIN'), { search: 'AIRTEL-TEST', status: 'PROCESSING' });
    expect(repository.findManyPlatform).toHaveBeenCalledWith(expect.objectContaining({ clientId: undefined, search: 'AIRTEL-TEST', status: 'PROCESSING', orderBy: [{ createdAt: 'desc' }] }));
  });
  it('restricts ordinary users even when their client matches the obsolete platform setting', async () => {
    const { service, repository } = fixture();
    await service.findMany(user('ADMIN', 'obsolete-client'), {});
    expect(repository.findManyPlatform).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'obsolete-client' }));
  });
  it('uses platform scope for transaction details', async () => {
    const { service, repository } = fixture();
    await expect(service.findById(user('PLATFORM_SUPER_ADMIN'), 'transaction')).rejects.toThrow('not found');
    expect(repository.findByIdWithRelations).toHaveBeenCalledWith('transaction', undefined);
  });
  it('keeps transaction details client scoped for ordinary users', async () => {
    const { service, repository } = fixture();
    await expect(service.findById(user('ADMIN'), 'transaction')).rejects.toThrow('not found');
    expect(repository.findByIdWithRelations).toHaveBeenCalledWith('transaction', 'demo-client');
  });
  it('rejects clientless ordinary users before querying', async () => {
    const { service, repository } = fixture();
    await expect(service.findMany(user('ADMIN', ''), {})).rejects.toThrow('Client access is required');
    expect(repository.findManyPlatform).not.toHaveBeenCalled();
  });
});
