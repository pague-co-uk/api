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
              ledgerEntryId: entry.id,
              publicId: entry.publicId,
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

                if (balance < credits) {
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

                    credits: -credits,

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
              ledgerEntryId: entry.id,
              publicId: entry.publicId,
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
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return withSpan(
      "FloatLedgerService.list",
      async (span) => {
        span.setAttribute(
          "client.id",
          clientId,
        );

        return this.ledger.findByClient(
          clientId,
          options,
        );
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