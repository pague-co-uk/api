import { Inject, Injectable } from "@nestjs/common";

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
export class DashboardRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new DashboardRepository(db) as this;
  }

  async getMessageStatusCounts(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const where: Prisma.MessageWhereInput = {
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
          await this.db.message.groupBy({
            by: ["currentStatus"],
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

  async getMessageTrend(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              date: Date;
              sent: bigint;
              delivered: bigint;
              failed: bigint;
              expired: bigint;
            }>
          >(Prisma.sql`
            SELECT
              DATE(submittedAt) AS date,

              COUNT(*) AS sent,

              SUM(
                CASE
                  WHEN currentStatus = 'DELIVERED'
                  THEN 1
                  ELSE 0
                END
              ) AS delivered,

              SUM(
                CASE
                  WHEN currentStatus = 'FAILED'
                  THEN 1
                  ELSE 0
                END
              ) AS failed,

              SUM(
                CASE
                  WHEN currentStatus = 'EXPIRED'
                  THEN 1
                  ELSE 0
                END
              ) AS expired

            FROM messages

            WHERE submittedAt >= ${period.start}
              AND submittedAt <= ${period.end}

              ${clientFilter}

            GROUP BY DATE(submittedAt)

            ORDER BY DATE(submittedAt) ASC
          `);

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  async getHourlyMessageVolume(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              day: number;
              hour: number;
              count: bigint;
            }>
          >(Prisma.sql`
            SELECT
              DAYOFWEEK(submittedAt) AS day,
              HOUR(submittedAt) AS hour,
              COUNT(*) AS count

            FROM messages

            WHERE submittedAt >= ${period.start}
              AND submittedAt <= ${period.end}

              ${clientFilter}

            GROUP BY
              DAYOFWEEK(submittedAt),
              HOUR(submittedAt)

            ORDER BY
              DAYOFWEEK(submittedAt) ASC,
              HOUR(submittedAt) ASC
          `);

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  async getStatusCodeBreakdown(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "message_route_attempts",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
                AND m.clientId IN (
                  ${Prisma.join(clientIds)}
                )
              `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              code: string;
              count: bigint;
            }>
          >(Prisma.sql`
            SELECT
              a.errorCode AS code,
              COUNT(*) AS count

            FROM message_route_attempts a

            INNER JOIN messages m
              ON m.id = a.messageId

            WHERE a.createdAt >= ${period.start}
              AND a.createdAt <= ${period.end}

              AND a.errorCode IS NOT NULL
              AND a.errorCode <> ''

              ${clientFilter}

            GROUP BY
              a.errorCode

            ORDER BY
              COUNT(*) DESC,
              a.errorCode ASC
          `);

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  async countActiveClients(): Promise<number> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const count = await this.db.client.count({
          where: {
            status: "ACTIVE",
          },
        });

        return {
          result: count,
          rowsAffected: count,
        };
      },
    );
  }

  async getRoutePerformance(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "message_route_attempts",
      async () => {
        const clientFilter =
          clientIds?.length
            ? Prisma.sql`
              AND m.clientId IN (
                ${Prisma.join(clientIds)}
              )
            `
            : Prisma.empty;

        const rows =
          await this.db.$queryRaw<
            Array<{
              routeId: string;
              connectorId: string;
              publicId: string;
              connectorName: string;
              attempts: bigint;
              submitted: bigint;
              delivered: bigint;
              failed: bigint;
            }>
          >(Prisma.sql`
          SELECT
            a.routeId,
            a.connectorId,
            r.publicId,
            c.name AS connectorName,

            COUNT(*) AS attempts,

            SUM(
              CASE
                WHEN a.status = 'SUBMITTED'
                THEN 1
                ELSE 0
              END
            ) AS submitted,

            SUM(
              CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM message_status_events mse
                  WHERE mse.attemptId = a.id
                    AND mse.status = 'DELIVERED'
                )
                THEN 1
                ELSE 0
              END
            ) AS delivered,

            SUM(
              CASE
                WHEN a.status = 'FAILED'
                THEN 1
                ELSE 0
              END
            ) AS failed

          FROM message_route_attempts a

          INNER JOIN messages m
            ON m.id = a.messageId

          INNER JOIN routes r
            ON r.id = a.routeId

          INNER JOIN connectors c
            ON c.id = a.connectorId

          WHERE a.createdAt >= ${period.start}
            AND a.createdAt <= ${period.end}

            ${clientFilter}

          GROUP BY
            a.routeId,
            a.connectorId,
            r.publicId,
            c.name

          ORDER BY
            attempts DESC
        `);

        const result =
          rows.map(
            (row) => ({
              routeId:
                row.routeId,

              publicId:
                row.publicId,

              connectorId:
                row.connectorId,

              connectorName:
                row.connectorName,

              attempts:
                Number(row.attempts),

              submitted:
                Number(row.submitted),

              delivered:
                Number(row.delivered),

              failed:
                Number(row.failed),
            }),
          );

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }

  async getFloatEntries(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const rows =
          await this.db.floatLedgerEntry.findMany({
            where: {
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
            },

            select: {
              transactionType: true,
              credits: true,
              createdAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          });

        return {
          result: rows,
          rowsAffected: rows.length,
        };
      },
    );
  }

  async getFloatBalance(
    clientIds: string[] | undefined,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.aggregate({
            where: clientIds
              ? {
                clientId: {
                  in: clientIds,
                },
              }
              : {},

            _sum: {
              credits: true,
            },
          });

        return {
          result: {
            balance:
              result._sum.credits ?? 0,
          },

          rowsAffected: 1,
        };
      },
    );
  }

  async getDashboardClient(
    clientId: string,
  ) {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              id: clientId,
            },

            select: {
              id: true,
              displayName: true,
              companyName: true,
            },
          });

        return {
          result: client,
          rowsAffected:
            client ? 1 : 0,
        };
      },
    );
  }

  async getOperationalSummary(
    clientIds: string[] | undefined,
  ) {
    return this.execute(
      "SELECT",
      "dashboard_operational",
      async () => {
        const clientWhere: Prisma.ClientWhereInput =
          clientIds
            ? {
              id: {
                in: clientIds,
              },
            }
            : {};

        const resourceWhere: Prisma.SmppAccountWhereInput =
          clientIds
            ? {
              clientId: {
                in: clientIds,
              },
            }
            : {};

        const senderWhere: Prisma.SenderIdWhereInput =
          clientIds
            ? {
              clientId: {
                in: clientIds,
              },
            }
            : {};

        const webhookWhere: Prisma.WebhookEndpointWhereInput =
          clientIds
            ? {
              clientId: {
                in: clientIds,
              },
            }
            : {};

        const [
          clients,
          smppAccounts,
          senderIds,
          webhooks,
        ] = await Promise.all([
          this.db.client.groupBy({
            by: ["status"],
            where: clientWhere,
            _count: {
              _all: true,
            },
          }),

          this.db.smppAccount.groupBy({
            by: ["status"],
            where: resourceWhere,
            _count: {
              _all: true,
            },
          }),

          this.db.senderId.groupBy({
            by: ["status"],
            where: senderWhere,
            _count: {
              _all: true,
            },
          }),

          this.db.webhookEndpoint.groupBy({
            by: ["enabled"],
            where: webhookWhere,
            _count: {
              _all: true,
            },
          }),
        ]);

        return {
          result: {
            clients,
            smppAccounts,
            senderIds,
            webhooks,
          },

          rowsAffected:
            clients.length +
            smppAccounts.length +
            senderIds.length +
            webhooks.length,
        };
      },
    );
  }

  async getClientMessageSummary(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const rows =
          await this.db.message.groupBy({
            by: [
              "clientId",
              "currentStatus",
            ],

            where: {
              submittedAt: {
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
            },

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

  async getClients(
    clientIds: string[] | undefined,
  ) {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const rows =
          await this.db.client.findMany({
            where: clientIds
              ? {
                id: {
                  in: clientIds,
                },
              }
              : {},

            select: {
              id: true,
              publicId: true,
              displayName: true,
              companyName: true,
              status: true,
            },

            orderBy: {
              displayName: "asc",
            },
          });

        return {
          result: rows,
          rowsAffected:
            rows.length,
        };
      },
    );
  }

  async getRecentActivity(
    clientIds: string[] | undefined,
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const rows =
          await this.db.auditLog.findMany({
            where: clientIds
              ? {
                clientId: {
                  in: clientIds,
                },
              }
              : {},

            orderBy: {
              createdAt: "desc",
            },

            take: 10,

            select: {
              id: true,
              action: true,
              entityType: true,
              entityId: true,
              clientId: true,
              userId: true,
              createdAt: true,

              client: {
                select: {
                  displayName: true,
                  companyName: true,
                },
              },

              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });

        return {
          result: rows,
          rowsAffected:
            rows.length,
        };
      },
    );
  }
}