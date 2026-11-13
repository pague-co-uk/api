import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { initTelemetry } from '@pague-co-uk/sms-gateway-telemetry';
import { PaymentsService } from './payments.service.js';

beforeAll(() =>
  initTelemetry({
    enabled: false,
    service: { name: 'payment-normalization-test', version: 'test' },
    collector: {
      tracesEndpoint: 'http://localhost:4318/v1/traces',
      metricsEndpoint: 'http://localhost:4318/v1/metrics',
      logsEndpoint: 'http://localhost:4318/v1/logs',
    },
    metrics: { exportIntervalMillis: 60000 },
    registerShutdownHooks: false,
  }),
);

function fixture(existing = false) {
  const createTransaction = jest.fn(async (_data: unknown) => ({
    id: 'internal',
    publicId: 'PUBLIC-1',
    status: 'PENDING',
  }));
  const createOutboxEvent = jest.fn(async (_data: unknown) => ({}));
  const repository = {
    findClientServiceByServiceCode: async () => ({
      id: 'assignment',
      status: 'ACTIVE',
      service: { status: 'ACTIVE', category: 'PAYMENTS' },
      configuration: {
        version: 2,
        accountType: 'mobile',
        countries: ['MW'],
        validation: {
          limits: { minimumAmount: '1', maximumAmount: '10000' },
          currencies: ['MWK'],
          transactionTypes: ['COLLECTION'],
        },
      },
    }),
    findActiveTransactionTypeByCode: async () => ({ id: 'type' }),
    findActiveCurrencyByCode: async () => ({ id: 'currency' }),
    findByClientAndReference: async () =>
      existing ? { id: 'internal' } : null,
    createTransaction,
    createOutboxEvent,
    withTransaction: async (fn: (tx: object) => Promise<unknown>) => fn({}),
    withDatabase: (_tx: unknown) => repository,
    findByClientAndId: async () => ({
      id: 'internal',
      publicId: 'PUBLIC-1',
      status: 'SUCCESS',
    }),
  };
  const service = Object.create(PaymentsService.prototype) as PaymentsService;
  Object.assign(service, {
    repository,
    random: { bytes: () => new Uint8Array(10) },
    logger: { info() {} },
    createdMetric: { add() {} },
  });
  return { service, repository };
}
const request = {
  serviceCode: ' mobile_money ',
  reference: ' ORDER-1 ',
  accountNumber: '0991234567',
  country: 'MW',
  currency: 'mwk',
  transactionType: 'collection',
  amount: '100.00',
};

describe('normalized payment persistence', () => {
  it('stores common fields separately and atomically queues processing', async () => {
    const { service, repository } = fixture();
    await expect(service.create('client', request)).resolves.toEqual({
      id: 'PUBLIC-1',
      status: 'PENDING',
    });
    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'ORDER-1',
        accountNumber: '+265991234567',
        country: 'MW',
        metadata: {},
      }),
    );
    expect(repository.createOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { transactionId: 'internal' } }),
    );
  });
  it('rejects a duplicate reference with 409 before creating or queuing anything', async () => {
    const { service, repository } = fixture(true);
    await expect(service.create('client', request)).rejects.toMatchObject({
      status: 409,
    });
    expect(repository.createTransaction).not.toHaveBeenCalled();
    expect(repository.createOutboxEvent).not.toHaveBeenCalled();
  });
  it.each(['0', '01', '100.12345', '10001', '1000000000000000'])(
    'rejects invalid/out-of-limit amount %s with 400',
    async (amount) => {
      const { service, repository } = fixture();
      await expect(
        service.create('client', { ...request, amount }),
      ).rejects.toMatchObject({ status: 400 });
      expect(repository.createTransaction).not.toHaveBeenCalled();
    },
  );
  it('returns the public reference consistently in status responses', async () => {
    const { service } = fixture();
    await expect(service.getStatus('client', 'PUBLIC-1')).resolves.toEqual({
      id: 'PUBLIC-1',
      status: 'SUCCESS',
    });
  });
  it('returns 404 for an unavailable client-scoped payment', async () => {
    const { service, repository } = fixture();
    Object.assign(repository, { findByClientAndId: async () => null });
    await expect(service.getStatus('client', 'UNKNOWN')).rejects.toMatchObject({
      status: 404,
    });
  });
});


describe('checkout status response', () => {
  it('exposes only the hosted session fields for a checkout provider', async () => {
    const { service, repository } = fixture();
    const checkout = { merchantTransactionId: 'PUBLIC-1', checkoutReference: 'CHECKOUT-1', redirectUrl: 'https://pay.example/1', expiresAt: '2099-01-01T00:00:00Z' };
    Object.assign(repository, { findByClientAndId: async () => ({ publicId: 'PUBLIC-1', status: 'PROCESSING', provider: { code: 'LIPAD_STANDARD_CHECKOUT' }, providerResponse: { checkout, secret: 'never expose' } }) });
    expect(await service.getStatus('client', 'PUBLIC-1')).toEqual({ id: 'PUBLIC-1', status: 'PROCESSING', checkout });
  });
});
