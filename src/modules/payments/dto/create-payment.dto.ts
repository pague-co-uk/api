import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreatePaymentDto {
  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  serviceCode!: string;

  // Optional at the DTO boundary only for the legacy data-alias transition.
  // The normalizer requires both fields before a transaction can be created.
  @IsOptional()
  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @IsOptional()
  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @MaxLength(2)
  country?: string;

  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reference!: string;

  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  currency!: string;

  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @IsNotEmpty()
  amount!: string;

  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  transactionType!: string;

  @IsOptional()
  @Transform(({ obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() : obj[key],
  )
  @IsString()
  @MaxLength(255)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  data?: Record<string, unknown>;
}
