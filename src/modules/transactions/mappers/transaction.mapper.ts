import { TransactionResponseDto } from "../dto/transaction-response.dto.js";
import type { TransactionWithRelations } from "../repositories/transactions.repository.js";

export class TransactionMapper {
  static toResponse(
    transaction: TransactionWithRelations,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      publicId: transaction.publicId,

      clientId: transaction.clientId,
      clientName: transaction.client.displayName,

      clientServiceId: transaction.clientServiceId,
      serviceCode: transaction.clientService.service.code,
      serviceName: transaction.clientService.service.name,

      providerId: transaction.providerId,
      providerCode: transaction.provider?.code ?? null,
      providerName: transaction.provider?.name ?? null,
      providerStatus: transaction.provider?.status ?? null,

      providerServiceId: transaction.providerServiceId,
      providerServiceCode:
        transaction.providerService?.service.code ?? null,
      providerServiceExternalCode:
        transaction.providerService?.externalServiceCode ?? null,

      currencyId: transaction.currencyId,
      currencyCode: transaction.currency.code,
      currencyName: transaction.currency.name,
      currencySymbol: transaction.currency.symbol,

      transactionTypeId: transaction.transactionTypeId,
      transactionTypeCode: transaction.transactionType.code,
      transactionTypeName: transaction.transactionType.name,

      status: transaction.status,

      reference: transaction.reference,
      providerReference: transaction.providerReference,

      amount: transaction.amount.toString(),

      description: transaction.description,

      metadata:
        transaction.metadata as Record<string, unknown> | null,

      providerResponse:
        transaction.providerResponse as Record<string, unknown> | null,

      processedAt: transaction.processedAt,

      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  static toResponseList(
    transactions: readonly TransactionWithRelations[],
  ): TransactionResponseDto[] {
    return transactions.map((transaction) =>
      this.toResponse(transaction),
    );
  }
}