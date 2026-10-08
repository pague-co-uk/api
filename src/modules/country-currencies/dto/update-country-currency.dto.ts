import {
  IsBoolean,
  IsOptional,
} from "class-validator";

export class UpdateCountryCurrencyDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;
}