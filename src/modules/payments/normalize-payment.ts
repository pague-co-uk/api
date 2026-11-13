import { BadRequestException } from '@nestjs/common';
import { isISO31661Alpha2 } from 'class-validator';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { PaymentServiceConfiguration } from './configuration/payment-service.configuration.js';

export function normalizePayment(
  dto: CreatePaymentDto,
  config: PaymentServiceConfiguration,
) {
  const data = { ...(dto.data ?? {}) };
  const countryValues = [
    dto.country,
    data.country,
    data.countryCode,
    data.recipientCountryCode,
  ].filter((value) => value !== undefined);
  if (
    !countryValues.length ||
    countryValues.some(
      (value) =>
        typeof value !== 'string' ||
        !isISO31661Alpha2(value.trim().toUpperCase()),
    )
  ) {
    throw new BadRequestException(
      'country must be an ISO two-letter account country code.',
    );
  }
  const countries = countryValues.map((value) =>
    (value as string).trim().toUpperCase(),
  );
  if (new Set(countries).size !== 1)
    throw new BadRequestException('Conflicting country values in the request.');
  const country = countries[0];
  if (config.countries?.length && !config.countries.includes(country))
    throw new BadRequestException(
      `Country '${country}' is not allowed for this service.`,
    );

  const mobile =
    config.accountType === 'mobile' ||
    (!config.accountType &&
      (config.requiredFields.includes('msisdn') ||
        config.requiredFields.includes('payerMsisdn') ||
        String(data.destinationType ?? '')
          .trim()
          .toUpperCase() === 'MOBILE'));
  // data.accountNumber is a separate billing account for direct-charge services.
  // Never alias it to the payer MSISDN in a mobile-money request.
  const accountValues = [
    dto.accountNumber,
    data.msisdn,
    data.payerMsisdn,
    data.recipientAccountNumber,
    ...(!mobile ? [data.accountNumber] : []),
  ].filter((value) => value !== undefined);
  if (
    !accountValues.length ||
    accountValues.some(
      (value) =>
        typeof value !== 'string' || !value.trim() || value.trim().length > 100,
    )
  ) {
    throw new BadRequestException(
      'accountNumber is required and must be a nonempty string of at most 100 characters.',
    );
  }
  const normalizeAccount = (value: unknown) => {
    const account = (value as string).trim();
    if (!mobile) return account;
    const phone = parsePhoneNumberFromString(
      account.startsWith('+')
        ? account
        : /^\d+$/.test(account) && !account.startsWith('0')
          ? parsePhoneNumberFromString(`+${account}`)?.country === country
            ? `+${account}`
            : account
          : account,
      { defaultCountry: country as CountryCode, extract: false },
    );
    if (
      !phone?.isValid() ||
      phone.country !== country ||
      !['MOBILE', 'FIXED_LINE_OR_MOBILE'].includes(phone.getType() ?? '')
    )
      throw new BadRequestException(
        'accountNumber must be a valid mobile number for country.',
      );
    return phone.number.toString();
  };
  const accounts = accountValues.map(normalizeAccount);
  if (new Set(accounts).size !== 1)
    throw new BadRequestException(
      'Conflicting accountNumber values in the request.',
    );
  const accountNumber = accounts[0];
  const reference = dto.reference.trim();
  if (!reference) throw new BadRequestException('reference must not be blank.');

  if (mobile && data.accountNumber !== undefined) {
    if (
      data.billingAccountNumber !== undefined &&
      data.billingAccountNumber !== data.accountNumber
    )
      throw new BadRequestException(
        'Conflicting billing account values in data.',
      );
    data.billingAccountNumber = data.accountNumber;
    delete data.accountNumber;
  }
  // Preserve a separate billing account; other common aliases no longer belong in metadata.
  for (const key of [
    'msisdn',
    'payerMsisdn',
    'recipientAccountNumber',
    'country',
    'countryCode',
    'recipientCountryCode',
  ])
    delete data[key];
  if (!mobile) delete data.accountNumber;
  const virtualData = {
    ...data,
    msisdn: accountNumber,
    payerMsisdn: accountNumber,
    recipientAccountNumber: accountNumber,
    country,
    countryCode: country,
    recipientCountryCode: country,
    ...(mobile
      ? { accountNumber: data.billingAccountNumber }
      : { accountNumber }),
  };
  // Legacy requiredFields refer to the old metadata names. Check them against the normalized context.
  const missing = config.requiredFields.filter((field) => {
    const value = virtualData[field as keyof typeof virtualData];
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && !value.trim())
    );
  });
  if (missing.length)
    throw new BadRequestException(
      `Missing required payment fields: ${missing.join(', ')}.`,
    );
  for (const [name, rule] of Object.entries(config.dataFields ?? {})) {
    const value = data[name];
    if (value === undefined || value === null) {
      if (rule.required)
        throw new BadRequestException(`data.${name} is required.`);
      continue;
    }
    const validType =
      rule.type === 'object'
        ? typeof value === 'object' && !Array.isArray(value)
        : typeof value === rule.type;
    if (!validType || (typeof value === 'number' && !Number.isFinite(value)))
      throw new BadRequestException(`data.${name} must be ${rule.type}.`);
    if (
      typeof value === 'string' &&
      ((rule.required && !value.trim()) ||
        (rule.minLength !== undefined && value.length < rule.minLength) ||
        (rule.maxLength !== undefined && value.length > rule.maxLength))
    ) {
      throw new BadRequestException(`data.${name} has an invalid length.`);
    }
    if (rule.enum && !rule.enum.includes(value as string | number | boolean))
      throw new BadRequestException(`data.${name} is not an allowed value.`);
  }
  return { accountNumber, country, reference, data };
}
