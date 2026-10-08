import {
  LedgerReferenceType,
  LedgerTransactionType,
  MessageEncoding,
  MessageRouteAttemptStatus,
  MessageStatus,
  TransactionStatus,
} from "@prisma/client";

export interface MessageReportRow {
  readonly publicId: string;
  readonly destination: string;
  readonly sender: string | null;
  readonly encoding: MessageEncoding;
  readonly segmentCount: number;
  readonly status: MessageStatus;
  readonly submittedAt: Date | null;
  readonly createdAt: Date;
}

export interface RoutePerformanceReportRow {
  readonly publicId: string;
  readonly connectorName: string;
  readonly status: MessageRouteAttemptStatus;
  readonly attempts: number;
}

export interface FloatLedgerReportRow {
  readonly publicId: string;
  readonly transactionType: LedgerTransactionType;
  readonly credits: number;
  readonly referenceType: LedgerReferenceType;
  readonly referenceId: string | null;
  readonly description: string | null;
  readonly createdAt: Date;
}

export interface TransactionReportRow {
  readonly publicId: string;
  readonly clientName: string;
  readonly serviceCode: string;
  readonly serviceName: string;
  readonly providerCode: string | null;
  readonly providerName: string | null;
  readonly providerServiceCode: string | null;
  readonly providerServiceExternalCode: string | null;
  readonly currencyCode: string;
  readonly currencyName: string;
  readonly currencySymbol: string | null;
  readonly transactionTypeCode: string;
  readonly transactionTypeName: string;
  readonly status: TransactionStatus;
  readonly reference: string;
  readonly providerReference: string | null;
  readonly amount: string;
  readonly description: string | null;
  readonly processedAt: Date | null;
  readonly createdAt: Date;
}