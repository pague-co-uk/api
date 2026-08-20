import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

import { LedgerReferenceType } from "@prisma/client";

export class DebitFloatDto {
  @IsInt()
  @Min(1)
  credits!: number;

  @IsEnum(LedgerReferenceType)
  referenceType!: LedgerReferenceType;

  @IsString()
  referenceId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}