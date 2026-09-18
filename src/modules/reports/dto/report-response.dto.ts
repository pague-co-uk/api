import {
  LedgerReferenceType,
  LedgerTransactionType,
  MessageEncoding,
  MessageRouteAttemptStatus,
  MessageStatus,
} from "@prisma/client";

export class MessageReportResponseDto {
  readonly publicId!: string;
  readonly destination!: string;
  readonly sender!: string | null;
  readonly encoding!: MessageEncoding;
  readonly segmentCount!: number;
  readonly status!: MessageStatus;
  readonly submittedAt!: string | null;
  readonly createdAt!: string;
}

export class RoutePerformanceReportResponseDto {
  readonly publicId!: string;
  readonly connectorName!: string;
  readonly status!: MessageRouteAttemptStatus;
  readonly attempts!: number;
}

export class FloatLedgerReportResponseDto {
  readonly publicId!: string;
  readonly transactionType!: LedgerTransactionType;
  readonly credits!: number;
  readonly referenceType!: LedgerReferenceType;
  readonly referenceId!: string | null;
  readonly description!: string | null;
  readonly createdAt!: string;
}