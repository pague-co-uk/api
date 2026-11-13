import { BadRequestException } from '@nestjs/common';
import { isISO31661Alpha2 } from 'class-validator';
import type { PaymentDataField } from './payment-service.configuration.js';
import type { PaymentServiceConfiguration } from './payment-service.configuration.js';

export class PaymentServiceConfigurationValidator {
  static validate(configuration: unknown): PaymentServiceConfiguration {
    if (
      !configuration ||
      typeof configuration !== 'object' ||
      Array.isArray(configuration)
    ) {
      throw new BadRequestException(
        'Payment service configuration must be an object.',
      );
    }

    const value = configuration as Record<string, unknown>;

    const requiredFields =
      value.requiredFields ?? (value.version === 2 ? [] : undefined);

    if (!Array.isArray(requiredFields)) {
      throw new BadRequestException(
        'Payment service configuration requiredFields must be an array.',
      );
    }

    if (requiredFields.some((field) => typeof field !== 'string')) {
      throw new BadRequestException(
        'Payment service configuration requiredFields must contain only strings.',
      );
    }

    const normalizedRequiredFields = requiredFields.map((field) =>
      field.trim(),
    );

    if (normalizedRequiredFields.some((field) => !field)) {
      throw new BadRequestException(
        'Payment service configuration requiredFields cannot contain empty values.',
      );
    }

    const uniqueRequiredFields = [...new Set(normalizedRequiredFields)];

    const validation = value.validation;

    if (
      !validation ||
      typeof validation !== 'object' ||
      Array.isArray(validation)
    ) {
      throw new BadRequestException(
        'Payment service configuration must contain a validation object.',
      );
    }

    const validationConfig = validation as Record<string, unknown>;

    const limits = validationConfig.limits;

    if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
      throw new BadRequestException(
        'Payment service validation must contain a limits object.',
      );
    }

    const limitsConfig = limits as Record<string, unknown>;

    const currencies = validationConfig.currencies;

    if (
      !Array.isArray(currencies) ||
      currencies.some((currency) => typeof currency !== 'string')
    ) {
      throw new BadRequestException(
        'Payment service validation currencies must be an array of strings.',
      );
    }

    const transactionTypes = validationConfig.transactionTypes;

    if (
      !Array.isArray(transactionTypes) ||
      transactionTypes.some((type) => typeof type !== 'string')
    ) {
      throw new BadRequestException(
        'Payment service validation transactionTypes must be an array of strings.',
      );
    }

    const minimumAmount = limitsConfig.minimumAmount;

    const maximumAmount = limitsConfig.maximumAmount;

    if (minimumAmount !== undefined && typeof minimumAmount !== 'string') {
      throw new BadRequestException('minimumAmount must be a string.');
    }

    if (maximumAmount !== undefined && typeof maximumAmount !== 'string') {
      throw new BadRequestException('maximumAmount must be a string.');
    }

    const normalizedMinimumAmount =
      minimumAmount !== undefined
        ? this.validateAmountLimit(minimumAmount, 'minimumAmount')
        : undefined;

    const normalizedMaximumAmount =
      maximumAmount !== undefined
        ? this.validateAmountLimit(maximumAmount, 'maximumAmount')
        : undefined;

    if (
      normalizedMinimumAmount !== undefined &&
      normalizedMaximumAmount !== undefined &&
      this.compareDecimalStrings(
        normalizedMinimumAmount,
        normalizedMaximumAmount,
      ) > 0
    ) {
      throw new BadRequestException(
        'minimumAmount cannot be greater than maximumAmount.',
      );
    }

    if (
      value.version !== undefined &&
      value.version !== 1 &&
      value.version !== 2
    )
      throw new BadRequestException(
        'Unsupported payment configuration version.',
      );
    if (
      value.accountType !== undefined &&
      !['mobile', 'bank', 'identifier'].includes(value.accountType as string)
    )
      throw new BadRequestException(
        'accountType must be mobile, bank or identifier.',
      );
    if (value.version === 2 && !value.accountType)
      throw new BadRequestException(
        'Version 2 configuration requires accountType.',
      );
    const countries = value.countries;
    if (
      countries !== undefined &&
      (!Array.isArray(countries) ||
        countries.some(
          (code) =>
            typeof code !== 'string' ||
            !isISO31661Alpha2(code.trim().toUpperCase()),
        ))
    )
      throw new BadRequestException(
        'countries must contain ISO two-letter country codes.',
      );
    const dataFields = value.dataFields;
    if (dataFields !== undefined) {
      if (
        !dataFields ||
        typeof dataFields !== 'object' ||
        Array.isArray(dataFields)
      )
        throw new BadRequestException('dataFields must be an object.');
      for (const [name, raw] of Object.entries(dataFields)) {
        if (
          !name.trim() ||
          [
            'msisdn',
            'payerMsisdn',
            'recipientAccountNumber',
            'country',
            'countryCode',
            'recipientCountryCode',
          ].includes(name)
        )
          throw new BadRequestException(
            `dataFields.${name} duplicates a common payment field.`,
          );
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
          throw new BadRequestException(
            `dataFields.${name} must be a field rule.`,
          );
        const rule = raw as PaymentDataField;
        if (!['string', 'number', 'boolean', 'object'].includes(rule.type))
          throw new BadRequestException(`dataFields.${name}.type is invalid.`);
        if (rule.required !== undefined && typeof rule.required !== 'boolean')
          throw new BadRequestException(
            `dataFields.${name}.required must be boolean.`,
          );
        for (const limit of [rule.minLength, rule.maxLength]) {
          if (
            limit !== undefined &&
            (rule.type !== 'string' ||
              !Number.isInteger(limit) ||
              limit < 0 ||
              limit > 10000)
          )
            throw new BadRequestException(
              `dataFields.${name} has invalid string limits.`,
            );
        }
        if (
          rule.minLength !== undefined &&
          rule.maxLength !== undefined &&
          rule.minLength > rule.maxLength
        )
          throw new BadRequestException(
            `dataFields.${name} has inconsistent string limits.`,
          );
        if (
          rule.enum !== undefined &&
          (!Array.isArray(rule.enum) ||
            rule.enum.some((option) => typeof option !== rule.type))
        )
          throw new BadRequestException(
            `dataFields.${name}.enum does not match its type.`,
          );
      }
    }

    return {
      ...(value.version !== undefined
        ? { version: value.version as 1 | 2 }
        : {}),
      ...(value.accountType
        ? { accountType: value.accountType as 'mobile' | 'bank' | 'identifier' }
        : {}),
      ...(countries
        ? {
            countries: (countries as string[]).map((code) =>
              code.trim().toUpperCase(),
            ),
          }
        : {}),
      ...(dataFields
        ? { dataFields: dataFields as Record<string, PaymentDataField> }
        : {}),
      requiredFields: uniqueRequiredFields,

      validation: {
        limits: {
          ...(normalizedMinimumAmount !== undefined
            ? {
                minimumAmount: normalizedMinimumAmount,
              }
            : {}),

          ...(normalizedMaximumAmount !== undefined
            ? {
                maximumAmount: normalizedMaximumAmount,
              }
            : {}),
        },

        currencies: currencies.map((currency) => currency.trim().toUpperCase()),

        transactionTypes: transactionTypes.map((type) =>
          type.trim().toUpperCase(),
        ),
      },
    };
  }

  private static validateAmountLimit(value: string, field: string): string {
    const normalized = value.trim();

    /*
     * Positive or zero monetary value with
     * a maximum of 4 decimal places.
     *
     * Examples accepted:
     *   0
     *   0.00
     *   100
     *   100.5
     *   100.50
     *   100.5000
     *
     * Examples rejected:
     *   -1
     *   -100.00
     *   100.12345
     *   1.2.3
     *   01.00
     *   1,000
     */
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(normalized)) {
      throw new BadRequestException(
        `${field} must be a non-negative decimal value with no more than 4 decimal places.`,
      );
    }

    return normalized;
  }

  private static compareDecimalStrings(first: string, second: string): number {
    const [firstWhole, firstFraction = ''] = first.split('.');

    const [secondWhole, secondFraction = ''] = second.split('.');

    const normalizedFirstFraction = firstFraction.padEnd(4, '0');

    const normalizedSecondFraction = secondFraction.padEnd(4, '0');

    const firstWholeValue = BigInt(firstWhole);

    const secondWholeValue = BigInt(secondWhole);

    if (firstWholeValue < secondWholeValue) {
      return -1;
    }

    if (firstWholeValue > secondWholeValue) {
      return 1;
    }

    const firstFractionValue = BigInt(normalizedFirstFraction);

    const secondFractionValue = BigInt(normalizedSecondFraction);

    if (firstFractionValue < secondFractionValue) {
      return -1;
    }

    if (firstFractionValue > secondFractionValue) {
      return 1;
    }

    return 0;
  }
}
