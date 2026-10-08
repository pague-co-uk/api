export class CountryCurrencyResponseDto {
  countryCode!: string;
  countryName!: string;

  currencyId!: string;
  currencyCode!: string;
  currencyName!: string;

  isPrimary!: boolean;
  isOfficial!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}