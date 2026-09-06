import { Type } from "class-transformer";

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  LedgerReferenceType,
  LedgerTransactionType,
} from "@prisma/client";

export class FindPlatformFloatLedgerDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(LedgerTransactionType)
  transactionType?: LedgerTransactionType;

  @IsOptional()
  @IsEnum(LedgerReferenceType)
  referenceType?: LedgerReferenceType;

  @IsOptional()
  @IsString()
  search?: string;
}