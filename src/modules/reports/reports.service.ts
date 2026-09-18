import {
  Injectable,
} from "@nestjs/common";


import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";
import * as XLSX from "xlsx";
import { ReportsRepository } from "../../repositories/reports.repository.js";
import { FindFloatLedgerReportDto } from "./dto/find-float-ledger-report.dto.js";
import { FindMessageReportDto } from "./dto/find-message-report.dto.js";
import { FindRoutePerformanceReportDto } from "./dto/find-route-performance-report.dto.js";

@Injectable()
export class ReportsService {
  private readonly logger =
    getComponentLogger("ReportsService");

  constructor(
    private readonly reports:
      ReportsRepository,
  ) { }

  // =========================================================================
  // Message report
  // =========================================================================

  async findMessageReport(
    dto: FindMessageReportDto,
  ) {
    return withSpan(
      "ReportsService.findMessageReport",
      async (span) => {
        span.setAttributes({
          ...(dto.clientId
            ? {
              "client.id":
                dto.clientId,
            }
            : {}),

          ...(dto.page !== undefined
            ? {
              "pagination.page":
                dto.page,
            }
            : {}),

          ...(dto.pageSize !== undefined
            ? {
              "pagination.page_size":
                dto.pageSize,
            }
            : {}),
        });

        try {
          const result =
            await this.reports.findMessageReport(
              {
                page:
                  dto.page,

                pageSize:
                  dto.pageSize,

                clientId:
                  dto.clientId,

                search:
                  dto.search,

                destination:
                  dto.destination,

                senderIdId:
                  dto.senderIdId,

                status:
                  dto.status,

                encoding:
                  dto.encoding,

                submittedFrom:
                  this.toDate(
                    dto.submittedFrom,
                  ),

                submittedTo:
                  this.toDate(
                    dto.submittedTo,
                  ),
              },
            );

          span.setAttributes({
            "pagination.total_items":
              result.totalItems,

            "report.row_count":
              result.items.length,
          });

          this.logger.debug(
            {
              clientId:
                dto.clientId,

              page:
                result.page,

              pageSize:
                result.pageSize,

              totalItems:
                result.totalItems,

              count:
                result.items.length,
            },
            "Message report retrieved successfully.",
          );

          return result;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId:
                dto.clientId,

              page:
                dto.page,

              pageSize:
                dto.pageSize,
            },
            "Failed to retrieve message report.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Route performance report
  // =========================================================================

  async findRoutePerformanceReport(
    dto: FindRoutePerformanceReportDto,
  ) {
    return withSpan(
      "ReportsService.findRoutePerformanceReport",
      async (span) => {
        span.setAttributes({
          ...(dto.clientId
            ? {
              "client.id":
                dto.clientId,
            }
            : {}),

          ...(dto.routeId
            ? {
              "route.id":
                dto.routeId,
            }
            : {}),

          ...(dto.connectorId
            ? {
              "connector.id":
                dto.connectorId,
            }
            : {}),

          ...(dto.status
            ? {
              "route_attempt.status":
                dto.status,
            }
            : {}),

          ...(dto.page !== undefined
            ? {
              "pagination.page":
                dto.page,
            }
            : {}),

          ...(dto.pageSize !== undefined
            ? {
              "pagination.page_size":
                dto.pageSize,
            }
            : {}),
        });

        try {
          const result =
            await this.reports.findRoutePerformanceReport(
              {
                page:
                  dto.page,

                pageSize:
                  dto.pageSize,

                clientId:
                  dto.clientId,

                routeId:
                  dto.routeId,

                connectorId:
                  dto.connectorId,

                status:
                  dto.status,

                from:
                  this.toDate(
                    dto.from,
                  ),

                to:
                  this.toDate(
                    dto.to,
                  ),
              },
            );

          span.setAttributes({
            "pagination.total_items":
              result.totalItems,

            "report.row_count":
              result.items.length,
          });

          this.logger.debug(
            {
              clientId:
                dto.clientId,

              routeId:
                dto.routeId,

              connectorId:
                dto.connectorId,

              page:
                result.page,

              pageSize:
                result.pageSize,

              totalItems:
                result.totalItems,

              count:
                result.items.length,
            },
            "Route performance report retrieved successfully.",
          );

          return result;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId:
                dto.clientId,

              routeId:
                dto.routeId,

              connectorId:
                dto.connectorId,

              page:
                dto.page,

              pageSize:
                dto.pageSize,
            },
            "Failed to retrieve route performance report.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Float ledger report
  // =========================================================================

  async findFloatLedgerReport(
    dto: FindFloatLedgerReportDto,
  ) {
    return withSpan(
      "ReportsService.findFloatLedgerReport",
      async (span) => {
        span.setAttributes({
          ...(dto.clientId
            ? {
              "client.id":
                dto.clientId,
            }
            : {}),

          ...(dto.transactionType
            ? {
              "float.transaction_type":
                dto.transactionType,
            }
            : {}),

          ...(dto.referenceType
            ? {
              "float.reference_type":
                dto.referenceType,
            }
            : {}),

          ...(dto.page !== undefined
            ? {
              "pagination.page":
                dto.page,
            }
            : {}),

          ...(dto.pageSize !== undefined
            ? {
              "pagination.page_size":
                dto.pageSize,
            }
            : {}),
        });

        try {
          const result =
            await this.reports.findFloatLedgerReport(
              {
                page:
                  dto.page,

                pageSize:
                  dto.pageSize,

                clientId:
                  dto.clientId,

                transactionType:
                  dto.transactionType,

                referenceType:
                  dto.referenceType,

                createdFrom:
                  this.toDate(
                    dto.from,
                  ),

                createdTo:
                  this.toDate(
                    dto.to,
                  ),
              },
            );

          span.setAttributes({
            "pagination.total_items":
              result.totalItems,

            "report.row_count":
              result.items.length,
          });

          this.logger.debug(
            {
              clientId:
                dto.clientId,

              page:
                result.page,

              pageSize:
                result.pageSize,

              totalItems:
                result.totalItems,

              count:
                result.items.length,
            },
            "Float ledger report retrieved successfully.",
          );

          return result;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId:
                dto.clientId,

              page:
                dto.page,

              pageSize:
                dto.pageSize,
            },
            "Failed to retrieve float ledger report.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // XLSX exports
  // =========================================================================

  async exportMessageReport(
    dto: FindMessageReportDto,
  ): Promise<Buffer> {
    return withSpan(
      "ReportsService.exportMessageReport",
      async () => {
        try {
          const rows =
            await this.reports.findMessageReportForExport({
              clientId:
                dto.clientId,

              search:
                dto.search,

              destination:
                dto.destination,

              senderIdId:
                dto.senderIdId,

              status:
                dto.status,

              encoding:
                dto.encoding,

              submittedFrom:
                this.toDate(
                  dto.submittedFrom,
                ),

              submittedTo:
                this.toDate(
                  dto.submittedTo,
                ),
            });

          const worksheet =
            XLSX.utils.json_to_sheet(
              rows.map((row) => ({
                "Message ID":
                  row.publicId,

                Destination:
                  row.destination,

                "Sender ID":
                  row.sender,

                Encoding:
                  row.encoding,

                Segments:
                  row.segmentCount,

                Status:
                  row.status,

                "Submitted At":
                  row.submittedAt,

                "Created At":
                  row.createdAt,
              })),
            );

          const workbook =
            XLSX.utils.book_new();

          XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Messages",
          );

          return XLSX.write(
            workbook,
            {
              type: "buffer",
              bookType: "xlsx",
            },
          ) as Buffer;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId:
                dto.clientId,
            },
            "Failed to export message report.",
          );

          throw error;
        }
      },
    );
  }

  async exportRoutePerformanceReport(
    dto: FindRoutePerformanceReportDto,
  ): Promise<Buffer> {
    return withSpan(
      "ReportsService.exportRoutePerformanceReport",
      async () => {
        try {
          const rows =
            await this.reports.findRoutePerformanceReportForExport({
              clientId:
                dto.clientId,

              routeId:
                dto.routeId,

              connectorId:
                dto.connectorId,

              status:
                dto.status,

              from:
                this.toDate(
                  dto.from,
                ),

              to:
                this.toDate(
                  dto.to,
                ),
            });

          const worksheet =
            XLSX.utils.json_to_sheet(
              rows.map((row) => ({
                "Route ID":
                  row.publicId,

                Connector:
                  row.connectorName,

                Status:
                  row.status,

                Attempts:
                  row.attempts,
              })),
            );

          const workbook =
            XLSX.utils.book_new();

          XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Route Performance",
          );

          return XLSX.write(
            workbook,
            {
              type: "buffer",
              bookType: "xlsx",
            },
          ) as Buffer;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId:
                dto.clientId,
            },
            "Failed to export route performance report.",
          );

          throw error;
        }
      },
    );
  }

  async exportFloatLedgerReport(
    dto: FindFloatLedgerReportDto,
  ): Promise<Buffer> {
    return withSpan(
      "ReportsService.exportFloatLedgerReport",
      async () => {
        try {
          const rows =
            await this.reports.findFloatLedgerReportForExport({
              clientId:
                dto.clientId,

              transactionType:
                dto.transactionType,

              referenceType:
                dto.referenceType,

              createdFrom:
                this.toDate(
                  dto.from,
                ),

              createdTo:
                this.toDate(
                  dto.to,
                ),
            });

          const worksheet =
            XLSX.utils.json_to_sheet(
              rows.map((row) => ({
                "Transaction ID":
                  row.publicId,

                "Transaction Type":
                  row.transactionType,

                Credits:
                  row.credits,

                "Reference Type":
                  row.referenceType,

                "Reference ID":
                  row.referenceId,

                Description:
                  row.description,

                "Created At":
                  row.createdAt,
              })),
            );

          const workbook =
            XLSX.utils.book_new();

          XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Float Ledger",
          );

          return XLSX.write(
            workbook,
            {
              type: "buffer",
              bookType: "xlsx",
            },
          ) as Buffer;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId:
                dto.clientId,
            },
            "Failed to export float ledger report.",
          );

          throw error;
        }
      },
    );
  }
  // =========================================================================
  // Helpers
  // =========================================================================

  private toDate(
    value?: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    return new Date(value);
  }
}