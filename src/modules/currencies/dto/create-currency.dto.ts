import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCurrencyDto {
  @IsString()
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/, {
    message:
      "code must be a 3-letter uppercase currency code",
  })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^[0-9]{3}$/, {
    message:
      "numericCode must be a 3-digit numeric code",
  })
  numericCode?: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  symbol?: string;

  @IsInt()
  @Min(0)
  @Max(8)
  decimalDigits = 2;
}