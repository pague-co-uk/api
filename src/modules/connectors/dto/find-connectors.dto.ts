import { ApiPropertyOptional } from "@nestjs/swagger";
import { ConnectorStatus, ConnectorTransport } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class FindConnectorsDto {
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

  @ApiPropertyOptional({ description: "Filter by status.", enum: ConnectorStatus })
  @IsOptional()
  @IsEnum(ConnectorStatus)
  readonly status?: ConnectorStatus;

  @ApiPropertyOptional({ description: "Filter by transport protocol.", enum: ConnectorTransport })
  @IsOptional()
  @IsEnum(ConnectorTransport)
  readonly transport?: ConnectorTransport;

  @ApiPropertyOptional({ description: "Filter by provider/vendor.", example: "OpenSMPP" })
  @IsOptional()
  @IsString()
  readonly provider?: string;

  @ApiPropertyOptional({ description: "Search by name, code, or public ID.", example: "SMPP" })
  @IsOptional()
  @IsString()
  readonly search?: string;
}
