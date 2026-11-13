import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { normalizePayment } from './normalize-payment.js';
import { PaymentServiceConfigurationValidator as Configuration } from './configuration/payment-service-configuration.validator.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

const config = Configuration.validate({
  version: 2,
  accountType: 'mobile',
  countries: ['MW'],
  validation: {
    limits: {},
    currencies: ['MWK'],
    transactionTypes: ['COLLECTION'],
  },
});
const request = (
  override: Partial<CreatePaymentDto> = {},
): CreatePaymentDto => ({
  serviceCode: 'MOBILE_MONEY',
  reference: ' ORDER-1 ',
  accountNumber: '0991234567',
  country: 'mw',
  currency: 'MWK',
  amount: '100.00',
  transactionType: 'COLLECTION',
  ...override,
});

describe('normalized payment contract', () => {
  it('rejects numeric account and amount inputs despite global implicit conversion', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    for (const override of [
      { accountNumber: 991234567 },
      { amount: 100 },
      { data: null },
      { unexpected: true },
    ]) {
      await expect(
        pipe.transform(
          { ...request(), ...override },
          { metatype: CreatePaymentDto, type: 'body' },
        ),
      ).rejects.toMatchObject({ status: 400 });
    }
    const dto = await pipe.transform(
      { ...request(), country: ' mw ' },
      { metatype: CreatePaymentDto, type: 'body' },
    );
    expect(normalizePayment(dto, config).country).toBe('MW');
  });

  it('accepts empty service data and normalizes the account and reference', () => {
    expect(normalizePayment(request(), config)).toEqual({
      accountNumber: '+265991234567',
      country: 'MW',
      reference: 'ORDER-1',
      data: {},
    });
  });
  it('accepts equivalent legacy number formats without duplicating common metadata', () => {
    expect(
      normalizePayment(
        request({ data: { msisdn: '265991234567', country: 'MW' } }),
        config,
      ).data,
    ).toEqual({});
  });
  it('supports legacy Airtel requests when the common fields can be derived', () => {
    expect(
      normalizePayment(
        request({
          accountNumber: undefined,
          country: undefined,
          data: { msisdn: '991234567', country: 'MW' },
        }),
        { ...config, requiredFields: ['msisdn', 'country'] },
      ).accountNumber,
    ).toBe('+265991234567');
  });
  it.each([
    { accountNumber: '' },
    { accountNumber: undefined },
    { country: 'ZZ' },
    { country: undefined },
    { country: 'KE' },
    { accountNumber: '+254712345678' },
    { accountNumber: '123' },
    { data: { msisdn: '0997654321' } },
    { data: { countryCode: 'KE' } },
  ])(
    'rejects missing, invalid or conflicting common fields: %j',
    (override) => {
      expect(() => normalizePayment(request(override), config)).toThrow();
    },
  );
  it('preserves bank account leading zeros and keeps sender country distinct', () => {
    expect(
      normalizePayment(
        request({
          accountNumber: '00123456',
          data: { senderCountryCode: 'KE' },
        }),
        { ...config, accountType: 'bank' },
      ),
    ).toMatchObject({
      accountNumber: '00123456',
      country: 'MW',
      data: { senderCountryCode: 'KE' },
    });
  });
  it('does not infer the recipient country from a sender country', () => {
    expect(() =>
      normalizePayment(
        request({ country: undefined, data: { senderCountryCode: 'MW' } }),
        config,
      ),
    ).toThrow('country');
  });
  it('separates a direct-charge billing account from the mobile payer account', () => {
    const result = normalizePayment(
      request({
        data: {
          payerMsisdn: '0991234567',
          accountNumber: 'INVOICE-ACCOUNT',
          countryCode: 'MW',
        },
      }),
      {
        ...config,
        requiredFields: ['payerMsisdn', 'accountNumber', 'countryCode'],
      },
    );
    expect(result.accountNumber).toBe('+265991234567');
    expect(result.data).toEqual({ billingAccountNumber: 'INVOICE-ACCOUNT' });
  });
  it('validates typed service data before processing', () => {
    const service = {
      ...config,
      dataFields: {
        bankCode: { type: 'string' as const, required: true },
        confirm: { type: 'boolean' as const, required: true },
      },
    };
    expect(() => normalizePayment(request(), service)).toThrow('data.bankCode');
    expect(() =>
      normalizePayment(
        request({ data: { bankCode: 'ABC', confirm: 'false' } }),
        service,
      ),
    ).toThrow('data.confirm');
    expect(
      normalizePayment(
        request({ data: { bankCode: 'ABC', confirm: false } }),
        service,
      ).data.confirm,
    ).toBe(false);
  });
  it('retains version 2 rules when configuration is saved', () => {
    expect(
      Configuration.validate({
        ...config,
        dataFields: {
          code: {
            type: 'string',
            required: true,
            minLength: 2,
            maxLength: 4,
            enum: ['AB'],
          },
        },
      }),
    ).toMatchObject({
      version: 2,
      accountType: 'mobile',
      countries: ['MW'],
      dataFields: { code: { enum: ['AB'] } },
    });
    expect(() =>
      Configuration.validate({ ...config, accountType: 'wrong' }),
    ).toThrow();
    expect(() =>
      Configuration.validate({
        ...config,
        dataFields: { msisdn: { type: 'string' } },
      }),
    ).toThrow('common');
  });
});
