import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { Type } from "class-transformer";

import { PaymentProviderStatus } from "@prisma/client";

export class FindPaymentProvidersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PaymentProviderStatus)
  status?: PaymentProviderStatus;

  @IsOptional()
  @IsString()
  sort?: string;
}