import type {
  Country,
  CountryCurrency,
  Currency,
} from "@prisma/client";

import { CountryCurrencyResponseDto } from "../dto/country-currency-response.dto.js";

type CountryCurrencyWithRelations =
  CountryCurrency & {
    country: Country;
    currency: Currency;
  };

export class CountryCurrencyMapper {
  static toResponse(
    countryCurrency: CountryCurrencyWithRelations,
  ): CountryCurrencyResponseDto {
    return {
      countryCode:
        countryCurrency.country.code,

      countryName:
        countryCurrency.country.name,

      currencyId:
        countryCurrency.currencyId,

      currencyCode:
        countryCurrency.currency.code,

      currencyName:
        countryCurrency.currency.name,

      isPrimary:
        countryCurrency.isPrimary,

      isOfficial:
        countryCurrency.isOfficial,

      createdAt:
        countryCurrency.createdAt,

      updatedAt:
        countryCurrency.updatedAt,
    };
  }

  static toResponseList(
    countryCurrencies: readonly CountryCurrencyWithRelations[],
  ): CountryCurrencyResponseDto[] {
    return countryCurrencies.map(
      (countryCurrency) =>
        this.toResponse(countryCurrency),
    );
  }
}