import type { PaymentServiceConfiguration } from "./payment-service.configuration.js";

export class PaymentServiceConfigurationValidator {
  static validate(
    configuration: unknown,
  ): PaymentServiceConfiguration {
    if (
      !configuration ||
      typeof configuration !== "object" ||
      Array.isArray(configuration)
    ) {
      throw new Error(
        "Payment service configuration must be an object.",
      );
    }

    const value =
      configuration as Record<string, unknown>;

    const requiredFields =
      value.requiredFields;

    if (!Array.isArray(requiredFields)) {
      throw new Error(
        "Payment service configuration requiredFields must be an array.",
      );
    }

    if (
      requiredFields.some(
        (field) => typeof field !== "string",
      )
    ) {
      throw new Error(
        "Payment service configuration requiredFields must contain only strings.",
      );
    }

    const normalizedRequiredFields =
      requiredFields.map((field) =>
        field.trim(),
      );

    if (
      normalizedRequiredFields.some(
        (field) => !field,
      )
    ) {
      throw new Error(
        "Payment service configuration requiredFields cannot contain empty values.",
      );
    }

    const uniqueRequiredFields = [
      ...new Set(normalizedRequiredFields),
    ];

    const validation = value.validation;

    if (
      !validation ||
      typeof validation !== "object" ||
      Array.isArray(validation)
    ) {
      throw new Error(
        "Payment service configuration must contain a validation object.",
      );
    }

    const validationConfig =
      validation as Record<string, unknown>;

    const limits = validationConfig.limits;

    if (
      !limits ||
      typeof limits !== "object" ||
      Array.isArray(limits)
    ) {
      throw new Error(
        "Payment service validation must contain a limits object.",
      );
    }

    const limitsConfig =
      limits as Record<string, unknown>;

    const currencies =
      validationConfig.currencies;

    if (
      !Array.isArray(currencies) ||
      currencies.some(
        (currency) =>
          typeof currency !== "string",
      )
    ) {
      throw new Error(
        "Payment service validation currencies must be an array of strings.",
      );
    }

    const transactionTypes =
      validationConfig.transactionTypes;

    if (
      !Array.isArray(transactionTypes) ||
      transactionTypes.some(
        (type) => typeof type !== "string",
      )
    ) {
      throw new Error(
        "Payment service validation transactionTypes must be an array of strings.",
      );
    }

    const minimumAmount =
      limitsConfig.minimumAmount;

    const maximumAmount =
      limitsConfig.maximumAmount;

    if (
      minimumAmount !== undefined &&
      typeof minimumAmount !== "string"
    ) {
      throw new Error(
        "minimumAmount must be a string.",
      );
    }

    if (
      maximumAmount !== undefined &&
      typeof maximumAmount !== "string"
    ) {
      throw new Error(
        "maximumAmount must be a string.",
      );
    }

    const normalizedMinimumAmount =
      minimumAmount !== undefined
        ? this.validateAmountLimit(
          minimumAmount,
          "minimumAmount",
        )
        : undefined;

    const normalizedMaximumAmount =
      maximumAmount !== undefined
        ? this.validateAmountLimit(
          maximumAmount,
          "maximumAmount",
        )
        : undefined;

    if (
      normalizedMinimumAmount !==
      undefined &&
      normalizedMaximumAmount !==
      undefined &&
      this.compareDecimalStrings(
        normalizedMinimumAmount,
        normalizedMaximumAmount,
      ) > 0
    ) {
      throw new Error(
        "minimumAmount cannot be greater than maximumAmount.",
      );
    }

    return {
      requiredFields:
        uniqueRequiredFields,

      validation: {
        limits: {
          ...(normalizedMinimumAmount !==
            undefined
            ? {
              minimumAmount:
                normalizedMinimumAmount,
            }
            : {}),

          ...(normalizedMaximumAmount !==
            undefined
            ? {
              maximumAmount:
                normalizedMaximumAmount,
            }
            : {}),
        },

        currencies: currencies.map(
          (currency) =>
            currency.trim().toUpperCase(),
        ),

        transactionTypes:
          transactionTypes.map(
            (type) =>
              type.trim().toUpperCase(),
          ),
      },
    };
  }

  private static validateAmountLimit(
    value: string,
    field: string,
  ): string {
    const normalized =
      value.trim();

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
    if (
      !/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(
        normalized,
      )
    ) {
      throw new Error(
        `${field} must be a non-negative decimal value with no more than 4 decimal places.`,
      );
    }

    return normalized;
  }

  private static compareDecimalStrings(
    first: string,
    second: string,
  ): number {
    const [firstWhole, firstFraction = ""] =
      first.split(".");

    const [secondWhole, secondFraction = ""] =
      second.split(".");

    const normalizedFirstFraction =
      firstFraction.padEnd(4, "0");

    const normalizedSecondFraction =
      secondFraction.padEnd(4, "0");

    const firstWholeValue =
      BigInt(firstWhole);

    const secondWholeValue =
      BigInt(secondWhole);

    if (
      firstWholeValue <
      secondWholeValue
    ) {
      return -1;
    }

    if (
      firstWholeValue >
      secondWholeValue
    ) {
      return 1;
    }

    const firstFractionValue =
      BigInt(
        normalizedFirstFraction,
      );

    const secondFractionValue =
      BigInt(
        normalizedSecondFraction,
      );

    if (
      firstFractionValue <
      secondFractionValue
    ) {
      return -1;
    }

    if (
      firstFractionValue >
      secondFractionValue
    ) {
      return 1;
    }

    return 0;
  }
}