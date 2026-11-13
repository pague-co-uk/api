import { normalizePayment } from "../normalize-payment.js";
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
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
          throw new BadRequestException(
            `Service '${serviceCode}' is not assigned to this client.`,
          );
        }

        const service =
          clientService.service;

        if (
          service.status !==
          ServiceStatus.ACTIVE
        ) {
          throw new BadRequestException(
            `Service '${serviceCode}' is not active.`,
          );
        }

        if (
          service.category !==
          ServiceCategory.PAYMENTS
        ) {
          throw new BadRequestException(
            `Service '${serviceCode}' is not a payment service.`,
          );
        }

        if (
          clientService.status !==
          ClientServiceStatus.ACTIVE
        ) {
          throw new BadRequestException(
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
          throw new BadRequestException(
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
          throw new BadRequestException(
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
          throw new BadRequestException(
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
          throw new BadRequestException(
            `Currency '${currencyCode}' was not found or is inactive.`,
          );
        }

        /*
         * Validate service-specific fields.
         */
        const normalized = normalizePayment(dto, configuration);

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
                    normalized.reference,
                  );

              if (existing) {
                throw new ConflictException(
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
                      normalized.reference,
                    accountNumber: normalized.accountNumber,
                    country: normalized.country,

                    amount,

                    ...(dto.description
                      ? {
                        description:
                          dto.description,
                      }
                      : {}),

                    metadata:
                      normalized.data as Prisma.InputJsonValue,
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

        this.createdMetric.add(1);

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
          throw new NotFoundException(
            `Payment '${id}' was not found.`,
          );
        }

        const response = transaction.providerResponse;
        const session = response && typeof response === "object" && !Array.isArray(response) ? response.checkout : undefined;
        const checkout = transaction.provider?.code === "LIPAD_STANDARD_CHECKOUT" && session && typeof session === "object" && !Array.isArray(session)
          && typeof session.merchantTransactionId === "string" && session.merchantTransactionId === transaction.publicId
          && typeof session.checkoutReference === "string" && typeof session.redirectUrl === "string"
          && session.redirectUrl.startsWith("https://") && typeof session.expiresAt === "string"
          ? { merchantTransactionId: session.merchantTransactionId, checkoutReference: session.checkoutReference, redirectUrl: session.redirectUrl, expiresAt: session.expiresAt } : undefined;
        return {
          ...(checkout ? { checkout } : {}),
          id: transaction.publicId,
          status: transaction.status,
        };
      },
    );
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
      !/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/.test(
        normalized,
      )
    ) {
      throw new BadRequestException(
        "Amount must be a non-negative decimal value with at most 15 integer digits and 4 decimal places.",
      );
    }

    let amount: Prisma.Decimal;

    try {
      amount =
        new Prisma.Decimal(
          normalized,
        );
    } catch {
      throw new BadRequestException(
        "Amount must be a valid decimal value.",
      );
    }

    if (
      amount.lte(0)
    ) {
      throw new BadRequestException(
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
        throw new BadRequestException(
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
        throw new BadRequestException(
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