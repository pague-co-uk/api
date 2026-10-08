import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateProviderServiceDto {
  @IsString()
  @MaxLength(50)
  providerCode!: string;

  @IsString()
  @MaxLength(50)
  serviceCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalServiceCode?: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}