import { Injectable } from "@nestjs/common";

import {
  FloatLedgerReportResponseDto,
  MessageReportResponseDto,
  RoutePerformanceReportResponseDto,
} from "./dto/report-response.dto.js";

import {
  FloatLedgerReportRow as FloatLedgerReportEntity,
  MessageReportRow as MessageReportEntity,
  RoutePerformanceReportRow as RoutePerformanceReportEntity,
} from "./types/report.types.js";

@Injectable()
export class ReportsMapper {
  toMessageResponse(
    message: MessageReportEntity,
  ): MessageReportResponseDto {
    return {
      publicId: message.publicId,
      destination: message.destination,
      sender: message.sender,
      encoding: message.encoding,
      segmentCount: message.segmentCount,
      status: message.status,
      submittedAt:
        message.submittedAt?.toISOString() ?? null,
      createdAt:
        message.createdAt.toISOString(),
    };
  }

  toMessageResponses(
    messages: readonly MessageReportEntity[],
  ): MessageReportResponseDto[] {
    return messages.map((message) =>
      this.toMessageResponse(message),
    );
  }

  toRoutePerformanceResponse(
    route: RoutePerformanceReportEntity,
  ): RoutePerformanceReportResponseDto {
    return {
      publicId: route.publicId,
      connectorName: route.connectorName,
      status: route.status,
      attempts: route.attempts,
    };
  }

  toRoutePerformanceResponses(
    routes: readonly RoutePerformanceReportEntity[],
  ): RoutePerformanceReportResponseDto[] {
    return routes.map((route) =>
      this.toRoutePerformanceResponse(route),
    );
  }

  toFloatLedgerResponse(
    entry: FloatLedgerReportEntity,
  ): FloatLedgerReportResponseDto {
    return {
      publicId: entry.publicId,
      transactionType: entry.transactionType,
      credits: entry.credits,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      description: entry.description,
      createdAt:
        entry.createdAt.toISOString(),
    };
  }

  toFloatLedgerResponses(
    entries: readonly FloatLedgerReportEntity[],
  ): FloatLedgerReportResponseDto[] {
    return entries.map((entry) =>
      this.toFloatLedgerResponse(entry),
    );
  }
}