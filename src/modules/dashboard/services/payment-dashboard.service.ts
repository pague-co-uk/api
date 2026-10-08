import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import type { TransactionStatus } from "@prisma/client";

import type {
  DashboardScope,
} from "../types/dashboard.types.js";

import { AuthenticatedUser } from "../../../common/authorization/interfaces/index.js";
import { AppConfigService } from "../../../config/config.service.js";
import { DashboardQueryOptions } from "../../../repositories/options/dashboard.options.js";
import { PaymentDashboardRepository } from "../../../repositories/PaymentDashboardRepository.js";

import type {
  PaymentCurrencyVolume,
  PaymentDashboardData,
  PaymentDashboardSummary,
  PaymentDashboardTransaction,
  PaymentDashboardViewer,
  PaymentProviderPerformance,
  PaymentStatusBreakdown,
  PaymentTransactionTrendPoint,
  PaymentTransactionTypeBreakdown,
} from "../types/payment-dashboard.types.js";

@Injectable()
export class PaymentDashboardService {
  private readonly logger =
    getComponentLogger("PaymentDashboardService");

  private readonly dashboardViewedCounter =
    createCounterMetric({
      name: "payment_dashboard.viewed",
      description:
        "Number of payment dashboard requests.",
    });

  constructor(
    private readonly dashboard:
      PaymentDashboardRepository,

    private readonly config:
      AppConfigService,
  ) { }

  async getDashboard(
    user: AuthenticatedUser,
    query: DashboardQueryOptions,
  ): Promise<PaymentDashboardData> {
    return withSpan(
      "PaymentDashboardService.getDashboard",
      async (span) => {
        const scope =
          this.resolveScope(user);

        const clientIds =
          this.resolveClientIds(
            user,
            scope,
          );

        this.logger.debug(
          {
            userId: user.username,
            clientId: user.clientId,
            platformClient:
              this.config.app.platformClient,
            scope,
            period: query.period,
          },
          "Retrieving payment dashboard.",
        );

        span.setAttribute(
          "payment_dashboard.period",
          query.period,
        );

        span.setAttribute(
          "payment_dashboard.scope",
          scope,
        );

        span.setAttribute(
          "payment_dashboard.user_id",
          user.username,
        );

        if (user.clientId) {
          span.setAttribute(
            "payment_dashboard.client_id",
            user.clientId,
          );
        }

        try {
          const period =
            this.resolvePeriod(
              query.period,
            );

          span.setAttribute(
            "payment_dashboard.days",
            period.days,
          );

          const [
            statusRows,
            trendRows,
            currencyRows,
            providerRows,
            transactionTypeRows,
            recentTransactions,
          ] = await Promise.all([
            this.dashboard.getTransactionStatusCounts(
              clientIds,
              period,
            ),

            this.dashboard.getTransactionTrend(
              clientIds,
              period,
            ),

            this.dashboard.getCurrencyVolume(
              clientIds,
              period,
            ),

            this.dashboard.getProviderPerformance(
              clientIds,
              period,
            ),

            this.dashboard.getTransactionTypeBreakdown(
              clientIds,
              period,
            ),

            this.dashboard.getRecentTransactions(
              clientIds,
              10,
            ),
          ]);

          const summary =
            this.buildSummary(
              statusRows,
            );

          const transactionTrend =
            this.buildTransactionTrend(
              trendRows,
              period.start,
              period.days,
            );

          const statusBreakdown =
            this.buildStatusBreakdown(
              statusRows,
              summary.total,
            );

          const currencyVolume =
            this.buildCurrencyVolume(
              currencyRows,
            );

          const providerPerformance =
            this.buildProviderPerformance(
              providerRows,
            );

          const transactionTypes =
            this.buildTransactionTypes(
              transactionTypeRows,
            );

          const recent =
            recentTransactions.map(
              (transaction) =>
                this.mapRecentTransaction(
                  transaction,
                ),
            );

          const viewer =
            this.buildViewer(
              user,
              scope,
            );

          this.dashboardViewedCounter.add(
            1,
            {
              scope,
            },
          );

          this.logger.debug(
            {
              userId: user.username,
              clientId: user.clientId,
              scope,
              transactions: summary.total,
              providers:
                providerPerformance.length,
              currencies:
                currencyVolume.length,
              transactionTypes:
                transactionTypes.length,
            },
            "Payment dashboard retrieved successfully.",
          );

          return {
            viewer,

            period: {
              start:
                period.start.toISOString(),
              end:
                period.end.toISOString(),
              days: period.days,
            },

            summary,

            transactionTrend,

            statusBreakdown,

            currencyVolume,

            providerPerformance,

            transactionTypes,

            recentTransactions: recent,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              errorName:
                error instanceof Error
                  ? error.name
                  : typeof error,

              errorMessage:
                error instanceof Error
                  ? error.message
                  : String(error),

              errorStack:
                error instanceof Error
                  ? error.stack
                  : undefined,

              userId: user.username,
              clientId: user.clientId,
              scope,
              period: query.period,
            },
            "Failed to retrieve payment dashboard.",
          );

          throw error;
        }
      },
    );
  }

  private resolveScope(
    user: AuthenticatedUser,
  ): DashboardScope {
    return user.clientId ===
      this.config.app.platformClient
      ? "PLATFORM"
      : "CLIENT";
  }

  private resolveClientIds(
    user: AuthenticatedUser,
    scope: DashboardScope,
  ): string[] | undefined {
    if (scope === "PLATFORM") {
      return undefined;
    }

    if (!user.clientId) {
      return [];
    }

    return [user.clientId];
  }

  private buildViewer(
    user: AuthenticatedUser,
    scope: DashboardScope,
  ): PaymentDashboardViewer {
    return {
      userId: user.userId,
      scope,
      clientId: user.clientId ?? null,
      clientName: null,
    };
  }

  private resolvePeriod(
    period: DashboardQueryOptions["period"],
  ) {
    const end = new Date();

    const days =
      period === "7d"
        ? 7
        : period === "90d"
          ? 90
          : 30;

    const start = new Date(end);

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

  private buildSummary(
    rows: Array<{
      status: TransactionStatus;
      _count: {
        _all: number;
      };
    }>,
  ): PaymentDashboardSummary {
    const counts: Record<
      TransactionStatus,
      number
    > = {
      PENDING: 0,
      PROCESSING: 0,
      SUCCESS: 0,
      FAILED: 0,
      REVERSED: 0,
      CANCELLED: 0,
    };

    for (const row of rows) {
      counts[row.status] =
        row._count._all;
    }

    const total =
      Object.values(counts).reduce(
        (sum, value) =>
          sum + value,
        0,
      );

    const successRate =
      total > 0
        ? this.roundPercentage(
          (counts.SUCCESS / total) * 100,
        )
        : 0;

    return {
      total,
      successful: counts.SUCCESS,
      failed: counts.FAILED,
      processing: counts.PROCESSING,
      pending: counts.PENDING,
      reversed: counts.REVERSED,
      cancelled: counts.CANCELLED,
      successRate,
    };
  }

  private buildTransactionTrend(
    rows: Array<{
      date: Date;
      total: bigint;
      successful: bigint;
      failed: bigint;
    }>,
    start: Date,
    days: number,
  ): PaymentTransactionTrendPoint[] {
    const rowsByDate = new Map<
      string,
      {
        total: number;
        successful: number;
        failed: number;
      }
    >();

    for (const row of rows) {
      const dateKey =
        this.toDateKey(row.date);

      rowsByDate.set(
        dateKey,
        {
          total: Number(row.total),
          successful: Number(
            row.successful,
          ),
          failed: Number(row.failed),
        },
      );
    }

    const result: PaymentTransactionTrendPoint[] =
      [];

    const current = new Date(start);

    current.setHours(
      0,
      0,
      0,
      0,
    );

    for (let index = 0; index < days; index += 1) {
      const dateKey =
        this.toDateKey(current);

      const values =
        rowsByDate.get(dateKey);

      result.push({
        date:
          new Date(current).toISOString(),

        total:
          values?.total ?? 0,

        successful:
          values?.successful ?? 0,

        failed:
          values?.failed ?? 0,
      });

      current.setDate(
        current.getDate() + 1,
      );
    }

    return result;
  }

  private buildStatusBreakdown(
    rows: Array<{
      status: TransactionStatus;
      _count: {
        _all: number;
      };
    }>,
    total: number,
  ): PaymentStatusBreakdown[] {
    return rows
      .map((row) => {
        const count =
          row._count._all;

        return {
          status: row.status,
          count,

          percentage:
            total > 0
              ? this.roundPercentage(
                (count / total) * 100,
              )
              : 0,
        };
      })
      .sort(
        (a, b) =>
          b.count - a.count,
      );
  }

  private buildCurrencyVolume(
    rows: Array<{
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      currencySymbol: string | null;
      transactionCount: bigint;
      totalAmount: {
        toString(): string;
      };
    }>,
  ): PaymentCurrencyVolume[] {
    return rows.map((row) => ({
      currencyId:
        row.currencyId,

      currencyCode:
        row.currencyCode,

      currencyName:
        row.currencyName,

      currencySymbol:
        row.currencySymbol,

      transactionCount:
        Number(
          row.transactionCount,
        ),

      totalAmount:
        row.totalAmount.toString(),
    }));
  }

  private buildProviderPerformance(
    rows: Array<{
      providerId: string | null;
      providerCode: string | null;
      providerName: string | null;
      transactionCount: bigint;
      successful: bigint;
      failed: bigint;
    }>,
  ): PaymentProviderPerformance[] {
    return rows.map((row) => {
      const transactionCount =
        Number(
          row.transactionCount,
        );

      const successful =
        Number(row.successful);

      const failed =
        Number(row.failed);

      return {
        providerId:
          row.providerId,

        providerCode:
          row.providerCode,

        providerName:
          row.providerName,

        transactionCount,

        successful,

        failed,

        successRate:
          transactionCount > 0
            ? this.roundPercentage(
              (successful /
                transactionCount) *
              100,
            )
            : 0,
      };
    });
  }

  private buildTransactionTypes(
    rows: Array<{
      transactionTypeId: string;
      transactionTypeCode: string;
      transactionTypeName: string;
      transactionCount: bigint;
      successful: bigint;
      failed: bigint;
    }>,
  ): PaymentTransactionTypeBreakdown[] {
    return rows.map((row) => {
      const transactionCount =
        Number(
          row.transactionCount,
        );

      const successful =
        Number(row.successful);

      const failed =
        Number(row.failed);

      return {
        transactionTypeId:
          row.transactionTypeId,

        transactionTypeCode:
          row.transactionTypeCode,

        transactionTypeName:
          row.transactionTypeName,

        transactionCount,

        successful,

        failed,

        successRate:
          transactionCount > 0
            ? this.roundPercentage(
              (successful /
                transactionCount) *
              100,
            )
            : 0,
      };
    });
  }

  private mapRecentTransaction(
    transaction: {
      id: string;
      publicId: string;
      clientId: string;

      client: {
        displayName: string;
        companyName: string;
      };

      clientService: {
        service: {
          code: string;
          name: string;
        };
      };

      provider: {
        code: string;
        name: string;
      } | null;

      currency: {
        code: string;
        symbol: string | null;
      };

      transactionType: {
        code: string;
        name: string;
      };

      status: TransactionStatus;

      reference: string;

      amount: {
        toString(): string;
      };

      createdAt: Date;
    },
  ): PaymentDashboardTransaction {
    return {
      id: transaction.id,

      publicId:
        transaction.publicId,

      clientId:
        transaction.clientId,

      clientName:
        transaction.client.displayName ||
        transaction.client.companyName,

      serviceCode:
        transaction.clientService
          .service.code,

      serviceName:
        transaction.clientService
          .service.name,

      providerCode:
        transaction.provider?.code ??
        null,

      providerName:
        transaction.provider?.name ??
        null,

      currencyCode:
        transaction.currency.code,

      currencySymbol:
        transaction.currency
          .symbol,

      transactionTypeCode:
        transaction.transactionType
          .code,

      transactionTypeName:
        transaction.transactionType
          .name,

      status:
        transaction.status,

      reference:
        transaction.reference,

      amount:
        transaction.amount.toString(),

      createdAt:
        transaction.createdAt.toISOString(),
    };
  }

  private roundPercentage(
    value: number,
  ): number {
    return Math.round(
      value * 100,
    ) / 100;
  }

  private toDateKey(
    value: Date | string,
  ): string {
    const date =
      value instanceof Date
        ? value
        : new Date(value);

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1,
      ).padStart(2, "0"),
      String(
        date.getDate(),
      ).padStart(2, "0"),
    ].join("-");
  }
}