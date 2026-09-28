import {
  Injectable,
} from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  ClientStatus,
  LedgerTransactionType,
  MessageStatus,
  SenderIdStatus,
  SmppAccountStatus
} from "@prisma/client";

import type {
  AuthenticatedUser,
} from "../../common/authorization/interfaces/authenticated-user.interface.js";

import {
  DashboardRepository,
} from "../../repositories/DashboardRepository.js";

import type {
  DashboardQueryOptions,
} from "../../repositories/options/dashboard.options.js";

import type {
  DashboardClientSummary,
  DashboardData,
  DashboardFloatSummary,
  DashboardFloatTrendPoint,
  DashboardHourlyVolume,
  DashboardKpiSummary,
  DashboardMessageSummary,
  DashboardOperationalSummary,
  DashboardRoutePerformance,
  DashboardScope,
  DashboardStatusBreakdown,
  DashboardStatusCodeBreakdown,
  DashboardTrendPoint,
  DashboardViewer,
} from "./types/dashboard.types.js";

@Injectable()
export class DashboardService {
  private readonly logger =
    getComponentLogger("DashboardService");

  private readonly dashboardViewedCounter =
    createCounterMetric({
      name: "dashboard.viewed",
      description:
        "Number of dashboard requests.",
    });

  constructor(
    private readonly dashboard:
      DashboardRepository,
  ) { }

  async getDashboard(
    user: AuthenticatedUser,
    query: DashboardQueryOptions,
  ): Promise<DashboardData> {
    return withSpan(
      "DashboardService.getDashboard",
      async (span) => {
        const clientIds =
          this.resolveClientIds(
            user,
          );

        const scope =
          clientIds
            ? "CLIENT"
            : "PLATFORM";

        this.logger.debug(
          {
            userId: user.username,
            clientId:
              user.clientId,
            scope,
            period:
              query.period,
          },
          "Retrieving dashboard.",
        );

        span.setAttribute(
          "dashboard.period",
          query.period,
        );

        span.setAttribute(
          "dashboard.scope",
          scope,
        );

        span.setAttribute(
          "dashboard.user_id",
          user.username,
        );

        if (user.clientId) {
          span.setAttribute(
            "dashboard.client_id",
            user.clientId,
          );
        }

        try {
          const period =
            this.resolvePeriod(
              query.period,
            );

          span.setAttribute(
            "dashboard.days",
            period.days,
          );

          const [
            messageStatusCounts,
            messageTrendRows,
            hourlyVolumeRows,
            statusCodeRows,
            routeRows,
            floatEntries,
            floatBalance,
            operationalRows,
            clientMessageRows,
            clients,
            recentActivity,
            viewerClient,
            activeClients,
          ] = await Promise.all([
            this.dashboard.getMessageStatusCounts(
              clientIds,
              period,
            ),

            this.dashboard.getMessageTrend(
              clientIds,
              period,
            ),

            this.dashboard.getHourlyMessageVolume(
              clientIds,
              period,
            ),

            this.dashboard.getStatusCodeBreakdown(
              clientIds,
              period,
            ),

            this.dashboard.getRoutePerformance(
              clientIds,
              period,
            ),

            scope === "CLIENT"
              ? this.dashboard.getFloatEntries(
                clientIds,
                period,
              )
              : Promise.resolve([]),

            scope === "CLIENT"
              ? this.dashboard.getFloatBalance(
                clientIds,
              )
              : Promise.resolve({
                balance: 0,
              }),

            this.dashboard.getOperationalSummary(
              clientIds,
            ),

            scope === "PLATFORM"
              ? this.dashboard.getClientMessageSummary(
                clientIds,
                period,
              )
              : Promise.resolve([]),

            scope === "PLATFORM"
              ? this.dashboard.getClients(
                clientIds,
              )
              : Promise.resolve([]),

            this.dashboard.getRecentActivity(
              clientIds,
            ),

            user.clientId
              ? this.dashboard.getDashboardClient(
                user.clientId,
              )
              : Promise.resolve(null),

            scope === "PLATFORM"
              ? this.dashboard.countActiveClients()
              : Promise.resolve(0),
          ]);

          const viewer =
            this.buildViewer(
              user,
              scope,
              viewerClient,
            );

          const messages =
            this.buildMessageSummary(
              messageStatusCounts,
            );

          const messageTrend =
            this.buildMessageTrend(
              messageTrendRows,
              period,
            );

          const hourlyVolume =
            this.buildHourlyVolume(
              hourlyVolumeRows,
            );

          const statusBreakdown =
            this.buildStatusBreakdown(
              messageStatusCounts,
            );

          const statusCodeBreakdown =
            this.buildStatusCodeBreakdown(
              statusCodeRows,
            );

          const routePerformance =
            this.buildRoutePerformance(
              routeRows,
            );

          const float =
            this.buildFloatSummary(
              floatBalance.balance,
              floatEntries,
            );

          const floatTrend =
            this.buildFloatTrend(
              floatEntries,
              period,
            );

          const operational =
            this.buildOperationalSummary(
              operationalRows,
              scope,
            );

          const clientSummaries =
            this.buildClientSummaries(
              clientMessageRows,
              clients,
            );

          const kpis =
            this.buildKpis(
              messages,
              scope,
              floatBalance.balance,
              activeClients,
            );

          this.dashboardViewedCounter.add(
            1,
            {
              scope,
            },
          );

          this.logger.debug(
            {
              userId:
                user.username,

              scope,

              clientId:
                user.clientId,

              messages:
                messages.total,

              clients:
                clientSummaries.length,

              activeClients,

              hourlyVolumePoints:
                hourlyVolume.length,

              statusCodeCount:
                statusCodeBreakdown.length,
            },
            "Dashboard retrieved successfully.",
          );

          return {
            viewer,

            period: {
              start:
                period.start.toISOString(),

              end:
                period.end.toISOString(),

              days:
                period.days,
            },

            kpis,

            messages,

            messageTrend,

            hourlyVolume,

            statusBreakdown,

            statusCodeBreakdown,

            routePerformance,

            float,

            floatTrend,

            operational,

            clients:
              clientSummaries,

            recentActivity:
              recentActivity.map(
                (activity) => ({
                  id:
                    activity.id,

                  action:
                    activity.action,

                  entityType:
                    activity.entityType,

                  entityId:
                    activity.entityId,

                  clientId:
                    activity.clientId,

                  clientName:
                    activity.client
                      ? activity.client
                        .displayName ||
                      activity.client
                        .companyName
                      : null,

                  userId:
                    activity.userId,

                  userName:
                    activity.user
                      ? `${activity.user.firstName} ${activity.user.lastName}`
                      : null,

                  createdAt:
                    activity.createdAt,
                }),
              ),
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId:
                user.username,
              clientId:
                user.clientId,
              scope,
              period:
                query.period,
            },
            "Failed to retrieve dashboard.",
          );

          throw error;
        }
      },
    );
  }

  private resolveClientIds(
    user: AuthenticatedUser,
  ): string[] | undefined {
    if (!user.clientId) {
      return undefined;
    }

    return [
      user.clientId,
    ];
  }

  private buildViewer(
    user: AuthenticatedUser,
    scope:
      | "PLATFORM"
      | "CLIENT",
    client: {
      id: string;
      displayName: string;
      companyName: string;
    } | null,
  ): DashboardViewer {
    return {
      userId:
        user.userId,

      scope,

      clientId:
        user.clientId ?? null,

      clientName:
        client
          ? client.displayName ||
          client.companyName
          : null,
    };
  }

  private resolvePeriod(
    period: DashboardQueryOptions["period"],
  ) {
    const end =
      new Date();

    const days =
      period === "7d"
        ? 7
        : period === "90d"
          ? 90
          : 30;

    const start =
      new Date(end);

    start.setHours(
      0,
      0,
      0,
      0,
    );

    start.setDate(
      start.getDate() -
      (days - 1),
    );

    return {
      start,
      end,
      days,
    };
  }

  private buildMessageSummary(
    rows: Array<{
      currentStatus: MessageStatus;

      _count: {
        _all: number;
      };
    }>,
  ): DashboardMessageSummary {
    const counts: Record<
      MessageStatus,
      number
    > = {
      QUEUED: 0,
      ROUTED: 0,
      SUBMITTED: 0,
      DELIVERED: 0,
      FAILED: 0,
      EXPIRED: 0,
    };

    for (const row of rows) {
      counts[row.currentStatus] =
        row._count._all;
    }

    const total =
      Object.values(counts).reduce(
        (sum, value) =>
          sum + value,
        0,
      );

    return {
      total,

      queued:
        counts.QUEUED,

      routed:
        counts.ROUTED,

      submitted:
        counts.SUBMITTED,

      delivered:
        counts.DELIVERED,

      failed:
        counts.FAILED,

      expired:
        counts.EXPIRED,

      deliveryRate:
        total > 0
          ? Number(
            (
              (counts.DELIVERED /
                total) *
              100
            ).toFixed(2),
          )
          : 0,
    };
  }

  private buildMessageTrend(
    rows: Array<{
      date: Date;
      sent: bigint;
      delivered: bigint;
      failed: bigint;
      expired: bigint;
    }>,
    period: {
      start: Date;
      end: Date;
    },
  ): DashboardTrendPoint[] {
    const byDate =
      new Map<
        string,
        DashboardTrendPoint
      >();

    for (const row of rows) {
      const date =
        this.formatDate(
          row.date,
        );

      byDate.set(
        date,
        {
          date,

          sent:
            Number(row.sent),

          delivered:
            Number(row.delivered),

          failed:
            Number(row.failed),

          expired:
            Number(row.expired),
        },
      );
    }

    return this.fillDates(
      period.start,
      period.end,
      (date) =>
        byDate.get(date) ?? {
          date,
          sent: 0,
          delivered: 0,
          failed: 0,
          expired: 0,
        },
    );
  }

  private buildHourlyVolume(
    rows: Array<{
      day: number;
      hour: number;
      count: bigint;
    }>,
  ): DashboardHourlyVolume[] {
    return rows.map(
      (row) => ({
        day:
          row.day,

        hour:
          row.hour,

        count:
          Number(row.count),
      }),
    );
  }

  private buildStatusBreakdown(
    rows: Array<{
      currentStatus: MessageStatus;

      _count: {
        _all: number;
      };
    }>,
  ): DashboardStatusBreakdown[] {
    const total =
      rows.reduce(
        (sum, row) =>
          sum + row._count._all,
        0,
      );

    return [...rows]
      .sort(
        (a, b) =>
          b._count._all -
          a._count._all,
      )
      .map((row) => ({
        status:
          row.currentStatus,

        count:
          row._count._all,

        percentage:
          total > 0
            ? Number(
              (
                (row._count._all /
                  total) *
                100
              ).toFixed(2),
            )
            : 0,
      }));
  }

  private buildStatusCodeBreakdown(
    rows: Array<{
      code: string;
      count: bigint;
    }>,
  ): DashboardStatusCodeBreakdown[] {
    const total =
      rows.reduce(
        (sum, row) =>
          sum + Number(row.count),
        0,
      );

    return rows.map(
      (row) => {
        const count =
          Number(row.count);

        return {
          code:
            row.code,

          label:
            row.code,

          count,

          percentage:
            total > 0
              ? Number(
                (
                  (count /
                    total) *
                  100
                ).toFixed(2),
              )
              : 0,
        };
      },
    );
  }

  private buildKpis(
    messages: DashboardMessageSummary,
    scope: DashboardScope,
    floatBalance: number,
    activeClients: number,
  ): DashboardKpiSummary {
    if (scope === "PLATFORM") {
      return {
        totalMessages: messages.total,
        delivered: messages.delivered,
        failed: messages.failed,
        deliveryRate: messages.deliveryRate,
        fifthMetric: {
          label: "Active Clients",
          value: activeClients,
          formattedValue: activeClients.toLocaleString(),
        },
      };
    }

    return {
      totalMessages: messages.total,
      delivered: messages.delivered,
      failed: messages.failed,
      deliveryRate: messages.deliveryRate,
      fifthMetric: {
        label: "Float Balance",
        value: floatBalance,
        formattedValue: floatBalance.toLocaleString(),
      },
    };
  }

  private buildRoutePerformance(
    rows: Array<{
      routeId: string;

      publicId: string;

      connectorId: string;

      connectorName: string;

      attempts: number;

      submitted: number;

      delivered: number;

      failed: number;
    }>,
  ): DashboardRoutePerformance[] {
    return rows
      .map((route) => ({
        publicId:
          route.publicId,

        connectorName:
          route.connectorName,

        attempts:
          route.attempts,

        submitted:
          route.submitted,

        delivered:
          route.delivered,

        failed:
          route.failed,

        submissionRate:
          route.attempts > 0
            ? Number(
              (
                (route.submitted /
                  route.attempts) *
                100
              ).toFixed(2),
            )
            : 0,

        deliveryRate:
          route.submitted > 0
            ? Number(
              (
                (route.delivered /
                  route.submitted) *
                100
              ).toFixed(2),
            )
            : 0,
      }));
  }

  private buildFloatSummary(
    balance: number,
    rows: Array<{
      transactionType:
      LedgerTransactionType;

      credits: number;

      createdAt: Date;
    }>,
  ): DashboardFloatSummary {
    let topUps = 0;
    let debits = 0;
    let refunds = 0;
    let adjustments = 0;

    for (const row of rows) {
      switch (
      row.transactionType
      ) {
        case LedgerTransactionType.TOPUP:
          topUps +=
            row.credits;
          break;

        case LedgerTransactionType.DEBIT:
          debits +=
            row.credits;
          break;

        case LedgerTransactionType.REFUND:
          refunds +=
            row.credits;
          break;

        case LedgerTransactionType.ADJUSTMENT:
          adjustments +=
            row.credits;
          break;
      }
    }

    return {
      balance,

      currency:
        "SMS_CREDITS",

      topUps,

      debits,

      refunds,

      adjustments,
    };
  }

  private buildFloatTrend(
    rows: Array<{
      transactionType:
      LedgerTransactionType;

      credits: number;

      createdAt: Date;
    }>,
    period: {
      start: Date;
      end: Date;
    },
  ): DashboardFloatTrendPoint[] {
    const byDate =
      new Map<
        string,
        DashboardFloatTrendPoint
      >();

    for (const row of rows) {
      const date =
        this.formatDate(
          row.createdAt,
        );

      const point =
        byDate.get(date) ?? {
          date,

          topUps: 0,

          debits: 0,

          refunds: 0,

          adjustments: 0,

          net: 0,
        };

      switch (
      row.transactionType
      ) {
        case LedgerTransactionType.TOPUP:
          point.topUps +=
            row.credits;

          point.net +=
            row.credits;

          break;

        case LedgerTransactionType.DEBIT:
          point.debits +=
            row.credits;

          point.net +=
            row.credits;

          break;

        case LedgerTransactionType.REFUND:
          point.refunds +=
            row.credits;

          point.net +=
            row.credits;

          break;

        case LedgerTransactionType.ADJUSTMENT:
          point.adjustments +=
            row.credits;

          point.net +=
            row.credits;

          break;
      }

      byDate.set(
        date,
        point,
      );
    }

    return this.fillDates(
      period.start,
      period.end,
      (date) =>
        byDate.get(date) ?? {
          date,
          topUps: 0,
          debits: 0,
          refunds: 0,
          adjustments: 0,
          net: 0,
        },
    );
  }

  private buildOperationalSummary(
    data: {
      clients: Array<{
        status: ClientStatus;
        _count: {
          _all: number;
        };
      }>;

      smppAccounts: Array<{
        status: SmppAccountStatus;
        _count: {
          _all: number;
        };
      }>;

      senderIds: Array<{
        status: SenderIdStatus;
        _count: {
          _all: number;
        };
      }>;

      webhooks: Array<{
        enabled: boolean;
        _count: {
          _all: number;
        };
      }>;
    },
    scope: DashboardScope,
  ): DashboardOperationalSummary {
    const clients = {
      active: 0,
      suspended: 0,
      disabled: 0,
    };

    for (
      const row of data.clients
    ) {
      if (
        row.status ===
        ClientStatus.ACTIVE
      ) {
        clients.active =
          row._count._all;
      }

      if (
        row.status ===
        ClientStatus.SUSPENDED
      ) {
        clients.suspended =
          row._count._all;
      }

      if (
        row.status ===
        ClientStatus.DISABLED
      ) {
        clients.disabled =
          row._count._all;
      }
    }

    const smppAccounts = {
      active: 0,
      suspended: 0,
      disabled: 0,
    };

    for (
      const row of
      data.smppAccounts
    ) {
      if (
        row.status ===
        SmppAccountStatus.ACTIVE
      ) {
        smppAccounts.active =
          row._count._all;
      }

      if (
        row.status ===
        SmppAccountStatus.SUSPENDED
      ) {
        smppAccounts.suspended =
          row._count._all;
      }

      if (
        row.status ===
        SmppAccountStatus.DISABLED
      ) {
        smppAccounts.disabled =
          row._count._all;
      }
    }

    const senderIds = {
      pending: 0,
      approved: 0,
      rejected: 0,
      disabled: 0,
    };

    for (
      const row of
      data.senderIds
    ) {
      if (
        row.status ===
        SenderIdStatus.PENDING
      ) {
        senderIds.pending =
          row._count._all;
      }

      if (
        row.status ===
        SenderIdStatus.APPROVED
      ) {
        senderIds.approved =
          row._count._all;
      }

      if (
        row.status ===
        SenderIdStatus.REJECTED
      ) {
        senderIds.rejected =
          row._count._all;
      }

      if (
        row.status ===
        SenderIdStatus.DISABLED
      ) {
        senderIds.disabled =
          row._count._all;
      }
    }

    const webhooks = {
      active: 0,
      disabled: 0,
    };

    for (
      const row of
      data.webhooks
    ) {
      if (row.enabled) {
        webhooks.active =
          row._count._all;
      } else {
        webhooks.disabled =
          row._count._all;
      }
    }

    return {
      scope,
      clients,
      smppAccounts,
      senderIds,
      webhooks,
    };
  }

  private buildClientSummaries(
    messageRows: Array<{
      clientId: string;

      currentStatus:
      MessageStatus;

      _count: {
        _all: number;
      };
    }>,

    clients: Array<{
      id: string;

      publicId: string;

      displayName: string;

      companyName: string;

      status: ClientStatus;
    }>,
  ): DashboardClientSummary[] {
    const stats =
      new Map<
        string,
        {
          messages: number;

          delivered: number;

          failed: number;
        }
      >();

    for (
      const row of messageRows
    ) {
      const current =
        stats.get(
          row.clientId,
        ) ?? {
          messages: 0,

          delivered: 0,

          failed: 0,
        };

      current.messages +=
        row._count._all;

      if (
        row.currentStatus ===
        MessageStatus.DELIVERED
      ) {
        current.delivered +=
          row._count._all;
      }

      if (
        row.currentStatus ===
        MessageStatus.FAILED
      ) {
        current.failed +=
          row._count._all;
      }

      stats.set(
        row.clientId,
        current,
      );
    }

    return clients
      .map((client) => {
        const current =
          stats.get(
            client.id,
          ) ?? {
            messages: 0,

            delivered: 0,

            failed: 0,
          };

        return {
          clientId:
            client.id,

          publicId:
            client.publicId,

          name:
            client.displayName ||
            client.companyName,

          status:
            client.status,

          messages:
            current.messages,

          delivered:
            current.delivered,

          failed:
            current.failed,

          deliveryRate:
            current.messages > 0
              ? Number(
                (
                  (current.delivered /
                    current.messages) *
                  100
                ).toFixed(2),
              )
              : 0,
        };
      })
      .sort(
        (a, b) =>
          b.messages -
          a.messages,
      );
  }

  private formatDate(
    date: Date,
  ): string {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1,
      ).padStart(2, "0");

    const day =
      String(
        date.getDate(),
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  private fillDates<T>(
    start: Date,
    end: Date,
    factory: (
      date: string,
    ) => T,
  ): T[] {
    const result: T[] = [];

    const cursor =
      new Date(start);

    while (
      cursor <= end
    ) {
      const date =
        this.formatDate(
          cursor,
        );

      result.push(
        factory(date),
      );

      cursor.setDate(
        cursor.getDate() + 1,
      );
    }

    return result;
  }
}