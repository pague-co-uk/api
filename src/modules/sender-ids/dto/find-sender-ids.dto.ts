import { ApiPropertyOptional } from "@nestjs/swagger";
import { SenderIdStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class FindSenderIdsDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize?: number;

  @ApiPropertyOptional({
    description: "Filter Sender IDs by client.",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  readonly clientId?: string;

  @ApiPropertyOptional({
    description: "Filter Sender IDs by status.",
    enum: SenderIdStatus,
  })
  @IsOptional()
  @IsEnum(SenderIdStatus)
  readonly status?: SenderIdStatus;

  @ApiPropertyOptional({
    description: "Filter by exact Sender ID value.",
    example: "VIBRANT",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly sender?: string;

  @ApiPropertyOptional({
    description:
      "Search Sender ID values and public identifiers.",
    example: "VIB",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({
    description:
      "Filter by whether the Sender ID is the client's default.",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly isDefault?: boolean;
}