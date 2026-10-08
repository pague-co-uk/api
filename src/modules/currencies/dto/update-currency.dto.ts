import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  symbol?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  decimalDigits?: number;
}