import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  ServiceCategory,
} from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'code must contain only uppercase letters, numbers, and underscores',
  })
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}