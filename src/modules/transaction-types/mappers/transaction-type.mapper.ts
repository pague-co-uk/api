import { TransactionType } from "@prisma/client";

import { TransactionTypeResponseDto } from "../dto/transaction-type-response.dto.js";

export class TransactionTypeMapper {
  static toResponse(
    transactionType: TransactionType,
  ): TransactionTypeResponseDto {
    return {
      id: transactionType.id,
      code: transactionType.code,
      name: transactionType.name,
      description:
        transactionType.description,
      active: transactionType.active,
      createdAt:
        transactionType.createdAt,
      updatedAt:
        transactionType.updatedAt,
    };
  }

  static toResponseList(
    transactionTypes: readonly TransactionType[],
  ): TransactionTypeResponseDto[] {
    return transactionTypes.map(
      (transactionType) =>
        this.toResponse(transactionType),
    );
  }
}