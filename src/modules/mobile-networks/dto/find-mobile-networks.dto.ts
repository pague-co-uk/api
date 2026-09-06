import { ApiPropertyOptional } from "@nestjs/swagger";
import { MobileNetworkStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class FindMobileNetworksDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize?: number;

  @ApiPropertyOptional({ description: "Filter by status.", enum: MobileNetworkStatus })
  @IsOptional()
  @IsEnum(MobileNetworkStatus)
  readonly status?: MobileNetworkStatus;

  @ApiPropertyOptional({ description: "Filter by ISO-3166-1 alpha-2 country code.", example: "GB" })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  readonly countryCode?: string;

  @ApiPropertyOptional({ description: "Search by name, code, or public ID.", example: "Vodafone" })
  @IsOptional()
  @IsString()
  readonly search?: string;
}
