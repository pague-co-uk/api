import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import {
  DATABASE,
} from "../database/database.constants.js";

import {
  DatabaseRepository,
} from "../database/database.repository.js";

import type {
  DashboardDateRange,
} from "./options/dashboard.options.js";

@Injectable()
export class PaymentDashboardRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new PaymentDashboardRepository(db) as this;
  }

  /**
   * Returns transaction counts grouped by status.
   */
  async getTransactionStatusCounts(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const where: Prisma.TransactionWhereInput = {
          createdAt: {
            gte: period.start,
            lte: period.end,
          },

          ...(clientIds
            ? {
              clientId: {
                in: clientIds,
              },
            }
            : {}),
        };

        const rows =
          await this.db.transaction.groupBy({
            by: ["status"],
            where,
            _count: {
              _all: true,
            },
          });

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  /**
   * Returns daily transaction counts for the selected period.
   *
   * Amounts are deliberately not included here because transactions
   * may exist in multiple currencies.
   */
  async getTransactionTrend(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND t.clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              date: Date;
              total: bigint;
              successful: bigint;
              failed: bigint;
            }>
          >(
            Prisma.sql`
              SELECT
                DATE(t.createdAt) AS date,
                COUNT(*) AS total,
                SUM(
                  CASE
                    WHEN t.status = 'SUCCESS'
                    THEN 1
                    ELSE 0
                  END
                ) AS successful,
                SUM(
                  CASE
                    WHEN t.status IN (
                      'FAILED',
                      'REVERSED',
                      'CANCELLED'
                    )
                    THEN 1
                    ELSE 0
                  END
                ) AS failed
              FROM transactions t
              WHERE
                t.createdAt >= ${period.start}
                AND t.createdAt <= ${period.end}
                ${clientFilter}
              GROUP BY DATE(t.createdAt)
              ORDER BY DATE(t.createdAt) ASC
            `,
          );

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  /**
   * Returns transaction volume grouped by currency.
   *
   * Amounts are kept separate by currency so that values from
   * different currencies are never incorrectly summed together.
   */
  async getCurrencyVolume(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND t.clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              currencyId: string;
              currencyCode: string;
              currencyName: string;
              currencySymbol: string | null;
              transactionCount: bigint;
              totalAmount: Prisma.Decimal;
            }>
          >(
            Prisma.sql`
              SELECT
                t.currencyId AS currencyId,
                c.code AS currencyCode,
                c.name AS currencyName,
                c.symbol AS currencySymbol,
                COUNT(*) AS transactionCount,
                COALESCE(
                  SUM(t.amount),
                  0
                ) AS totalAmount
              FROM transactions t
              INNER JOIN currencies c
                ON c.id = t.currencyId
              WHERE
                t.createdAt >= ${period.start}
                AND t.createdAt <= ${period.end}
                ${clientFilter}
              GROUP BY
                t.currencyId,
                c.code,
                c.name,
                c.symbol
              ORDER BY
                totalAmount DESC
            `,
          );

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  /**
   * Returns payment-provider performance for the selected period.
   *
   * Transactions without a provider are retained under the
   * "Unassigned" bucket so that dashboard totals remain explainable.
   */
  async getProviderPerformance(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND t.clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              providerId: string | null;
              providerCode: string | null;
              providerName: string | null;
              transactionCount: bigint;
              successful: bigint;
              failed: bigint;
            }>
          >(
            Prisma.sql`
              SELECT
                t.providerId AS providerId,
                p.code AS providerCode,
                p.name AS providerName,
                COUNT(*) AS transactionCount,
                SUM(
                  CASE
                    WHEN t.status = 'SUCCESS'
                    THEN 1
                    ELSE 0
                  END
                ) AS successful,
                SUM(
                  CASE
                    WHEN t.status IN (
                      'FAILED',
                      'REVERSED',
                      'CANCELLED'
                    )
                    THEN 1
                    ELSE 0
                  END
                ) AS failed
              FROM transactions t
              LEFT JOIN payment_providers p
                ON p.id = t.providerId
              WHERE
                t.createdAt >= ${period.start}
                AND t.createdAt <= ${period.end}
                ${clientFilter}
              GROUP BY
                t.providerId,
                p.code,
                p.name
              ORDER BY
                transactionCount DESC
            `,
          );

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  /**
   * Returns transaction counts grouped by transaction type.
   */
  async getTransactionTypeBreakdown(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND t.clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              transactionTypeId: string;
              transactionTypeCode: string;
              transactionTypeName: string;
              transactionCount: bigint;
              successful: bigint;
              failed: bigint;
            }>
          >(
            Prisma.sql`
              SELECT
                t.transactionTypeId AS transactionTypeId,
                tt.code AS transactionTypeCode,
                tt.name AS transactionTypeName,
                COUNT(*) AS transactionCount,
                SUM(
                  CASE
                    WHEN t.status = 'SUCCESS'
                    THEN 1
                    ELSE 0
                  END
                ) AS successful,
                SUM(
                  CASE
                    WHEN t.status IN (
                      'FAILED',
                      'REVERSED',
                      'CANCELLED'
                    )
                    THEN 1
                    ELSE 0
                  END
                ) AS failed
              FROM transactions t
              INNER JOIN transaction_types tt
                ON tt.id = t.transactionTypeId
              WHERE
                t.createdAt >= ${period.start}
                AND t.createdAt <= ${period.end}
                ${clientFilter}
              GROUP BY
                t.transactionTypeId,
                tt.code,
                tt.name
              ORDER BY
                transactionCount DESC
            `,
          );

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  /**
   * Returns the most recent transactions for the dashboard.
   */
  async getRecentTransactions(
    clientIds: string[] | undefined,
    limit = 10,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const where: Prisma.TransactionWhereInput = {
          ...(clientIds
            ? {
              clientId: {
                in: clientIds,
              },
            }
            : {}),
        };

        const rows =
          await this.db.transaction.findMany({
            where,

            orderBy: {
              createdAt: "desc",
            },

            take: limit,

            include: {
              client: true,

              clientService: {
                include: {
                  service: true,
                },
              },

              provider: true,

              providerService: {
                include: {
                  service: true,
                },
              },

              currency: true,

              transactionType: true,
            },
          });

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }
}