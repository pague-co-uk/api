import {
  Controller,
  Get,
  Query,
  Res,
} from "@nestjs/common";

import type { Response } from "express";

import { Authorize } from "../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../common/authorization/permissions/permissions.registry.js";
import { PaginatedResponse } from "../../common/interfaces/paginated.response.js";

import {
  FindFloatLedgerReportDto,
} from "./dto/find-float-ledger-report.dto.js";
import {
  FindMessageReportDto,
} from "./dto/find-message-report.dto.js";
import {
  FindRoutePerformanceReportDto,
} from "./dto/find-route-performance-report.dto.js";

import {
  FloatLedgerReportResponseDto,
  MessageReportResponseDto,
  RoutePerformanceReportResponseDto,
} from "./dto/report-response.dto.js";

import { ReportsMapper } from "./reports.mapper.js";
import { ReportsService } from "./reports.service.js";

@Controller("reports")
export class PlatformReportsController {
  constructor(
    private readonly reports:
      ReportsService,

    private readonly mapper:
      ReportsMapper,
  ) { }

  // =========================================================================
  // Messages
  // =========================================================================

  @Get("messages")
  @Authorize(
    Permissions.REPORTS_READ,
  )
  async findMessageReport(
    @Query()
    dto: FindMessageReportDto,
  ): Promise<
    PaginatedResponse<MessageReportResponseDto>
  > {
    const page =
      await this.reports.findMessageReport({
        ...dto,

        clientId:
          dto.clientId,
      });

    return new PaginatedResponse(
      this.mapper.toMessageResponses(
        page.items,
      ),
      page,
    );
  }

  @Get("messages/export")
  @Authorize(
    Permissions.REPORTS_EXPORT,
  )
  async exportMessageReport(
    @Query()
    dto: FindMessageReportDto,

    @Res()
    response: Response,
  ) {
    const workbook =
      await this.reports.exportMessageReport({
        ...dto,

        clientId:
          dto.clientId,
      });

    response
      .status(200)
      .set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          'attachment; filename="message-report.xlsx"',

        "Content-Length":
          workbook.length,
      })
      .send(workbook);
  }

  // =========================================================================
  // Route performance
  // =========================================================================

  @Get("routes")
  @Authorize(
    Permissions.REPORTS_READ,
  )
  async findRoutePerformanceReport(
    @Query()
    dto: FindRoutePerformanceReportDto,
  ): Promise<
    PaginatedResponse<RoutePerformanceReportResponseDto>
  > {
    const page =
      await this.reports.findRoutePerformanceReport({
        ...dto,

        clientId:
          dto.clientId,
      });

    return new PaginatedResponse(
      this.mapper.toRoutePerformanceResponses(
        page.items,
      ),
      page,
    );
  }

  @Get("routes/export")
  @Authorize(
    Permissions.REPORTS_EXPORT,
  )
  async exportRoutePerformanceReport(
    @Query()
    dto: FindRoutePerformanceReportDto,

    @Res()
    response: Response,
  ) {
    const workbook =
      await this.reports.exportRoutePerformanceReport({
        ...dto,

        clientId:
          dto.clientId,
      });

    response
      .status(200)
      .set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          'attachment; filename="route-performance-report.xlsx"',

        "Content-Length":
          workbook.length,
      })
      .send(workbook);
  }

  // =========================================================================
  // Float ledger
  // =========================================================================

  @Get("float")
  @Authorize(
    Permissions.REPORTS_READ,
  )
  async findFloatLedgerReport(
    @Query()
    dto: FindFloatLedgerReportDto,
  ): Promise<
    PaginatedResponse<FloatLedgerReportResponseDto>
  > {
    const page =
      await this.reports.findFloatLedgerReport({
        ...dto,

        clientId:
          dto.clientId,
      });

    return new PaginatedResponse(
      this.mapper.toFloatLedgerResponses(
        page.items,
      ),
      page,
    );
  }

  @Get("float/export")
  @Authorize(
    Permissions.REPORTS_EXPORT,
  )
  async exportFloatLedgerReport(
    @Query()
    dto: FindFloatLedgerReportDto,

    @Res()
    response: Response,
  ) {
    const workbook =
      await this.reports.exportFloatLedgerReport({
        ...dto,

        clientId:
          dto.clientId,
      });

    response
      .status(200)
      .set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          'attachment; filename="float-ledger-report.xlsx"',

        "Content-Length":
          workbook.length,
      })
      .send(workbook);
  }
}