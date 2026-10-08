import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdatePaymentProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}