import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  LedgerReferenceType,
  LedgerTransactionType,
} from "@prisma/client";

export class FindFloatLedgerReportDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(LedgerTransactionType)
  transactionType?: LedgerTransactionType;

  @IsOptional()
  @IsEnum(LedgerReferenceType)
  referenceType?: LedgerReferenceType;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}