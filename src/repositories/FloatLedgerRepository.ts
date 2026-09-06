import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  LedgerReferenceType,
  LedgerTransactionType,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class FloatLedgerRepository
  extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new FloatLedgerRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.FloatLedgerEntryCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  /**
   * Creates multiple ledger entries in one database operation.
   *
   * The caller supplies scalar clientId/reference fields directly because
   * Prisma createMany() does not support nested relation connects.
   *
   * Database-generated IDs remain untouched.
   */
  async createMany(
    data: readonly Prisma.FloatLedgerEntryCreateManyInput[],
  ) {
    return this.execute(
      "INSERT",
      "float_ledger_entries",
      async () => {
        if (data.length === 0) {
          return {
            result: {
              count: 0,
            },
            rowsAffected: 0,
          };
        }

        const result =
          await this.db.floatLedgerEntry.createMany({
            data: [...data],
          });

        return {
          result,
          rowsAffected:
            result.count,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    clientId: string,
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findFirst({
            where: {
              id,
              clientId,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly clientId?: string;
      readonly transactionType?: LedgerTransactionType;
      readonly referenceType?: LedgerReferenceType;
      readonly search?: string;
    },
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.FloatLedgerEntryWhereInput = {
          ...(options.clientId !== undefined
            ? {
              clientId:
                options.clientId,
            }
            : {}),

          ...(options.transactionType !== undefined
            ? {
              transactionType:
                options.transactionType,
            }
            : {}),

          ...(options.referenceType !== undefined
            ? {
              referenceType:
                options.referenceType,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  publicId: {
                    contains: search,
                  },
                },
                {
                  referenceId: {
                    contains: search,
                  },
                },
                {
                  description: {
                    contains: search,
                  },
                },
              ],
            }
            : {}),
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.floatLedgerEntry.findMany({
            where,

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },
            },

            orderBy: {
              createdAt: "desc",
            },

            skip,
            take: options.pageSize,
          }),

          this.db.floatLedgerEntry.count({
            where,
          }),
        ]);

        return {
          result: {
            items,
            page: options.page,
            pageSize: options.pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  async findByPublicId(
    clientId: string,
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findFirst({
            where: {
              publicId,
              clientId,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findByClient(
    clientId: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 20;

        const skip =
          (page - 1) * pageSize;

        const [items, total] =
          await Promise.all([
            this.db.floatLedgerEntry.findMany({
              where: {
                clientId,
              },

              orderBy: {
                createdAt: "desc",
              },

              skip,
              take: pageSize,
            }),

            this.db.floatLedgerEntry.count({
              where: {
                clientId,
              },
            }),
          ]);

        return {
          result: {
            items,
            total,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  async sumCreditsByClient(
    clientId: string,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const aggregate =
          await this.db.floatLedgerEntry.aggregate({
            where: {
              clientId,
            },

            _sum: {
              credits: true,
            },
          });

        return {
          result:
            aggregate._sum.credits ?? 0,

          rowsAffected: 1,
        };
      },
    );
  }

  async countByClient(
    clientId: string,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.count({
            where: {
              clientId,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Reference
  // -------------------------------------------------------------------------

  async findByReference(
    clientId: string,
    referenceType: LedgerReferenceType,
    referenceId: string,
    transactionType: LedgerTransactionType,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findFirst({
            where: {
              clientId,
              referenceType,
              referenceId,
              transactionType,
            },
          });

        return {
          result,
          rowsAffected:
            result ? 1 : 0,
        };
      },
    );
  }

  /**
   * Finds existing ledger entries for multiple references in one query.
   *
   * This is used by bulk message debit processing to preserve the
   * per-message idempotency guarantee without performing one SELECT
   * per message.
   */
  async findByReferences(
    clientId: string,
    referenceType: LedgerReferenceType,
    referenceIds: readonly string[],
    transactionType: LedgerTransactionType,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        if (referenceIds.length === 0) {
          return {
            result: [],
            rowsAffected: 0,
          };
        }

        const result =
          await this.db.floatLedgerEntry.findMany({
            where: {
              clientId,

              referenceType,

              transactionType,

              referenceId: {
                in: [...referenceIds],
              },
            },
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }
}