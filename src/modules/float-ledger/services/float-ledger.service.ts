import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  LedgerReferenceType,
  LedgerTransactionType,
  Prisma,
} from "@prisma/client";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { ClockService } from "../../../common/services/clock.service.js";
import { RandomGenerator } from "../../../common/services/random.service.js";
import { FloatLedgerRepository } from "../../../repositories/FloatLedgerRepository.js";

export interface MessageFloatDebit {
  readonly messageId: string;
  readonly publicId: string;
  readonly segmentCount: number;
}

@Injectable()
export class FloatLedgerService {
  private readonly logger =
    getComponentLogger("FloatLedgerService");

  constructor(
    private readonly ledger: FloatLedgerRepository,
    private readonly random: RandomGenerator,
    private readonly clock: ClockService,
  ) { }

  // -------------------------------------------------------------------------
  // Top Up
  // -------------------------------------------------------------------------

  async topUp(
    clientId: string,
    credits: number,
    createdById?: string,
    referenceId?: string,
    description?: string,
  ) {
    return withSpan(
      "FloatLedgerService.topUp",
      async (span) => {
        this.validatePositiveCredits(
          credits,
        );

        span.setAttributes({
          "client.id": clientId,
          "float.credits": credits,
          "float.transaction_type":
            LedgerTransactionType.TOPUP,
        });

        try {
          const entry =
            await this.ledger.create({
              publicId:
                this.generatePublicId(),

              client: {
                connect: {
                  id: clientId,
                },
              },

              ...(createdById
                ? {
                  createdBy: {
                    connect: {
                      id: createdById,
                    },
                  },
                }
                : {}),

              transactionType:
                LedgerTransactionType.TOPUP,

              credits,

              referenceType:
                LedgerReferenceType.ADMIN,

              referenceId,

              description,
            });

          this.logger.info(
            {
              ledgerEntryId:
                entry.id,

              publicId:
                entry.publicId,

              clientId,

              credits,
            },
            "Float top-up recorded.",
          );

          return entry;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId,
              credits,
            },
            "Failed to record float top-up.",
          );

          throw error;
        }
      },
    );
  }

  async listPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly clientId?: string;
      readonly transactionType?: LedgerTransactionType;
      readonly referenceType?: LedgerReferenceType;
      readonly search?: string;
    },
  ) {
    return withSpan(
      "FloatLedgerService.listPlatform",
      async (span) => {
        span.setAttributes({
          "float.page": options.page,
          "float.page_size": options.pageSize,

          ...(options.clientId
            ? {
              "client.id": options.clientId,
            }
            : {}),
        });

        try {
          const result =
            await this.ledger.findManyPlatform(
              options,
            );

          const totalPages =
            result.totalItems === 0
              ? 0
              : Math.ceil(
                result.totalItems /
                result.pageSize,
              );

          span.setAttributes({
            "float.total_items":
              result.totalItems,

            "float.total_pages":
              totalPages,
          });

          this.logger.info(
            {
              page: result.page,
              pageSize: result.pageSize,
              totalItems: result.totalItems,
              totalPages,
              clientId: options.clientId,
            },
            "Platform float ledger retrieved.",
          );

          return {
            ...result,
            totalPages,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              page: options.page,
              pageSize: options.pageSize,
              clientId: options.clientId,
            },
            "Failed to retrieve platform float ledger.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Debit
  // -------------------------------------------------------------------------

  async debit(
    clientId: string,
    credits: number,
    referenceType: LedgerReferenceType,
    referenceId: string,
    description?: string,
  ) {
    return withSpan(
      "FloatLedgerService.debit",
      async (span) => {
        this.validatePositiveCredits(
          credits,
        );

        span.setAttributes({
          "client.id": clientId,

          "float.credits": credits,

          "float.transaction_type":
            LedgerTransactionType.DEBIT,

          "float.reference_type":
            referenceType,

          "float.reference_id":
            referenceId,
        });

        try {
          const entry =
            await this.ledger.withTransaction(
              async (tx) => {
                const ledger =
                  this.ledger.withDatabase(tx);

                // -----------------------------------------------------------
                // Idempotency
                // -----------------------------------------------------------

                const existing =
                  await ledger.findByReference(
                    clientId,
                    referenceType,
                    referenceId,
                    LedgerTransactionType.DEBIT,
                  );

                if (existing) {
                  span.setAttribute(
                    "float.idempotent",
                    true,
                  );

                  return existing;
                }

                // -----------------------------------------------------------
                // Balance
                // -----------------------------------------------------------

                const balance =
                  await ledger.sumCreditsByClient(
                    clientId,
                  );

                span.setAttribute(
                  "float.balance.before",
                  balance,
                );

                if (
                  balance < credits
                ) {
                  throw new BadRequestException(
                    "Insufficient float balance.",
                  );
                }

                // -----------------------------------------------------------
                // Create debit
                // -----------------------------------------------------------

                const entry =
                  await ledger.create({
                    publicId:
                      this.generatePublicId(),

                    client: {
                      connect: {
                        id: clientId,
                      },
                    },

                    transactionType:
                      LedgerTransactionType.DEBIT,

                    credits:
                      -credits,

                    referenceType,

                    referenceId,

                    description,
                  });

                span.setAttribute(
                  "float.balance.after",
                  balance - credits,
                );

                return entry;
              },
            );

          this.logger.info(
            {
              ledgerEntryId:
                entry.id,

              publicId:
                entry.publicId,

              clientId,

              credits,

              referenceType,

              referenceId,
            },
            "Float debit recorded.",
          );

          return entry;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              credits,

              referenceType,

              referenceId,
            },
            "Failed to record float debit.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Message Debits
  // -------------------------------------------------------------------------

  /**
   * Debits float for multiple messages in one transaction.
   *
   * Each message retains its own MESSAGE reference so that a failed or
   * expired message can later be refunded independently.
   *
   * The operation performs:
   *
   *   1. One idempotency lookup for all messages
   *   2. One balance calculation
   *   3. One bulk INSERT for all required debit entries
   *
   * The caller normally invokes this inside the existing MessageService
   * transaction. Therefore no additional transaction is opened here.
   */
  async debitMessages(
    clientId: string,
    messages: readonly MessageFloatDebit[],
  ) {
    return withSpan(
      "FloatLedgerService.debitMessages",
      async (span) => {
        if (messages.length === 0) {
          return [];
        }

        const totalCredits =
          messages.reduce(
            (total, message) =>
              total +
              message.segmentCount,
            0,
          );

        this.validatePositiveCredits(
          totalCredits,
        );

        span.setAttributes({
          "client.id":
            clientId,

          "float.message_count":
            messages.length,

          "float.credits":
            totalCredits,

          "float.transaction_type":
            LedgerTransactionType.DEBIT,
        });

        try {
          /*
           * This method is deliberately transaction-neutral.
           *
           * MessageService.create() already opened the transaction because
           * message creation, float debit, status history and outbox must
           * commit or roll back together.
           *
           * Because FloatLedgerService.withDatabase(tx) is used there,
           * this.ledger is already transaction-bound.
           */
          const existing =
            await this.ledger.findByReferences(
              clientId,

              LedgerReferenceType.MESSAGE,

              messages.map(
                (message) =>
                  message.messageId,
              ),

              LedgerTransactionType.DEBIT,
            );

          const existingReferences =
            new Set(
              existing.map(
                (entry) =>
                  entry.referenceId,
              ),
            );

          const pending =
            messages.filter(
              (message) =>
                !existingReferences.has(
                  message.messageId,
                ),
            );

          // ---------------------------------------------------------------
          // Idempotency
          // ---------------------------------------------------------------

          if (
            pending.length === 0
          ) {
            span.setAttribute(
              "float.idempotent",
              true,
            );

            return existing;
          }

          const pendingCredits =
            pending.reduce(
              (total, message) =>
                total +
                message.segmentCount,
              0,
            );

          // ---------------------------------------------------------------
          // Balance
          // ---------------------------------------------------------------

          const balance =
            await this.ledger.sumCreditsByClient(
              clientId,
            );

          span.setAttribute(
            "float.balance.before",
            balance,
          );

          if (
            balance <
            pendingCredits
          ) {
            throw new BadRequestException(
              "Insufficient float balance.",
            );
          }

          // ---------------------------------------------------------------
          // Create debit entries
          // ---------------------------------------------------------------

          const entries =
            pending.map(
              (message) => ({
                publicId:
                  this.generatePublicId(),

                clientId,

                transactionType:
                  LedgerTransactionType.DEBIT,

                credits:
                  -message.segmentCount,

                referenceType:
                  LedgerReferenceType.MESSAGE,

                referenceId:
                  message.messageId,

                description:
                  `Message submission: ${message.publicId}`,
              }),
            );

          await this.ledger.createMany(
            entries,
          );

          span.setAttribute(
            "float.balance.after",
            balance -
            pendingCredits,
          );

          this.logger.info(
            {
              clientId,

              messageCount:
                messages.length,

              debitedCount:
                pending.length,

              idempotentCount:
                existing.length,

              credits:
                pendingCredits,
            },
            "Message float debits recorded.",
          );

          /*
           * We don't need to perform another SELECT here.
           *
           * The caller only needs confirmation that the debit succeeded.
           * Database-generated ledger IDs are intentionally left under
           * database control.
           */
          return entries;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              messageCount:
                messages.length,

              totalCredits,
            },
            "Failed to record message float debits.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Refund
  // -------------------------------------------------------------------------

  async refund(
    clientId: string,
    credits: number,
    referenceType: LedgerReferenceType,
    referenceId: string,
    description?: string,
  ) {
    return withSpan(
      "FloatLedgerService.refund",
      async (span) => {
        this.validatePositiveCredits(
          credits,
        );

        span.setAttributes({
          "client.id": clientId,

          "float.credits": credits,

          "float.transaction_type":
            LedgerTransactionType.REFUND,

          "float.reference_type":
            referenceType,

          "float.reference_id":
            referenceId,
        });

        try {
          const entry =
            await this.ledger.withTransaction(
              async (tx) => {
                const ledger =
                  this.ledger.withDatabase(tx);

                // -----------------------------------------------------------
                // Idempotency
                // -----------------------------------------------------------

                const existing =
                  await ledger.findByReference(
                    clientId,
                    referenceType,
                    referenceId,
                    LedgerTransactionType.REFUND,
                  );

                if (existing) {
                  span.setAttribute(
                    "float.idempotent",
                    true,
                  );

                  return existing;
                }

                // -----------------------------------------------------------
                // Create refund
                // -----------------------------------------------------------

                return ledger.create({
                  publicId:
                    this.generatePublicId(),

                  client: {
                    connect: {
                      id: clientId,
                    },
                  },

                  transactionType:
                    LedgerTransactionType.REFUND,

                  credits,

                  referenceType,

                  referenceId,

                  description,
                });
              },
            );

          this.logger.info(
            {
              ledgerEntryId:
                entry.id,

              publicId:
                entry.publicId,

              clientId,

              credits,

              referenceType,

              referenceId,
            },
            "Float refund recorded.",
          );

          return entry;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              credits,

              referenceType,

              referenceId,
            },
            "Failed to record float refund.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Adjustment
  // -------------------------------------------------------------------------

  async adjust(
    clientId: string,
    credits: number,
    createdById: string,
    description: string,
    referenceId?: string,
  ) {
    return withSpan(
      "FloatLedgerService.adjust",
      async (span) => {
        if (credits === 0) {
          throw new BadRequestException(
            "Adjustment credits cannot be zero.",
          );
        }

        span.setAttributes({
          "client.id": clientId,

          "float.credits": credits,

          "float.transaction_type":
            LedgerTransactionType.ADJUSTMENT,
        });

        try {
          const entry =
            await this.ledger.create({
              publicId:
                this.generatePublicId(),

              client: {
                connect: {
                  id: clientId,
                },
              },

              createdBy: {
                connect: {
                  id: createdById,
                },
              },

              transactionType:
                LedgerTransactionType.ADJUSTMENT,

              credits,

              referenceType:
                LedgerReferenceType.ADMIN,

              referenceId,

              description,
            });

          this.logger.info(
            {
              ledgerEntryId:
                entry.id,

              publicId:
                entry.publicId,

              clientId,

              credits,

              createdById,
            },
            "Float adjustment recorded.",
          );

          return entry;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              credits,

              createdById,
            },
            "Failed to record float adjustment.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Balance
  // -------------------------------------------------------------------------

  async getBalance(
    clientId: string,
  ): Promise<number> {
    return withSpan(
      "FloatLedgerService.getBalance",
      async (span) => {
        span.setAttribute(
          "client.id",
          clientId,
        );

        const balance =
          await this.ledger.sumCreditsByClient(
            clientId,
          );

        span.setAttribute(
          "float.balance",
          balance,
        );

        return balance;
      },
    );
  }

  // -------------------------------------------------------------------------
  // List
  // -------------------------------------------------------------------------

  async list(
    clientId: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return withSpan(
      "FloatLedgerService.list",
      async (span) => {
        span.setAttribute(
          "client.id",
          clientId,
        );

        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 20;

        const { items, total } =
          await this.ledger.findByClient(
            clientId,
            {
              page,
              pageSize,
            },
          );

        const totalPages =
          total === 0
            ? 0
            : Math.ceil(
              total / pageSize,
            );

        return {
          items,

          meta: {
            page,
            pageSize,
            total,
            totalPages,
          },
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Find
  // -------------------------------------------------------------------------

  async findById(
    clientId: string,
    id: string,
  ) {
    return this.ledger.findById(
      clientId,
      id,
    );
  }

  async findByPublicId(
    clientId: string,
    publicId: string,
  ) {
    return this.ledger.findByPublicId(
      clientId,
      publicId,
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new FloatLedgerService(
      this.ledger.withDatabase(db),
      this.random,
      this.clock,
    ) as this;
  }

  private validatePositiveCredits(
    credits: number,
  ): void {
    if (
      !Number.isInteger(credits) ||
      credits <= 0
    ) {
      throw new BadRequestException(
        "Credits must be a positive integer.",
      );
    }
  }

  private generatePublicId(): string {
    return this.random
      .bytes(10)
      .toString("base64url")
      .slice(0, 20);
  }
}