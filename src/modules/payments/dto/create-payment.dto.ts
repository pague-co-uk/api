import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  serviceCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  currency!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  transactionType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsObject()
  data!: Record<string, unknown>;
}