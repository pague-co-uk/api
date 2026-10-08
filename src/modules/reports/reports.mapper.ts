import { Injectable } from "@nestjs/common";

import {
  FloatLedgerReportResponseDto,
  MessageReportResponseDto,
  RoutePerformanceReportResponseDto,
  TransactionReportResponseDto,
} from "./dto/report-response.dto.js";

import {
  FloatLedgerReportRow as FloatLedgerReportEntity,
  MessageReportRow as MessageReportEntity,
  RoutePerformanceReportRow as RoutePerformanceReportEntity,
  TransactionReportRow as TransactionReportEntity,
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

  toTransactionResponse(
    transaction: TransactionReportEntity,
  ): TransactionReportResponseDto {
    return {
      publicId: transaction.publicId,
      clientName: transaction.clientName,
      serviceCode: transaction.serviceCode,
      serviceName: transaction.serviceName,
      providerCode: transaction.providerCode,
      providerName: transaction.providerName,
      providerServiceCode:
        transaction.providerServiceCode,
      providerServiceExternalCode:
        transaction.providerServiceExternalCode,
      currencyCode: transaction.currencyCode,
      currencyName: transaction.currencyName,
      currencySymbol: transaction.currencySymbol,
      transactionTypeCode:
        transaction.transactionTypeCode,
      transactionTypeName:
        transaction.transactionTypeName,
      status: transaction.status,
      reference: transaction.reference,
      providerReference:
        transaction.providerReference,
      amount: transaction.amount,
      description: transaction.description,
      processedAt:
        transaction.processedAt?.toISOString() ??
        null,
      createdAt:
        transaction.createdAt.toISOString(),
    };
  }

  toTransactionResponses(
    transactions: readonly TransactionReportEntity[],
  ): TransactionReportResponseDto[] {
    return transactions.map((transaction) =>
      this.toTransactionResponse(transaction),
    );
  }
}