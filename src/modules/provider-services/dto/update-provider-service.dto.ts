import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateProviderServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalServiceCode?: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}