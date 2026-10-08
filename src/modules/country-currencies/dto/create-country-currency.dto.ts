import {
  IsBoolean,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateCountryCurrencyDto {
  @IsString()
  @MaxLength(36)
  countryCode!: string;

  @IsString()
  @MaxLength(36)
  currencyId!: string;

  @IsBoolean()
  isPrimary = false;

  @IsBoolean()
  isOfficial = true;
}