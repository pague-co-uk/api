import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  LedgerReferenceType,
  LedgerTransactionType,
  MessageEncoding,
  MessageRouteAttemptStatus,
  MessageStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import { FloatLedgerReportRow, MessageReportRow, RoutePerformanceReportRow } from "../modules/reports/types/report.types.js";


@Injectable()
export class ReportsRepository
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
    return new ReportsRepository(
      db,
    ) as this;
  }

  // =========================================================================
  // Message report
  // =========================================================================

  async findMessageReport(
    options?: {
      page?: number;
      pageSize?: number;
      clientId?: string;
      search?: string;
      destination?: string;
      senderIdId?: string;
      status?: MessageStatus;
      encoding?: MessageEncoding;
      submittedFrom?: Date;
      submittedTo?: Date;
    },
  ): Promise<Page<MessageReportRow>> {
    return this.execute(
      "SELECT",
      "message_reports",
      async () => {
        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 25;

        const search =
          options?.search?.trim();

        const where: Prisma.MessageWhereInput = {
          ...(options?.clientId
            ? {
              clientId:
                options.clientId,
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
                  destination: {
                    contains: search,
                  },
                },
                {
                  body: {
                    contains: search,
                  },
                },
              ],
            }
            : {}),

          ...(options?.destination
            ? {
              destination: {
                contains:
                  options.destination.trim(),
              },
            }
            : {}),

          ...(options?.senderIdId
            ? {
              senderIdId:
                options.senderIdId,
            }
            : {}),

          ...(options?.status !== undefined
            ? {
              currentStatus:
                options.status,
            }
            : {}),

          ...(options?.encoding !== undefined
            ? {
              encoding:
                options.encoding,
            }
            : {}),

          ...(options?.submittedFrom ||
            options?.submittedTo
            ? {
              submittedAt: {
                ...(options.submittedFrom
                  ? {
                    gte:
                      options.submittedFrom,
                  }
                  : {}),

                ...(options.submittedTo
                  ? {
                    lte:
                      options.submittedTo,
                  }
                  : {}),
              },
            }
            : {}),
        };

        const skip =
          (page - 1) * pageSize;

        const [
          totalItems,
          items,
        ] = await Promise.all([
          this.db.message.count({
            where,
          }),

          this.db.message.findMany({
            where,

            select: {
              publicId: true,
              destination: true,
              encoding: true,
              segmentCount: true,
              currentStatus: true,
              submittedAt: true,
              createdAt: true,

              senderId: {
                select: {
                  sender: true,
                },
              },
            },

            orderBy: {
              submittedAt: "desc",
            },

            skip,
            take: pageSize,
          }),
        ]);

        const result: MessageReportRow[] =
          items.map((item) => ({
            publicId:
              item.publicId,

            destination:
              item.destination,

            sender:
              item.senderId?.sender ??
              null,

            encoding:
              item.encoding,

            segmentCount:
              item.segmentCount,

            status:
              item.currentStatus,

            submittedAt:
              item.submittedAt,

            createdAt:
              item.createdAt,
          }));

        return {
          result: {
            items: result,
            page,
            pageSize,
            totalItems,
          },

          rowsAffected:
            result.length,
        };
      },
    );
  }

  // =========================================================================
  // Route performance report
  // =========================================================================

  async findRoutePerformanceReport(
    options?: {
      page?: number;
      pageSize?: number;
      clientId?: string;
      routeId?: string;
      connectorId?: string;
      status?: MessageRouteAttemptStatus;
      from?: Date;
      to?: Date;
    },
  ): Promise<
    Page<RoutePerformanceReportRow>
  > {
    return this.execute(
      "SELECT",
      "route_performance_reports",
      async () => {
        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 25;

        const where: Prisma.MessageRouteAttemptWhereInput =
        {
          ...(options?.clientId
            ? {
              message: {
                clientId:
                  options.clientId,
              },
            }
            : {}),

          ...(options?.routeId
            ? {
              routeId:
                options.routeId,
            }
            : {}),

          ...(options?.connectorId
            ? {
              connectorId:
                options.connectorId,
            }
            : {}),

          ...(options?.status !== undefined
            ? {
              status:
                options.status,
            }
            : {}),

          ...(options?.from || options?.to
            ? {
              createdAt: {
                ...(options.from
                  ? {
                    gte: options.from,
                  }
                  : {}),

                ...(options.to
                  ? {
                    lte: options.to,
                  }
                  : {}),
              },
            }
            : {}),
        };

        /*
         * Route performance is aggregated by:
         *
         *   route
         *   connector
         *   status
         *
         * MessageRouteAttempt stores routeId and connectorId as scalar
         * foreign keys. The human-readable route public ID and connector
         * name are resolved after aggregation.
         */

        const groups =
          await this.db.messageRouteAttempt.groupBy({
            by: [
              "routeId",
              "connectorId",
              "status",
            ],

            where,

            _count: {
              _all: true,
            },
          });

        const totalItems =
          groups.length;

        if (totalItems === 0) {
          return {
            result: {
              items: [],
              page,
              pageSize,
              totalItems: 0,
            },

            rowsAffected: 0,
          };
        }

        const skip =
          (page - 1) * pageSize;

        /*
         * Sort before pagination so pagination remains deterministic.
         */
        const sorted =
          [...groups].sort(
            (a, b) => {
              const routeCompare =
                a.routeId.localeCompare(
                  b.routeId,
                );

              if (
                routeCompare !== 0
              ) {
                return routeCompare;
              }

              const connectorCompare =
                a.connectorId.localeCompare(
                  b.connectorId,
                );

              if (
                connectorCompare !== 0
              ) {
                return connectorCompare;
              }

              return a.status.localeCompare(
                b.status,
              );
            },
          );

        const paginated =
          sorted.slice(
            skip,
            skip + pageSize,
          );

        const routeIds = [
          ...new Set(
            paginated.map(
              (group) =>
                group.routeId,
            ),
          ),
        ];

        const connectorIds = [
          ...new Set(
            paginated.map(
              (group) =>
                group.connectorId,
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

        const routesById =
          new Map(
            routes.map(
              (route) => [
                route.id,
                route,
              ],
            ),
          );

        const connectorsById =
          new Map(
            connectors.map(
              (connector) => [
                connector.id,
                connector,
              ],
            ),
          );

        const items: RoutePerformanceReportRow[] =
          paginated.map(
            (group) => {
              const route =
                routesById.get(
                  group.routeId,
                );

              const connector =
                connectorsById.get(
                  group.connectorId,
                );

              return {
                publicId:
                  route?.publicId ??
                  group.routeId,

                connectorName:
                  connector?.name ??
                  group.connectorId,

                status:
                  group.status,

                attempts:
                  group._count._all,
              };
            },
          );

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // =========================================================================
  // Float ledger report
  // =========================================================================

  async findFloatLedgerReport(
    options?: {
      page?: number;
      pageSize?: number;
      clientId?: string;
      transactionType?: LedgerTransactionType;
      referenceType?: LedgerReferenceType;
      createdFrom?: Date;
      createdTo?: Date;
    },
  ): Promise<
    Page<FloatLedgerReportRow>
  > {
    return this.execute(
      "SELECT",
      "float_ledger_reports",
      async () => {
        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 25;

        const where: Prisma.FloatLedgerEntryWhereInput =
        {
          ...(options?.clientId
            ? {
              clientId:
                options.clientId,
            }
            : {}),

          ...(options?.transactionType !==
            undefined
            ? {
              transactionType:
                options.transactionType,
            }
            : {}),

          ...(options?.referenceType !==
            undefined
            ? {
              referenceType:
                options.referenceType,
            }
            : {}),

          ...(options?.createdFrom ||
            options?.createdTo
            ? {
              createdAt: {
                ...(options.createdFrom
                  ? {
                    gte:
                      options.createdFrom,
                  }
                  : {}),

                ...(options.createdTo
                  ? {
                    lte:
                      options.createdTo,
                  }
                  : {}),
              },
            }
            : {}),
        };

        const skip =
          (page - 1) * pageSize;

        const [
          totalItems,
          items,
        ] = await Promise.all([
          this.db.floatLedgerEntry.count({
            where,
          }),

          this.db.floatLedgerEntry.findMany({
            where,

            select: {
              publicId: true,
              transactionType: true,
              credits: true,
              referenceType: true,
              referenceId: true,
              description: true,
              createdAt: true,
            },

            orderBy: {
              createdAt: "desc",
            },

            skip,
            take: pageSize,
          }),
        ]);

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  async findMessageReportForExport(options?: {
    clientId?: string;
    search?: string;
    destination?: string;
    senderIdId?: string;
    status?: MessageStatus;
    encoding?: MessageEncoding;
    submittedFrom?: Date;
    submittedTo?: Date;
  }): Promise<MessageReportRow[]> {
    const operation = await this.execute(
      "SELECT",
      "message_reports_export",
      async () => {
        const search = options?.search?.trim();

        const where: Prisma.MessageWhereInput = {
          ...(options?.clientId ? { clientId: options.clientId } : {}),
          ...(search
            ? {
              OR: [
                { publicId: { contains: search } },
                { destination: { contains: search } },
                { body: { contains: search } },
              ],
            }
            : {}),
          ...(options?.destination
            ? { destination: { contains: options.destination.trim() } }
            : {}),
          ...(options?.senderIdId
            ? { senderIdId: options.senderIdId }
            : {}),
          ...(options?.status !== undefined
            ? { currentStatus: options.status }
            : {}),
          ...(options?.encoding !== undefined
            ? { encoding: options.encoding }
            : {}),
          ...(options?.submittedFrom || options?.submittedTo
            ? {
              submittedAt: {
                ...(options.submittedFrom
                  ? { gte: options.submittedFrom }
                  : {}),
                ...(options.submittedTo
                  ? { lte: options.submittedTo }
                  : {}),
              },
            }
            : {}),
        };

        const items = await this.db.message.findMany({
          where,
          select: {
            publicId: true,
            destination: true,
            encoding: true,
            segmentCount: true,
            currentStatus: true,
            submittedAt: true,
            createdAt: true,
            senderId: {
              select: {
                sender: true,
              },
            },
          },
          orderBy: {
            submittedAt: "desc",
          },
        });

        const result: MessageReportRow[] = items.map((item) => ({
          publicId: item.publicId,
          destination: item.destination,
          sender: item.senderId?.sender ?? null,
          encoding: item.encoding,
          segmentCount: item.segmentCount,
          status: item.currentStatus,
          submittedAt: item.submittedAt,
          createdAt: item.createdAt,
        }));

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );

    return operation;
  }

  async findRoutePerformanceReportForExport(options?: {
    clientId?: string;
    routeId?: string;
    connectorId?: string;
    status?: MessageRouteAttemptStatus;
    from?: Date;
    to?: Date;
  }): Promise<RoutePerformanceReportRow[]> {
    const operation = await this.execute(
      "SELECT",
      "route_performance_reports_export",
      async () => {
        const where: Prisma.MessageRouteAttemptWhereInput = {
          ...(options?.clientId
            ? { message: { clientId: options.clientId } }
            : {}),
          ...(options?.routeId ? { routeId: options.routeId } : {}),
          ...(options?.connectorId
            ? { connectorId: options.connectorId }
            : {}),
          ...(options?.status !== undefined
            ? { status: options.status }
            : {}),
          ...(options?.from || options?.to
            ? {
              createdAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
            : {}),
        };

        const groups = await this.db.messageRouteAttempt.groupBy({
          by: ["routeId", "connectorId", "status"],
          where,
          _count: {
            _all: true,
          },
        });

        if (groups.length === 0) {
          return {
            result: [],
            rowsAffected: 0,
          };
        }

        const routeIds = [...new Set(groups.map((group) => group.routeId))];
        const connectorIds = [
          ...new Set(groups.map((group) => group.connectorId)),
        ];

        const [routes, connectors] = await Promise.all([
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

        const routesById = new Map(
          routes.map((route) => [route.id, route]),
        );

        const connectorsById = new Map(
          connectors.map((connector) => [connector.id, connector]),
        );

        const sorted = [...groups].sort((a, b) => {
          const routeCompare = a.routeId.localeCompare(b.routeId);

          if (routeCompare !== 0) {
            return routeCompare;
          }

          const connectorCompare = a.connectorId.localeCompare(
            b.connectorId,
          );

          if (connectorCompare !== 0) {
            return connectorCompare;
          }

          return a.status.localeCompare(b.status);
        });

        const result: RoutePerformanceReportRow[] = sorted.map((group) => {
          const route = routesById.get(group.routeId);
          const connector = connectorsById.get(group.connectorId);

          if (!route) {
            throw new Error(
              `Route ${group.routeId} could not be resolved for report export`,
            );
          }

          if (!connector) {
            throw new Error(
              `Connector ${group.connectorId} could not be resolved for report export`,
            );
          }

          return {
            publicId: route.publicId,
            connectorName: connector.name,
            status: group.status,
            attempts: group._count._all,
          };
        });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );

    return operation;
  }

  async findFloatLedgerReportForExport(options?: {
    clientId?: string;
    transactionType?: LedgerTransactionType;
    referenceType?: LedgerReferenceType;
    createdFrom?: Date;
    createdTo?: Date;
  }): Promise<FloatLedgerReportRow[]> {
    const operation = await this.execute(
      "SELECT",
      "float_ledger_reports_export",
      async () => {
        const where: Prisma.FloatLedgerEntryWhereInput = {
          ...(options?.clientId ? { clientId: options.clientId } : {}),
          ...(options?.transactionType !== undefined
            ? { transactionType: options.transactionType }
            : {}),
          ...(options?.referenceType !== undefined
            ? { referenceType: options.referenceType }
            : {}),
          ...(options?.createdFrom || options?.createdTo
            ? {
              createdAt: {
                ...(options.createdFrom
                  ? { gte: options.createdFrom }
                  : {}),
                ...(options.createdTo
                  ? { lte: options.createdTo }
                  : {}),
              },
            }
            : {}),
        };

        const result = await this.db.floatLedgerEntry.findMany({
          where,
          select: {
            publicId: true,
            transactionType: true,
            credits: true,
            referenceType: true,
            referenceId: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );

    return operation;
  }
}