import { ApiPropertyOptional } from "@nestjs/swagger";
import { RouteStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class FindRoutesDto {
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

  @ApiPropertyOptional({ description: "Filter by client ID.", example: "client-1" })
  @IsOptional()
  @IsString()
  readonly clientId?: string;

  @ApiPropertyOptional({ description: "Filter by mobile network ID.", example: "network-1" })
  @IsOptional()
  @IsString()
  readonly mobileNetworkId?: string;

  @ApiPropertyOptional({ description: "Filter by connector ID.", example: "connector-1" })
  @IsOptional()
  @IsString()
  readonly connectorId?: string;

  @ApiPropertyOptional({ description: "Filter by status.", enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  readonly status?: RouteStatus;

  @ApiPropertyOptional({ description: "Search by public ID, network name, or connector name.", example: "Vodafone" })
  @IsOptional()
  @IsString()
  readonly search?: string;
}
