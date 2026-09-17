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
  MessageRouteAttemptStatus,
  MessageStatus,
  SenderIdStatus,
  SmppAccountStatus,
} from "@prisma/client";

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
  DashboardMessageSummary,
  DashboardOperationalSummary,
  DashboardRoutePerformance,
  DashboardStatusBreakdown,
  DashboardTrendPoint,
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
    clientIds: string[] | undefined,
    query: DashboardQueryOptions,
  ): Promise<DashboardData> {
    return withSpan(
      "DashboardService.getDashboard",
      async (span) => {
        this.logger.debug(
          {
            clientIds,
            period: query.period,
          },
          "Retrieving dashboard.",
        );

        span.setAttribute(
          "dashboard.period",
          query.period,
        );

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
            routeRows,
            floatEntries,
            floatBalanceRows,
            operationalRows,
            clientMessageRows,
            clients,
            recentActivity,
          ] = await Promise.all([
            this.dashboard.getMessageStatusCounts(
              clientIds,
              period,
            ),

            this.dashboard.getMessageTrend(
              clientIds,
              period,
            ),

            this.dashboard.getRoutePerformance(
              clientIds,
              period,
            ),

            this.dashboard.getFloatEntries(
              clientIds,
              period,
            ),

            this.dashboard.getFloatBalance(
              clientIds,
            ),

            this.dashboard.getOperationalSummary(
              clientIds,
            ),

            this.dashboard.getClientMessageSummary(
              clientIds,
              period,
            ),

            this.dashboard.getClients(
              clientIds,
            ),

            this.dashboard.getRecentActivity(
              clientIds,
            ),
          ]);

          const messages =
            this.buildMessageSummary(
              messageStatusCounts,
            );

          const messageTrend =
            this.buildMessageTrend(
              messageTrendRows,
              period,
            );

          const statusBreakdown =
            this.buildStatusBreakdown(
              messageStatusCounts,
            );

          const routePerformance =
            this.buildRoutePerformance(
              routeRows,
            );

          const float =
            this.buildFloatSummary(
              floatBalanceRows,
            );

          const floatTrend =
            this.buildFloatTrend(
              floatEntries,
              period,
            );

          const operational =
            this.buildOperationalSummary(
              operationalRows,
            );

          const clientSummaries =
            this.buildClientSummaries(
              clientMessageRows,
              clients,
            );

          this.dashboardViewedCounter.add(1);

          this.logger.debug(
            {
              messages: messages.total,
              clients:
                clientSummaries.length,
            },
            "Dashboard retrieved successfully.",
          );

          return {
            period: {
              start:
                period.start.toISOString(),

              end:
                period.end.toISOString(),

              days:
                period.days,
            },

            messages,

            messageTrend,

            statusBreakdown,

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
              clientIds,
              period: query.period,
            },
            "Failed to retrieve dashboard.",
          );

          throw error;
        }
      },
    );
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

  private buildRoutePerformance(
    rows: Array<{
      routeId: string;

      publicId: string;

      connectorId: string;

      connectorName: string;

      status:
      MessageRouteAttemptStatus;

      _count: {
        _all: number;
      };
    }>,
  ): DashboardRoutePerformance[] {
    const routes =
      new Map<
        string,
        {
          publicId: string;

          connectorName: string;

          attempts: number;

          submitted: number;

          failed: number;
        }
      >();

    for (const row of rows) {
      /*
       * Use the internal IDs only as the aggregation key.
       *
       * They are deliberately not exposed in the dashboard response.
       */
      const key =
        `${row.routeId}:${row.connectorId}`;

      const current =
        routes.get(key) ?? {
          publicId:
            row.publicId,

          connectorName:
            row.connectorName,

          attempts: 0,

          submitted: 0,

          failed: 0,
        };

      const count =
        row._count._all;

      current.attempts +=
        count;

      if (
        row.status ===
        MessageRouteAttemptStatus.SUBMITTED
      ) {
        current.submitted +=
          count;
      }

      if (
        row.status ===
        MessageRouteAttemptStatus.FAILED
      ) {
        current.failed +=
          count;
      }

      routes.set(
        key,
        current,
      );
    }

    return Array.from(
      routes.values(),
    )
      .sort(
        (a, b) =>
          b.attempts -
          a.attempts,
      )
      .map((route) => ({
        publicId:
          route.publicId,

        connectorName:
          route.connectorName,

        attempts:
          route.attempts,

        submitted:
          route.submitted,

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
      }));
  }

  // ==========================================================================
  // Float summary
  //
  // FloatLedgerEntry.credits is a SIGNED value:
  //
  // TOPUP      -> positive
  // DEBIT      -> negative
  // REFUND     -> positive
  // ADJUSTMENT -> signed
  //
  // Therefore the available balance is the sum of all ledger values.
  // ==========================================================================

  private buildFloatSummary(
    rows: Array<{
      transactionType:
      LedgerTransactionType;

      credits: number;
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

    /*
     * credits is already signed in the ledger.
     *
     * Do NOT subtract debits here because DEBIT entries are already
     * stored as negative values.
     */
    const balance =
      topUps +
      debits +
      refunds +
      adjustments;

    return {
      balance,

      /*
       * The float represents SMS credits, not monetary currency.
       *
       * The frontend should present this as "SMS credits" rather than
       * formatting it as GBP/USD/etc.
       */
      currency:
        "SMS_CREDITS",

      topUps,

      debits,

      refunds,

      adjustments,
    };
  }

  // ==========================================================================
  // Float trend
  //
  // Ledger amounts are already signed, so net movement is simply the sum
  // of the transaction amounts.
  // ==========================================================================

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
          /*
           * DEBIT credits are already negative.
           */
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
        status:
        SmppAccountStatus;

        _count: {
          _all: number;
        };
      }>;

      senderIds: Array<{
        status:
        SenderIdStatus;

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