import type { Currency } from "@prisma/client";

import { CurrencyResponseDto } from "../dto/currency-response.dto.js";

export class CurrencyMapper {
  static toResponse(
    currency: Currency,
  ): CurrencyResponseDto {
    return {
      id: currency.id,
      code: currency.code,
      numericCode:
        currency.numericCode,
      name: currency.name,
      symbol: currency.symbol,
      decimalDigits:
        currency.decimalDigits,
      active: currency.active,
      createdAt: currency.createdAt,
      updatedAt: currency.updatedAt,
    };
  }

  static toResponseList(
    currencies: readonly Currency[],
  ): CurrencyResponseDto[] {
    return currencies.map(
      (currency) =>
        this.toResponse(currency),
    );
  }
}