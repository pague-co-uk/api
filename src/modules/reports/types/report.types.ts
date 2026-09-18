import {
  LedgerReferenceType,
  LedgerTransactionType,
  MessageEncoding,
  MessageRouteAttemptStatus,
  MessageStatus,
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