import {
  Injectable,
} from "@nestjs/common";

import {
  ClientServiceStatus,
  OutboxEventStatus,
  Prisma,
  ServiceCategory,
  ServiceStatus,
  TransactionStatus,
} from "@prisma/client";

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { CreatePaymentDto } from "../dto/create-payment.dto.js";

import {
  PaymentServiceConfigurationValidator,
} from "../configuration/payment-service-configuration.validator.js";

import {
  PaymentsRepository,
} from "../repositories/payments.repository.js";

import { RandomGenerator } from "../../../common/services/random.service.js";

import {
  PAYMENT_EVENTS,
  PAYMENT_QUEUE,
} from "../constants/payment.constants.js";
import { PaymentResponseDto } from "../dto/payment-response.dto.js";

@Injectable()
export class PaymentsService {
  private readonly logger =
    getComponentLogger(
      PaymentsService.name,
    );

  private readonly createdMetric =
    createCounterMetric({
      name:
        "payments.transactions.created",
      description:
        "Number of payment transactions created.",
    });

  constructor(
    private readonly repository:
      PaymentsRepository,

    private readonly random:
      RandomGenerator,
  ) { }

  async create(
    clientId: string,
    dto: CreatePaymentDto,
  ) {
    return withPromiseSpan(
      "PaymentsService.create",
      async () => {
        const serviceCode =
          dto.serviceCode
            .trim()
            .toUpperCase();

        const transactionTypeCode =
          dto.transactionType
            .trim()
            .toUpperCase();

        const currencyCode =
          dto.currency
            .trim()
            .toUpperCase();

        /*
         * Resolve the client's service assignment
         * and the associated Service in one query.
         */
        const clientService =
          await this.repository
            .findClientServiceByServiceCode(
              clientId,
              serviceCode,
            );

        if (!clientService) {
          throw new Error(
            `Service '${serviceCode}' is not assigned to this client.`,
          );
        }

        const service =
          clientService.service;

        if (
          service.status !==
          ServiceStatus.ACTIVE
        ) {
          throw new Error(
            `Service '${serviceCode}' is not active.`,
          );
        }

        if (
          service.category !==
          ServiceCategory.PAYMENTS
        ) {
          throw new Error(
            `Service '${serviceCode}' is not a payment service.`,
          );
        }

        if (
          clientService.status !==
          ClientServiceStatus.ACTIVE
        ) {
          throw new Error(
            `Service '${serviceCode}' is not active for this client.`,
          );
        }

        /*
         * Validate and normalize the stored
         * ClientService payment configuration.
         */
        const configuration =
          PaymentServiceConfigurationValidator.validate(
            clientService.configuration,
          );

        /*
         * Validate transaction type against the
         * transaction types configured for this
         * client's service.
         */
        if (
          !configuration.validation
            .transactionTypes
            .includes(
              transactionTypeCode,
            )
        ) {
          throw new Error(
            `Transaction type '${transactionTypeCode}' is not allowed for service '${serviceCode}'.`,
          );
        }

        /*
         * Resolve the actual TransactionType
         * database record.
         */
        const transactionType =
          await this.repository
            .findActiveTransactionTypeByCode(
              transactionTypeCode,
            );

        if (!transactionType) {
          throw new Error(
            `Transaction type '${transactionTypeCode}' was not found or is inactive.`,
          );
        }

        /*
         * Validate currency against the
         * ClientService configuration.
         */
        if (
          !configuration.validation
            .currencies
            .includes(currencyCode)
        ) {
          throw new Error(
            `Currency '${currencyCode}' is not allowed for service '${serviceCode}'.`,
          );
        }

        /*
         * Resolve the actual Currency
         * database record.
         */
        const currency =
          await this.repository
            .findActiveCurrencyByCode(
              currencyCode,
            );

        if (!currency) {
          throw new Error(
            `Currency '${currencyCode}' was not found or is inactive.`,
          );
        }

        /*
         * Validate service-specific fields.
         */
        this.validateRequiredFields(
          dto.data,
          configuration.requiredFields,
        );

        /*
         * Validate amount against the
         * service limits.
         */
        const amount =
          this.validateAmount(
            dto.amount,
            configuration.validation
              .limits,
          );

        /*
         * Transaction and outbox event MUST
         * be committed atomically.
         */
        const transaction =
          await this.repository.withTransaction(
            async (tx) => {
              const repository =
                this.repository.withDatabase(
                  tx,
                );

              /*
               * Check reference uniqueness inside
               * the transaction immediately before
               * creating the transaction.
               */
              const existing =
                await repository
                  .findByClientAndReference(
                    clientId,
                    dto.reference,
                  );

              if (existing) {
                throw new Error(
                  `Transaction reference '${dto.reference}' already exists for this client.`,
                );
              }

              const created =
                await repository
                  .createTransaction({
                    publicId:
                      this.generatePublicId(),

                    client: {
                      connect: {
                        id: clientId,
                      },
                    },

                    clientService: {
                      connect: {
                        id:
                          clientService.id,
                      },
                    },

                    currency: {
                      connect: {
                        id:
                          currency.id,
                      },
                    },

                    transactionType: {
                      connect: {
                        id:
                          transactionType.id,
                      },
                    },

                    status:
                      TransactionStatus.PENDING,

                    reference:
                      dto.reference,

                    amount,

                    ...(dto.description
                      ? {
                        description:
                          dto.description,
                      }
                      : {}),

                    metadata:
                      dto.data as Prisma.InputJsonValue,
                  });

              await repository
                .createOutboxEvent({
                  eventType:
                    PAYMENT_EVENTS.REQUESTED,

                  aggregateType:
                    "Transaction",

                  aggregateId:
                    created.id,

                  queueName:
                    PAYMENT_QUEUE.REQUESTED,

                  payload: {
                    transactionId:
                      created.id,
                  },

                  status:
                    OutboxEventStatus.PENDING,

                  availableAt:
                    new Date(),
                });

              return created;
            },
          );

        this.createdMetric.increment();

        this.logger.info(
          {
            transactionId:
              transaction.id,

            publicId:
              transaction.publicId,

            clientId,

            serviceCode,

            transactionType:
              transactionTypeCode,

            currency:
              currencyCode,
          },
          "Payment transaction created.",
        );

        return {
          id: transaction.publicId,
          status: transaction.status,
        };
      },
    );
  }

  async getStatus(
    clientId: string,
    id: string,
  ): Promise<PaymentResponseDto> {
    return withPromiseSpan(
      "PaymentsService.getStatus",
      async () => {
        const transaction =
          await this.repository.findByClientAndId(
            clientId,
            id,
          );

        if (!transaction) {
          throw new Error(
            `Payment '${id}' was not found.`,
          );
        }

        return {
          id: transaction.id,
          status: transaction.status,
        };
      },
    );
  }

  private validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[],
  ): void {
    const missing =
      requiredFields.filter(
        (field) => {
          const value =
            data[field];

          if (
            value === undefined ||
            value === null
          ) {
            return true;
          }

          if (
            typeof value ===
            "string" &&
            value.trim() === ""
          ) {
            return true;
          }

          return false;
        },
      );

    if (
      missing.length > 0
    ) {
      throw new Error(
        `Missing required payment fields: ${missing.join(", ")}.`,
      );
    }
  }

  private validateAmount(
    value: string,
    limits: {
      minimumAmount?: string;
      maximumAmount?: string;
    },
  ): Prisma.Decimal {
    const normalized =
      value.trim();

    /*
     * Decimal(19,4):
     *
     * - no negative values
     * - no leading zeroes
     * - maximum 4 decimal places
     * - integer values are allowed
     */
    if (
      !/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(
        normalized,
      )
    ) {
      throw new Error(
        "Amount must be a non-negative decimal value with no more than 4 decimal places.",
      );
    }

    let amount: Prisma.Decimal;

    try {
      amount =
        new Prisma.Decimal(
          normalized,
        );
    } catch {
      throw new Error(
        "Amount must be a valid decimal value.",
      );
    }

    if (
      amount.lte(0)
    ) {
      throw new Error(
        "Amount must be greater than zero.",
      );
    }

    if (
      limits.minimumAmount !==
      undefined
    ) {
      const minimum =
        new Prisma.Decimal(
          limits.minimumAmount,
        );

      if (
        amount.lt(minimum)
      ) {
        throw new Error(
          `Amount must be at least ${limits.minimumAmount}.`,
        );
      }
    }

    if (
      limits.maximumAmount !==
      undefined
    ) {
      const maximum =
        new Prisma.Decimal(
          limits.maximumAmount,
        );

      if (
        amount.gt(maximum)
      ) {
        throw new Error(
          `Amount must not exceed ${limits.maximumAmount}.`,
        );
      }
    }

    return amount;
  }

  private generatePublicId(): string {
    return Buffer
      .from(
        this.random.bytes(10),
      )
      .toString("base64url")
      .slice(0, 20);
  }
}