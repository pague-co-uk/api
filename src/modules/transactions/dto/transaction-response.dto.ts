import {
  PaymentProviderStatus,
  TransactionStatus,
} from "@prisma/client";

export class TransactionResponseDto {
  id!: string;
  publicId!: string;

  clientId!: string;
  clientName!: string;

  clientServiceId!: string;
  serviceCode!: string;
  serviceName!: string;

  providerId!: string | null;
  providerCode!: string | null;
  providerName!: string | null;
  providerStatus!: PaymentProviderStatus | null;

  providerServiceId!: string | null;
  providerServiceCode!: string | null;
  providerServiceExternalCode!: string | null;

  currencyId!: string;
  currencyCode!: string;
  currencyName!: string;
  currencySymbol!: string | null;

  transactionTypeId!: string;
  transactionTypeCode!: string;
  transactionTypeName!: string;

  status!: TransactionStatus;

  reference!: string;
  providerReference!: string | null;

  amount!: string;

  description!: string | null;

  metadata!: Record<string, unknown> | null;
  providerResponse!: Record<string, unknown> | null;

  processedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}