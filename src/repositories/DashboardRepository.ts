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

  async getRoutePerformance(
    clientIds: string[] | undefined,
    period: DashboardDateRange,
  ) {
    return this.execute(
      "SELECT",
      "message_route_attempts",
      async () => {
        const rows =
          await this.db.messageRouteAttempt.groupBy({
            by: [
              "routeId",
              "connectorId",
              "status",
            ],

            where: {
              createdAt: {
                gte: period.start,
                lte: period.end,
              },

              ...(clientIds
                ? {
                  message: {
                    clientId: {
                      in: clientIds,
                    },
                  },
                }
                : {}),
            },

            _count: {
              _all: true,
            },
          });

        if (rows.length === 0) {
          return {
            result: [],
            rowsAffected: 0,
          };
        }

        const routeIds =
          [
            ...new Set(
              rows.map(
                (row) =>
                  row.routeId,
              ),
            ),
          ];

        const connectorIds =
          [
            ...new Set(
              rows.map(
                (row) =>
                  row.connectorId,
              ),
            ),
          ];

        const [
          routes,
          connectors,
        ] = await Promise.all([
          this.db.route.findMany({
            where: {
              id: {
                in: routeIds,
              },
            },

            select: {
              id: true,
              publicId: true,
            },
          }),

          this.db.connector.findMany({
            where: {
              id: {
                in: connectorIds,
              },
            },

            select: {
              id: true,
              name: true,
            },
          }),
        ]);

        const routeById =
          new Map(
            routes.map(
              (route) => [
                route.id,
                route,
              ],
            ),
          );

        const connectorById =
          new Map(
            connectors.map(
              (connector) => [
                connector.id,
                connector,
              ],
            ),
          );

        const result =
          rows.map(
            (row) => {
              const route =
                routeById.get(
                  row.routeId,
                );

              const connector =
                connectorById.get(
                  row.connectorId,
                );

              if (
                !route ||
                !connector
              ) {
                throw new Error(
                  "Route performance references a missing route or connector.",
                );
              }

              return {
                routeId:
                  row.routeId,

                publicId:
                  route.publicId,

                connectorId:
                  row.connectorId,

                connectorName:
                  connector.name,

                status:
                  row.status,

                _count:
                  row._count,
              };
            },
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
        const rows =
          await this.db.floatLedgerEntry.findMany({
            where: clientIds
              ? {
                clientId: {
                  in: clientIds,
                },
              }
              : {},

            select: {
              transactionType: true,
              credits: true,
            },
          });

        return {
          result: rows,
          rowsAffected: rows.length,
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
          rowsAffected: rows.length,
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
          rowsAffected: rows.length,
        };
      },
    );
  }
}